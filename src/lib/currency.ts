import { round2 } from './utils'

const FX_TTL_MS = 24 * 60 * 60 * 1000 // 24h — daily rates, not real-time
const FX_URL = (base: string) => `https://open.er-api.com/v6/latest/${base}`

interface FxCache {
  rates: Record<string, number>
  fetchedAt: number
}

function cacheKey(base: string) {
  return `fintrack_fx_${base}`
}

function readCache(base: string): FxCache | null {
  try {
    const raw = localStorage.getItem(cacheKey(base))
    if (!raw) return null
    const parsed = JSON.parse(raw) as FxCache
    if (Date.now() - parsed.fetchedAt > FX_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(base: string, rates: Record<string, number>) {
  localStorage.setItem(cacheKey(base), JSON.stringify({ rates, fetchedAt: Date.now() } satisfies FxCache))
}

// Fetches daily exchange rates for `base` (e.g. 'BDT'), cached in localStorage
// for 24h. open.er-api.com is free, keyless, and — unlike Frankfurter/ECB —
// includes BDT, which this app defaults to.
export async function getExchangeRates(base: string): Promise<Record<string, number>> {
  const cached = readCache(base)
  if (cached) return cached.rates

  const res = await fetch(FX_URL(base))
  if (!res.ok) throw new Error(`Exchange rate lookup failed (HTTP ${res.status})`)
  const data = await res.json()
  if (data.result !== 'success' || !data.rates) throw new Error('Exchange rate lookup failed')

  writeCache(base, data.rates)
  return data.rates as Record<string, number>
}

// Converts an amount from `from` to `to` using a rate table keyed by `from`
// (i.e. the shape returned by getExchangeRates(from)).
export function convertAmount(amount: number, from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return amount
  const rate = rates[to]
  if (!rate) throw new Error(`No exchange rate available for ${to}`)
  return round2(amount * rate)
}
