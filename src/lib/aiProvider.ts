import { AI_PROVIDERS, DEFAULT_OCR_MODEL, OCR_MODELS } from './constants'
import type { AIProvider } from './constants'

const PROVIDER_URLS: Record<AIProvider, string> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
}

// Free-tier requests can hang or get rate-limited — see TODO.md §1.2.
const REQUEST_TIMEOUT_MS = 30_000
const RETRYABLE_STATUSES = new Set([429, 503])
const DEFAULT_RETRY_DELAY_MS = 2_000
const MAX_RETRY_DELAY_MS = 10_000

const LS_ACTIVE_PROVIDER = 'fintrack_ai_provider'

// Storage keys deliberately match the pre-multi-provider names for Groq
// ('groq_api_key' / 'groq_model') so existing users' saved key and model
// carry over with no migration — Groq stays the default provider.
function keyStorageKey(provider: AIProvider): string {
  return provider === 'groq' ? 'groq_api_key' : 'openrouter_api_key'
}
function modelStorageKey(provider: AIProvider): string {
  return provider === 'groq' ? 'groq_model' : 'openrouter_model'
}
function providerConfig(provider: AIProvider) {
  return AI_PROVIDERS.find((p) => p.id === provider)!
}
function providerLabel(provider: AIProvider): string {
  return providerConfig(provider).label
}

export function getActiveProvider(): AIProvider {
  return localStorage.getItem(LS_ACTIVE_PROVIDER) === 'openrouter' ? 'openrouter' : 'groq'
}
export function setActiveProvider(provider: AIProvider): void {
  localStorage.setItem(LS_ACTIVE_PROVIDER, provider)
}

export function getProviderKey(provider: AIProvider = getActiveProvider()): string | null {
  return localStorage.getItem(keyStorageKey(provider))?.trim() || null
}
export function setProviderKey(provider: AIProvider, key: string): void {
  localStorage.setItem(keyStorageKey(provider), key.trim())
}

export function isAIConfigured(): boolean {
  return !!getProviderKey()
}

