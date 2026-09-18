import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { formatMoney, positionOn } from '@/lib/household'
import type { HouseholdMember, HouseholdSettlement, SharedExpense } from '@/types/household.types'

interface ExpenseListProps {
  expenses: SharedExpense[]
  members: HouseholdMember[]
  meId: string | null
  currency: string
  onEdit: (e: SharedExpense) => void
  onDelete: (e: SharedExpense) => void
}

// One compact line per expense: what, who paid, the total, and — in a single
// phrase — what it means for *you*. The full split is one tap away instead of
// always on screen.
export function SharedExpenseList({ expenses, members, meId, currency, onEdit, onDelete }: ExpenseListProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const fmt = (n: number) => formatMoney(n, currency)
  const nameOf = (id: string) => (id === meId ? 'You' : members.find((m) => m.id === id)?.name ?? 'Someone')

  if (expenses.length === 0) {
    return <div className="hh-empty">No shared expenses yet. Add the first one — pick who paid and who shares it.</div>
  }

  return (
    <div className="hh-list">
      {expenses.map((e) => {
        const pos = positionOn(e, meId)
        const open = openId === e.id
        return (
          <div key={e.id} className="hh-row">
            <button className="hh-row-main" onClick={() => setOpenId(open ? null : e.id)} aria-expanded={open}>
              <span className="hh-row-left">
                <span className="hh-row-title">{e.description}</span>
                <span className="hh-row-meta">
                  {nameOf(e.paid_by)} paid · {formatDate(e.expense_date)}{e.category ? ` · ${e.category}` : ''}
                </span>
              </span>
              <span className="hh-row-right">
                <span className="hh-row-amount">{fmt(e.amount)}</span>
                {pos.kind === 'lent' && <span className="hh-row-you hh-pos">you lent {fmt(pos.amount)}</span>}
                {pos.kind === 'borrowed' && <span className="hh-row-you hh-neg">you owe {fmt(pos.amount)}</span>}
              </span>
            </button>
            {open && (
              <div className="hh-row-detail">
                <div className="hh-split-table">
                  {e.splits.map((s) => (
                    <div key={s.member_id} className="hh-split-line">
                      <strong>{nameOf(s.member_id)}</strong>
                      <span>{fmt(s.share)}</span>
                    </div>
                  ))}
                </div>
                {e.notes && <p className="hh-notes">{e.notes}</p>}
                <div className="hh-row-actions">
                  <button className="hh-ghost-btn" onClick={() => onEdit(e)}><Pencil size={13} /> Edit</button>
                  <button className="hh-ghost-btn hh-danger" onClick={() => onDelete(e)}><Trash2 size={13} /> Delete</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface SettlementListProps {
  settlements: HouseholdSettlement[]
  members: HouseholdMember[]
  meId: string | null
  currency: string
  onDelete: (s: HouseholdSettlement) => void
}

export function SettlementList({ settlements, members, meId, currency, onDelete }: SettlementListProps) {
  const nameOf = (id: string) => (id === meId ? 'You' : members.find((m) => m.id === id)?.name ?? 'Someone')

  if (settlements.length === 0) {
    return <div className="hh-empty">No payments recorded. When someone pays someone back, record it here to update the balances.</div>
  }

  return (
    <div className="hh-list">
      {settlements.map((s) => (
        <div key={s.id} className="hh-row">
          <div className="hh-row-main" style={{ cursor: 'default' }}>
            <span className="hh-row-left">
              <span className="hh-row-title">{nameOf(s.from_member)} paid {nameOf(s.to_member)}</span>
              <span className="hh-row-meta">{formatDate(s.settled_on)}{s.note ? ` · ${s.note}` : ''}</span>
            </span>
            <span className="hh-row-right" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <span className="hh-row-amount">{formatMoney(s.amount, currency)}</span>
              <button className="hh-ghost-btn hh-danger" onClick={() => onDelete(s)} aria-label="Delete payment"><Trash2 size={13} /></button>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
