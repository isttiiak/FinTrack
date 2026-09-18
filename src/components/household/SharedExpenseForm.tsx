import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { round2, toISODateString } from '@/lib/utils'
import { formatMoney, splitEqual } from '@/lib/household'
import { useSaveSharedExpense } from '@/hooks/useHousehold'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import type { Household, HouseholdMember, SharedExpense } from '@/types/household.types'

const CATEGORIES = ['Rent', 'Groceries', 'Utilities', 'Dining', 'Transport', 'Household', 'Travel', 'Other'] as const

interface SharedExpenseFormProps {
  household: Household
  members: HouseholdMember[]
  meId: string | null
  editing?: SharedExpense | null
  onClose: () => void
}

// Was the saved split an even one? (So editing reopens in the mode it was made in.)
function wasEqual(e: SharedExpense): boolean {
  const saved = e.splits.map((s) => s.share).sort((a, b) => b - a)
  const equal = splitEqual(e.amount, e.splits.length).sort((a, b) => b - a)
  return saved.length === equal.length && saved.every((v, i) => v === equal[i])
}

export default function SharedExpenseForm({ household, members, meId, editing, onClose }: SharedExpenseFormProps) {
  const { mutateAsync: save, isPending } = useSaveSharedExpense()
  const fmt = (n: number) => formatMoney(n, household.currency)

  const [description, setDescription] = useState(editing?.description ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [date, setDate] = useState(editing?.expense_date ?? toISODateString(new Date()))
  const [paidBy, setPaidBy] = useState(editing?.paid_by ?? meId ?? members[0]?.id ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [mode, setMode] = useState<'equal' | 'custom'>(editing && !wasEqual(editing) ? 'custom' : 'equal')
  const [included, setIncluded] = useState<Set<string>>(
    () => new Set(editing ? editing.splits.map((s) => s.member_id) : members.map((m) => m.id)),
  )
  const [custom, setCustom] = useState<Record<string, string>>(
    () => Object.fromEntries((editing?.splits ?? []).map((s) => [s.member_id, String(s.share)])),
  )
  const [submitted, setSubmitted] = useState(false)

  const amountNum = round2(Number(amount) || 0)

  const splits = useMemo(() => {
    if (mode === 'equal') {
      const ids = members.filter((m) => included.has(m.id)).map((m) => m.id)
      const shares = splitEqual(amountNum, ids.length)
      return ids.map((member_id, i) => ({ member_id, share: shares[i] }))
    }
    return members
      .map((m) => ({ member_id: m.id, share: round2(Number(custom[m.id]) || 0) }))
      .filter((s) => s.share > 0)
  }, [mode, members, included, custom, amountNum])

  const assigned = round2(splits.reduce((sum, s) => sum + s.share, 0))
  const remaining = round2(amountNum - assigned)

  let error = ''
  if (!description.trim()) error = 'Add a description'
  else if (amountNum <= 0) error = 'Enter an amount greater than zero'
  else if (splits.length === 0) error = 'Pick at least one person to split with'
  else if (remaining !== 0) error = remaining > 0 ? `${fmt(remaining)} still unassigned` : `Shares are ${fmt(-remaining)} over the amount`

  function toggle(id: string) {
    setIncluded((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (error) return
    try {
      await save({
        id: editing?.id,
        household_id: household.id,
        paid_by: paidBy,
        amount: amountNum,
        description: description.trim(),
        category: category || null,
        expense_date: date,
        notes: notes.trim() || null,
        splits,
      })
      onClose()
    } catch (err) {
      if (err instanceof DemoBlockedError) onClose()
    }
  }

  return (
    <div className="hh-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="hh-modal" variants={scaleIn} initial="initial" animate="animate" exit="exit" role="dialog" aria-modal="true" aria-label={editing ? 'Edit shared expense' : 'Add shared expense'}>
        <div className="hh-modal-head">
          <h2 className="hh-modal-title">{editing ? 'Edit shared expense' : 'Add shared expense'}</h2>
          <button className="hh-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <form className="hh-form" onSubmit={onSubmit}>
          <div className="hh-field">
            <label className="hh-label" htmlFor="hx-desc">What was it for?</label>
            <input id="hx-desc" className="hh-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Weekly groceries" autoFocus maxLength={200} />
          </div>

          <div className="hh-two">
            <div className="hh-field">
              <label className="hh-label" htmlFor="hx-amount">Amount ({household.currency})</label>
              <input id="hx-amount" className="hh-input" type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="hh-field">
              <label className="hh-label" htmlFor="hx-date">Date</label>
              <input id="hx-date" className="hh-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="hh-two">
            <div className="hh-field">
              <label className="hh-label" htmlFor="hx-paid">Paid by</label>
              <select id="hx-paid" className="hh-input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.id === meId ? `${m.name} (you)` : m.name}</option>)}
              </select>
            </div>
            <div className="hh-field">
              <label className="hh-label" htmlFor="hx-cat">Category</label>
              <select id="hx-cat" className="hh-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">—</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="hh-field">
            <span className="hh-label">Split</span>
            <div className="hh-seg">
              <button type="button" className={mode === 'equal' ? 'hh-seg-active' : ''} onClick={() => setMode('equal')}>Equally</button>
              <button type="button" className={mode === 'custom' ? 'hh-seg-active' : ''} onClick={() => setMode('custom')}>Custom amounts</button>
            </div>
            <div>
              {members.map((m) => {
                const share = splits.find((s) => s.member_id === m.id)?.share
                return (
                  <div key={m.id} className="hh-split-row">
                    {mode === 'equal' ? (
                      <>
                        <label>
                          <input type="checkbox" checked={included.has(m.id)} onChange={() => toggle(m.id)} />
                          {m.name}{m.id === meId && ' (you)'}
                        </label>
                        <span className="hh-split-amt">{share !== undefined ? fmt(share) : '—'}</span>
                      </>
                    ) : (
                      <>
                        <label>{m.name}{m.id === meId && ' (you)'}</label>
                        <input
                          className="hh-input hh-split-share" type="number" inputMode="decimal" min="0" step="any"
                          value={custom[m.id] ?? ''} onChange={(e) => setCustom((c) => ({ ...c, [m.id]: e.target.value }))}
                          placeholder="0" aria-label={`${m.name}'s share`}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            {mode === 'custom' && amountNum > 0 && (
              <span className={`hh-remaining ${remaining === 0 ? 'hh-pos' : 'hh-neg'}`}>
                {remaining === 0 ? 'Shares add up ✓' : remaining > 0 ? `${fmt(remaining)} left to assign` : `${fmt(-remaining)} over`}
              </span>
            )}
          </div>

          <div className="hh-field">
            <label className="hh-label" htmlFor="hx-notes">Notes <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
            <input id="hx-notes" className="hh-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {submitted && error && <p className="hh-error">{error}</p>}
          <div className="hh-actions">
            <button type="button" className="hh-ghost-btn" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={isPending}>{isPending ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