// Falls back to the provider's default if the stored id isn't in its model
// list (e.g. this app shipped a new list after the stored model was itself
// decommissioned) — see TODO.md §1.1.
export function getProviderModel(provider: AIProvider = getActiveProvider()): string {
  const config = providerConfig(provider)
  const stored = localStorage.getItem(modelStorageKey(provider))?.trim()
  if (stored && config.models.some((m) => m.id === stored)) return stored
  return config.defaultModel
}
export function setProviderModel(provider: AIProvider, modelId: string): void {
  localStorage.setItem(modelStorageKey(provider), modelId)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Neither provider's exact error shape for a retired model is pinned down
// here (no live verification from this environment) — matched defensively
// against a 404 and against the error body's code/message containing any of
// the phrasings Groq/OpenRouter have used for "this model doesn't exist".
function isModelUnavailable(status: number, body: unknown): boolean {
  if (status === 404) return true
  const error = (body as { error?: { message?: string; code?: string } } | undefined)?.error
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase()
  return (
    text.includes('decommission')
    || text.includes('model_not_found')
    || text.includes('does not exist')
    || text.includes('not supported')
    || text.includes('no endpoints found')
  )
}

function buildHeaders(provider: AIProvider, key: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
  if (provider === 'openrouter') {
    // OpenRouter's own docs ask for these on client-side requests — used
    // for their leaderboard/rankings, harmless if omitted, so failures here
    // are never treated as fatal.
    headers['HTTP-Referer'] = window.location.origin
    headers['X-Title'] = 'FinTrack'
  }
  return headers
}

async function postChat(provider: AIProvider, key: string, body: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(PROVIDER_URLS[provider], {
      method: 'POST',
      headers: buildHeaders(provider, key),
      signal: controller.signal,
      body: JSON.stringify(body),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('The AI took too long to respond (30s timeout). Try again.')
    }
    throw new Error(`Could not reach ${providerLabel(provider)} — check your internet connection and try again.`)
  } finally {
    clearTimeout(timer)
  }
}

async function throwForResponse(provider: AIProvider, res: Response): Promise<never> {
  const body = await res.json().catch(() => undefined)
  if (isModelUnavailable(res.status, body)) {
    throw new Error('This AI model is no longer available — pick a different one in Settings → AI Insights.')
  }
  if (res.status === 429) {
    throw new Error(`${providerLabel(provider)} rate limit hit — try again in a minute.`)
  }
  if (res.status === 503) {
    throw new Error(`${providerLabel(provider)} is temporarily overloaded — try again shortly.`)
  }
  const message = (body as { error?: { message?: string } } | undefined)?.error?.message
  throw new Error(message ?? `${providerLabel(provider)} error (HTTP ${res.status})`)
}

interface AIRequestOpts {
  maxTokens?: number
  temperature?: number
  provider?: AIProvider
}

export async function aiChat(system: string, user: string, opts?: AIRequestOpts): Promise<string> {
  const provider = opts?.provider ?? getActiveProvider()
  const key = getProviderKey(provider)
  if (!key) throw new Error(`No ${providerLabel(provider)} API key. Go to Settings → AI Insights → add your ${providerLabel(provider)} key.`)
  const model = getProviderModel(provider)
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: opts?.temperature ?? 0.35,
    max_tokens: opts?.maxTokens ?? 700,
  }

  let res = await postChat(provider, key, body)

  // One retry on rate-limit / transient overload, honoring Retry-After when sent.
  if (RETRYABLE_STATUSES.has(res.status)) {
    const retryAfterHeader = res.headers.get('retry-after')
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN
    const delay = Number.isFinite(retryAfterMs)
      ? Math.min(retryAfterMs, MAX_RETRY_DELAY_MS)
      : DEFAULT_RETRY_DELAY_MS
    await sleep(delay)
    res = await postChat(provider, key, body)
  }

  if (!res.ok) await throwForResponse(provider, res)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? 'No response received.'
}

// Convenience: single-turn with no system prompt
export async function aiAsk(prompt: string, opts?: { maxTokens?: number }): Promise<string> {
  return aiChat('You are a concise personal finance assistant. Be specific and practical.', prompt, opts)
}

// Used by Settings → AI Insights' "Test connection" button — a minimal,
// cheap request that surfaces a real error (bad key, wrong model, network)
// without waiting for the user to trip over it in a real feature later.
export async function testProviderConnection(provider: AIProvider): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await aiChat('Reply with exactly one word.', 'Say OK.', { provider, maxTokens: 5, temperature: 0 })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Connection failed' }
  }
}

// ── Receipt OCR (vision) — OpenRouter only, see TODO.md §5.4 ────────────────
// Groq's free tier is text-only, so scanning always goes through OpenRouter
// regardless of which provider is set as the active text-chat provider above.

const LS_OCR_MODEL = 'fintrack_ocr_model'

export function getOcrModel(): string {
  const stored = localStorage.getItem(LS_OCR_MODEL)?.trim()
  if (stored && OCR_MODELS.some((m) => m.id === stored)) return stored
  return DEFAULT_OCR_MODEL
}
export function setOcrModel(modelId: string): void {
  localStorage.setItem(LS_OCR_MODEL, modelId)
}
export function isOcrConfigured(): boolean {
  return !!getProviderKey('openrouter')
}

// imageDataUrl: a data: URL (e.g. from FileReader.readAsDataURL) — the image
// is sent directly to OpenRouter and never uploaded/stored anywhere else.
export async function aiVisionChat(system: string, user: string, imageDataUrl: string): Promise<string> {
  const provider: AIProvider = 'openrouter'
  const key = getProviderKey(provider)
  if (!key) throw new Error('No OpenRouter API key. Add one in Settings → AI Insights to use receipt scanning.')
  const model = getOcrModel()
  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: user },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 500,
  }
  const res = await postChat(provider, key, body)
  if (!res.ok) await throwForResponse(provider, res)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}
