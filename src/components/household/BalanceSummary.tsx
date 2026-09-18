import { formatMoney, type SuggestedTransfer } from '@/lib/household'
import type { Household, HouseholdMember } from '@/types/household.types'

interface BalanceSummaryProps {
  household: Household
  members: HouseholdMember[]
  balances: Map<string, number>
  meId: string | null
  suggestions: SuggestedTransfer[]
  expenseCount: number
  onRecord: (initial?: { from: string; to: string; amount: number }) => void
}

// The one place balances live: a single headline for "where do I stand",
// a chip per person, and the few payments that would square everyone up.
// The expense list below stays free of balance maths.
export default function BalanceSummary({ household, members, balances, meId, suggestions, expenseCount, onRecord }: BalanceSummaryProps) {
  const fmt = (n: number) => formatMoney(n, household.currency)
  const nameOf = (id: string) => (id === meId ? 'You' : members.find((m) => m.id === id)?.name ?? 'Someone')

  const mine = meId ? balances.get(meId) ?? 0 : 0
  const others = members.filter((m) => m.id !== meId)
  const allSquare = [...balances.values()].every((b) => b === 0)

  return (
    <div className="hh-hero">
      {meId ? (
        <>
          <div className="hh-hero-label">Your balance</div>
          <div className={`hh-hero-amount ${mine > 0 ? 'hh-pos' : mine < 0 ? 'hh-neg' : 'hh-zero'}`}>
            {mine > 0 ? `You are owed ${fmt(mine)}` : mine < 0 ? `You owe ${fmt(-mine)}` : 'You’re all settled up'}
          </div>
        </>
      ) : (
        <>
          <div className="hh-hero-label">Household balance</div>
          <div className="hh-hero-amount hh-zero">{allSquare ? 'Everyone is settled up' : 'Balances'}</div>
        </>
      )}
      <div className="hh-hero-sub">{expenseCount} shared expense{expenseCount === 1 ? '' : 's'} · {household.currency}</div>

      {others.length > 0 && (
        <div className="hh-people">
          {others.map((m) => {
            const b = balances.get(m.id) ?? 0
            return (
              <span key={m.id} className="hh-person">
                <strong>{m.name}</strong>
                <span className={b > 0 ? 'hh-pos' : b < 0 ? 'hh-neg' : ''}>
                  {b > 0 ? `is owed ${fmt(b)}` : b < 0 ? `owes ${fmt(-b)}` : 'settled'}
                </span>
              </span>
            )
          })}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="hh-suggest">
          <div className="hh-suggest-title">To settle up</div>
          {suggestions.map((t) => (
            <div key={`${t.from}-${t.to}`} className="hh-suggest-row">
              <span>{nameOf(t.from)} → {nameOf(t.to)} · <strong>{fmt(t.amount)}</strong></span>
              <button className="hh-ghost-btn" onClick={() => onRecord(t)}>Record payment</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
