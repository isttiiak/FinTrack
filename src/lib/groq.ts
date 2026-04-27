const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'

export function getGroqKey(): string | null {
  return localStorage.getItem('groq_api_key')?.trim() || null
}

export function isGroqConfigured(): boolean {
  return !!getGroqKey()
}

export async function groqChat(
  system: string,
  user: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const key = getGroqKey()
  if (!key) throw new Error('No Groq API key. Go to Settings → AI Insights → add your free Groq key.')

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      temperature: opts?.temperature ?? 0.35,
      max_tokens:  opts?.maxTokens  ?? 700,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `Groq error (HTTP ${res.status})`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? 'No response received.'
}

// Convenience: single-turn with no system prompt
export async function groqAsk(prompt: string, opts?: { maxTokens?: number }): Promise<string> {
  return groqChat('You are a concise personal finance assistant. Be specific and practical.', prompt, opts)
}
