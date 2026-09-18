import { describe, it, expect } from 'vitest'
import { searchEntities, type SearchSources } from '@/lib/commandSearch'
import type { Transaction } from '@/types/expense.types'
import type { Person } from '@/types/ledger.types'
import type { Investment } from '@/types/investment.types'

const txn = (over: Partial<Transaction>): Transaction => ({
  id: 'x', user_id: 'u', category_id: null, txn_date: '2026-09-01', type: 'Expense', amount: 100,
  description: null, payment_method: null, account: null, created_at: '', category: null,
  ...over,
}) as Transaction

const person = (over: Partial<Person>): Person => ({
  id: 'p', user_id: 'u', name: 'Someone', relationship: null, phone: null, notes: null, created_at: '',
  ...over,
})

const inv = (over: Partial<Investment>): Investment => ({
  id: 'i', user_id: 'u', name: 'Fund', category: null, company_name: null, committed_amount: null,
  start_date: null, end_date: null, market_value: null, doc_link: null, notes: null, created_at: '',
  ...over,
})

const sources: SearchSources = {
  transactions: [
    txn({ id: 't1', description: 'Uber to office', amount: 350, txn_date: '2026-09-02' }),
    txn({ id: 't2', description: 'Lunch at Uber Eats', amount: 500, txn_date: '2026-09-10' }),
    txn({ id: 't3', description: 'Groceries', amount: 1200, txn_date: '2026-08-01' }),
  ],
  persons: [person({ id: 'p1', name: 'Rafiq Bhai', relationship: 'Friend' }), person({ id: 'p2', name: 'Mama', phone: '01711' })],
  investments: [inv({ id: 'i1', name: 'DSE Stock Portfolio', category: 'Stocks' }), inv({ id: 'i2', name: 'Land Plot', company_name: 'Bashundhara' })],
}

describe('searchEntities', () => {
  it('returns nothing for a blank query', () => {
    const r = searchEntities('   ', sources)
    expect(r.transactions).toHaveLength(0)
    expect(r.persons).toHaveLength(0)
    expect(r.investments).toHaveLength(0)
  })

  it('is case-insensitive and ranks label-prefix matches first, then by recency', () => {
    const r = searchEntities('UBER', sources)
    expect(r.transactions.map((t) => t.id)).toEqual(['t1', 't2'])
  })

  it('requires every token to match, in any order', () => {
    expect(searchEntities('uber 350', sources).transactions.map((t) => t.id)).toEqual(['t1'])
    expect(searchEntities('350 uber', sources).transactions.map((t) => t.id)).toEqual(['t1'])
    expect(searchEntities('uber 999', sources).transactions).toHaveLength(0)
  })

  it('searches people by name, relationship and phone', () => {
    expect(searchEntities('rafiq', sources).persons.map((p) => p.id)).toEqual(['p1'])
    expect(searchEntities('friend', sources).persons.map((p) => p.id)).toEqual(['p1'])
    expect(searchEntities('0171', sources).persons.map((p) => p.id)).toEqual(['p2'])
  })

  it('searches investments by name, company and category', () => {
    expect(searchEntities('stocks', sources).investments.map((i) => i.id)).toEqual(['i1'])
    expect(searchEntities('bashundhara', sources).investments.map((i) => i.id)).toEqual(['i2'])
  })

  it('caps each group at the limit', () => {
    const many = { ...sources, transactions: Array.from({ length: 20 }, (_, n) => txn({ id: `m${n}`, description: 'coffee' })) }
    expect(searchEntities('coffee', many, 5).transactions).toHaveLength(5)
  })
})
