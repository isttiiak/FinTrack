import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { round2, toISODateString } from '@/lib/utils'
import { formatMoney } from '@/lib/household'
import { useAddSettlement } from '@/hooks/useHousehold'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import type { Household, HouseholdMember } from '@/types/household.types'

interface SettleFormProps {
  household: Household
  members: HouseholdMember[]
  meId: string | null
  // Prefill from a suggested payment
  initial?: { from: string; to: string; amount: number }
  onClose: () => void
}

// Records that one member paid another to square up. It only ever moves
// balances — it isn't an expense, so it never shows in the expense list.
export default function SettleForm({ household, members, meId, initial, onClose }: SettleFormProps) {
  const { mutateAsync: add, isPending } = useAddSettlement()
  const [from, setFrom] = useState(initial?.from ?? meId ?? members[0]?.id ?? '')
  const [to, setTo] = useState(initial?.to ?? members.find((m) => m.id !== (initial?.from ?? meId))?.id ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [date, setDate] = useState(toISODateString(new Date()))
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const amountNum = round2(Number(amount) || 0)
  let error = ''
  if (from === to) error = 'Pick two different people'
  else if (amountNum <= 0) error = 'Enter an amount greater than zero'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (error) return
    try {
      await add({ household_id: household.id, from_member: from, to_member: to, amount: amountNum, settled_on: date, note: note.trim() || null })
      onClose()
    } catch (err) {
      if (err instanceof DemoBlockedError) onClose()
    }
  }

  const label = (m: HouseholdMember) => (m.id === meId ? `${m.name} (you)` : m.name)

  return (
    <div className="hh-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="hh-modal" variants={scaleIn} initial="initial" animate="animate" exit="exit" role="dialog" aria-modal="true" aria-label="Record a payment">
        <div className="hh-modal-head">
          <h2 className="hh-modal-title">Record a payment</h2>
          <button className="hh-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form className="hh-form" onSubmit={onSubmit}>
          <div className="hh-two">
            <div className="hh-field">
              <label className="hh-label" htmlFor="hs-from">Who paid</label>
              <select id="hs-from" className="hh-input" value={from} onChange={(e) => setFrom(e.target.value)}>
                {members.map((m) => <option key={m.id} value={m.id}>{label(m)}</option>)}
              </select>
            </div>
            <div className="hh-field">
              <label className="hh-label" htmlFor="hs-to">Paid to</label>
              <select id="hs-to" className="hh-input" value={to} onChange={(e) => setTo(e.target.value)}>
                {members.map((m) => <option key={m.id} value={m.id}>{label(m)}</option>)}
              </select>
            </div>
          </div>
          <div className="hh-two">
            <div className="hh-field">
              <label className="hh-label" htmlFor="hs-amount">Amount ({household.currency})</label>
              <input id="hs-amount" className="hh-input" type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus />
            </div>
            <div className="hh-field">
              <label className="hh-label" htmlFor="hs-date">Date</label>
              <input id="hs-date" className="hh-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="hh-field">
            <label className="hh-label" htmlFor="hs-note">Note <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
            <input id="hs-note" className="hh-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer" />
          </div>
          {submitted && error && <p className="hh-error">{error}</p>}
          {amountNum > 0 && from !== to && (
            <p className="hh-note">
              {members.find((m) => m.id === from)?.name} paid {members.find((m) => m.id === to)?.name} {formatMoney(amountNum, household.currency)}.
            </p>
          )}
          <div className="hh-actions">
            <button type="button" className="hh-ghost-btn" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={isPending}>{isPending ? 'Saving…' : 'Record payment'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
