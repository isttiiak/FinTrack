import type { Transaction } from '@/types/expense.types'
import type { Person } from '@/types/ledger.types'
import type { Investment } from '@/types/investment.types'

export interface SearchSources {
  transactions: Transaction[]
  persons: Person[]
  investments: Investment[]
}

export interface SearchResults {
  transactions: Transaction[]
  persons: Person[]
  investments: Investment[]
}

const EMPTY: SearchResults = { transactions: [], persons: [], investments: [] }

function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

// Every token must appear somewhere in the haystack (AND semantics), so
// "uber 350" finds an Uber ride of 350 without needing exact phrase order.
function matches(haystack: string, tokens: string[]): boolean {
  const h = haystack.toLowerCase()
  return tokens.every((t) => h.includes(t))
}

// Results whose primary label starts with the first token rank above ones
// that only contain it somewhere.
function primaryRank(label: string | null | undefined, tokens: string[]): number {
  return (label ?? '').toLowerCase().startsWith(tokens[0]) ? 0 : 1
}

export function searchEntities(query: string, sources: SearchSources, limit = 6): SearchResults {
  const tokens = tokenize(query)
  if (tokens.length === 0) return EMPTY

  const transactions = sources.transactions
    .filter((t) =>
      matches(
        [t.description, t.category?.name, t.category?.main_group, t.payment_method, t.account, String(t.amount), t.txn_date]
          .filter(Boolean)
          .join(' '),
        tokens,
      ),
    )
    .sort((a, b) =>
      primaryRank(a.description, tokens) - primaryRank(b.description, tokens) || b.txn_date.localeCompare(a.txn_date),
    )
    .slice(0, limit)

  const persons = sources.persons
    .filter((p) => matches([p.name, p.relationship, p.phone, p.notes].filter(Boolean).join(' '), tokens))
    .sort((a, b) => primaryRank(a.name, tokens) - primaryRank(b.name, tokens) || a.name.localeCompare(b.name))
    .slice(0, limit)

  const investments = sources.investments
    .filter((i) => matches([i.name, i.company_name, i.category, i.notes].filter(Boolean).join(' '), tokens))
    .sort((a, b) => primaryRank(a.name, tokens) - primaryRank(b.name, tokens) || a.name.localeCompare(b.name))
    .slice(0, limit)

  return { transactions, persons, investments }
}
