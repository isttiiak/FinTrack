import { round2 } from './utils'

export interface ReceiptExtraction {
  merchant: string | null
  amount: number | null
  date: string | null // YYYY-MM-DD
  categoryGuess: string | null
  lineItems: string[]
}

export const RECEIPT_OCR_SYSTEM_PROMPT = `You are a receipt-scanning assistant for a personal finance app. Look at the receipt image and extract structured data. Respond with ONLY a single JSON object, no markdown fences, no commentary, in exactly this shape:
{"merchant": string|null, "amount": number|null, "date": "YYYY-MM-DD"|null, "categoryGuess": string|null, "lineItems": string[]}
Rules:
- "amount" is the final total paid, as a plain number (no currency symbol, no commas).
- "date" is the transaction date printed on the receipt, in YYYY-MM-DD. If no year is printed, assume the current year.
- "categoryGuess" is a short, general spending category (e.g. "Food", "Transport", "Shopping"), not a rephrasing of the merchant name.
- "lineItems" is a short list of purchased item descriptions — empty array if unreadable.
- If a field can't be read from the image, use null (or [] for lineItems) — never guess a value you can't actually see.`

export function buildReceiptUserPrompt(todayISO: string): string {
  return `Today's date is ${todayISO}. Extract the receipt data as specified.`
}

// The model is asked for raw JSON but sometimes wraps it in a ```json fence
// anyway — stripped defensively rather than trusted to always comply.
export function parseReceiptExtraction(raw: string): ReceiptExtraction {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Couldn't read a receipt in that image — try a clearer photo.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    throw new Error("Couldn't read a receipt in that image — try a clearer photo.")
  }

  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}

  const amount = typeof obj.amount === 'number' && Number.isFinite(obj.amount) && obj.amount > 0
    ? round2(obj.amount)
    : null
  const date = typeof obj.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : null
  const merchant = typeof obj.merchant === 'string' && obj.merchant.trim() ? obj.merchant.trim() : null
  const categoryGuess = typeof obj.categoryGuess === 'string' && obj.categoryGuess.trim() ? obj.categoryGuess.trim() : null
  const lineItems = Array.isArray(obj.lineItems)
    ? obj.lineItems.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : []

  if (amount === null && date === null && merchant === null && lineItems.length === 0) {
    throw new Error("Couldn't find any receipt details in that image — try a clearer photo.")
  }

  return { merchant, amount, date, categoryGuess, lineItems }
}
