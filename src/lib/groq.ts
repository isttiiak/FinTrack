import { GROQ_MODELS, DEFAULT_GROQ_MODEL } from './constants'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Free-tier requests can hang or get rate-limited — see TODO.md §1.2.
const REQUEST_TIMEOUT_MS = 30_000
const RETRYABLE_STATUSES = new Set([429, 503])
const DEFAULT_RETRY_DELAY_MS = 2_000
const MAX_RETRY_DELAY_MS = 10_000

export function getGroqKey(): string | null {
  return localStorage.getItem('groq_api_key')?.trim() || null
}

export function isGroqConfigured(): boolean {
  return !!getGroqKey()
}

// The active model is user-configurable (Settings → AI Insights), not hardcoded —
// see TODO.md §1.1. Falls back to the default if the stored id isn't in GROQ_MODELS
// (e.g. this app shipped a new list after the stored model was itself decommissioned).
export function getGroqModel(): string {
  const stored = localStorage.getItem('groq_model')?.trim()
  if (stored && GROQ_MODELS.some((m) => m.id === stored)) return stored
  return DEFAULT_GROQ_MODEL
}

export function setGroqModel(modelId: string): void {
  localStorage.setItem('groq_model', modelId)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Groq's exact error shape for a retired model isn't pinned down here (no live
// verification from this environment) — matched defensively against a 404 and
// against the error body's code/message containing any of the phrasings Groq
// has used for "this model doesn't exist/was decommissioned".
function isModelUnavailable(status: number, body: unknown): boolean {
  if (status === 404) return true
  const error = (body as { error?: { message?: string; code?: string } } | undefined)?.error
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase()
  return (
    text.includes('decommission')
    || text.includes('model_not_found')
    || text.includes('does not exist')
    || text.includes('not supported')
  )
}

interface GroqRequestOpts {
  maxTokens?: number
  temperature?: number
}

async function requestOnce(
  key: string,
  model: string,
  system: string,
  user: string,
  opts?: GroqRequestOpts,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: opts?.temperature ?? 0.35,
        max_tokens: opts?.maxTokens ?? 700,
      }),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('The AI took too long to respond (30s timeout). Try again.')
    }
    throw new Error('Could not reach Groq — check your internet connection and try again.')
  } finally {
    clearTimeout(timer)
  }
}

// Extracts the answer text from a successful (res.ok) response. Returns
// null instead of throwing when the model produced no usable content, so
// the caller can decide whether to retry before giving up.
async function extractContent(res: Response): Promise<{ content: string } | { emptyReason: 'length' | 'other' }> {
  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content?.trim() ?? ''
  if (content) return { content }
  const finishReason = data.choices?.[0]?.finish_reason
  return { emptyReason: finishReason === 'length' ? 'length' : 'other' }
}

export async function groqChat(
  system: string,
  user: string,
  opts?: GroqRequestOpts,
): Promise<string> {
  const key = getGroqKey()
  if (!key) throw new Error('No Groq API key. Go to Settings → AI Insights → add your free Groq key.')
  const model = getGroqModel()

  let res = await requestOnce(key, model, system, user, opts)

  // One retry on rate-limit / transient overload, honoring Retry-After when Groq sends it.
  if (RETRYABLE_STATUSES.has(res.status)) {
    const retryAfterHeader = res.headers.get('retry-after')
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN
    const delay = Number.isFinite(retryAfterMs)
      ? Math.min(retryAfterMs, MAX_RETRY_DELAY_MS)
      : DEFAULT_RETRY_DELAY_MS
    await sleep(delay)
    res = await requestOnce(key, model, system, user, opts)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => undefined)
    if (isModelUnavailable(res.status, body)) {
      throw new Error('This AI model is no longer available — pick a different one in Settings → AI Insights.')
    }
    if (res.status === 429) {
      throw new Error('Free-tier rate limit hit — try again in a minute.')
    }
    if (res.status === 503) {
      throw new Error('Groq is temporarily overloaded — try again shortly.')
    }
    const message = (body as { error?: { message?: string } } | undefined)?.error?.message
    throw new Error(message ?? `Groq error (HTTP ${res.status})`)
  }

  let result = await extractContent(res)
  if ('content' in result) return result.content

  // GPT-OSS's reasoning models (the current default/only Groq models — see
  // TODO.md §1.1) put hidden chain-of-thought in a separate `reasoning`
  // field before writing the actual answer into `content`. On a
  // token-hungry prompt they can burn the entire max_tokens budget on that
  // reasoning and never get to write anything into `content` — confirmed
  // live (Goal Planner, 2026-09-04): HTTP 200, `content: ""`,
  // finish_reason "length". It's not consistently reproducible (the same
  // prompt sometimes answers fine, sometimes doesn't — also confirmed
  // live), so one retry with extra token headroom clears it more often
  // than not, before bothering the user with an error. Only retried for
  // the "ran out of room" case — an actually-empty answer with a normal
  // finish_reason is a different, probably-not-transient problem.
  if (result.emptyReason === 'length') {
    res = await requestOnce(key, model, system, user, { ...opts, maxTokens: (opts?.maxTokens ?? 700) + 400 })
    if (res.ok) {
      result = await extractContent(res)
      if ('content' in result) return result.content
    }
  }

  // Previously `?? 'No response received.'` only caught null/undefined, so
  // an empty string silently became the "successful" result — the Run
  // button would just go back to idle with no error and no result, the
  // worst possible outcome. Thrown as a real error instead so it surfaces
  // through the same error UI every feature already has.
  throw new Error(
    result.emptyReason === 'length'
      ? 'The AI ran out of room "thinking" before finishing an answer, even after a retry — try again, or switch to a smaller/simpler question.'
      : 'No response received from Groq — try again.',
  )
}

// Convenience: single-turn with no system prompt
export async function groqAsk(prompt: string, opts?: { maxTokens?: number }): Promise<string> {
  return groqChat('You are a concise personal finance assistant. Be specific and practical.', prompt, opts)
}
