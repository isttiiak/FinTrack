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
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? 'No response received.'
}

// Convenience: single-turn with no system prompt
export async function groqAsk(prompt: string, opts?: { maxTokens?: number }): Promise<string> {
  return groqChat('You are a concise personal finance assistant. Be specific and practical.', prompt, opts)
}
