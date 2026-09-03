import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example → .env.local and fill in your keys.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// PostgREST caps every response at 1,000 rows by default — silently, no
// error, the array just ends. Any query whose row count grows with usage
// over time (transactions, ledger entries/payments — anything without a
// natural per-user ceiling) needs to page through .range() rather than
// awaiting the query directly, or results quietly truncate once a user
// has enough history. See TODO.md §3.1.
//
// `queryFn` should build the full query (all filters/order already
// applied) and return a *fresh* range each call — pass a factory, not a
// pre-built query, since supabase-js's .range() mutates and re-awaiting
// the same builder re-issues the request with its current range.
const PAGE_SIZE = 1000

export async function fetchAllRows<T>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await queryFn(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return rows
}
