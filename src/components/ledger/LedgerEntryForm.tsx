import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString } from '@/lib/utils'
import { PAYMENT_METHODS, ACCOUNTS, LEDGER_TYPES } from '@/lib/constants'
import { useCreateLedgerEntry, useUpdateLedgerEntry } from '@/hooks/useLedger'
import type { PersonLedger } from '@/types/ledger.types'

const schema = z.object({
  ledger_type:    z.enum(LEDGER_TYPES),
  total_amount:   z.number({ error: 'Enter a valid amount' }).positive(),
  start_date:     z.string().min(1, 'Select a date'),
  reason:         z.string().optional(),
  payment_method: z.enum(PAYMENT_METHODS).optional(),
  account:        z.enum(ACCOUNTS).optional(),
  doc_link:       z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  notes:          z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface LedgerEntryFormProps {
  personId: string
  editing?: PersonLedger | null
  defaultType?: 'Lent' | 'Debt'
  onClose: () => void
}

export default function LedgerEntryForm({ personId, editing, defaultType = 'Lent', onClose }: LedgerEntryFormProps) {
  const { mutateAsync: create, isPending: creating } = useCreateLedgerEntry()
  const { mutateAsync: update, isPending: updating } = useUpdateLedgerEntry()
  const isPending = creating || updating

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          ledger_type:    editing.ledger_type,
          total_amount:   editing.total_amount,
          start_date:     editing.start_date,
          reason:         editing.reason ?? '',
          payment_method: editing.payment_method ?? undefined,
          account:        editing.account ?? undefined,
          doc_link:       editing.doc_link ?? '',
          notes:          editing.notes ?? '',
        }
      : {
          ledger_type: defaultType,
          start_date:  toISODateString(new Date()),
        },
  })

  const selectedType = watch('ledger_type')

  async function onSubmit(values: FormValues) {
    const payload = {
      person_id:      personId,
      ledger_type:    values.ledger_type,
      total_amount:   values.total_amount,
      start_date:     values.start_date,
      reason:         values.reason || null,
      payment_method: values.payment_method ?? null,
      account:        values.account ?? null,
      doc_link:       values.doc_link || null,
      notes:          values.notes || null,
      settled_date:   editing?.settled_date ?? null,
    }
    if (editing) {
      await update({ id: editing.id, ...payload })
    } else {
      await create(payload)
    }
    onClose()
  }

  return (
    <div className="lef-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="lef-panel" variants={scaleIn} initial="initial" animate="animate" exit="exit">
        <div className="lef-header">
          <h2 className="lef-title">{editing ? 'Edit entry' : 'Add ledger entry'}</h2>
          <button className="lef-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="lef-form">
          {/* Type toggle */}
          <div className="lef-type-toggle">
            {LEDGER_TYPES.map((t) => (
              <label
                key={t}
                className={cn('lef-type-btn', selectedType === t && `lef-type-btn-active lef-type-${t.toLowerCase()}`)}
              >
                <input {...register('ledger_type')} type="radio" value={t} style={{ display: 'none' }} />
                {t === 'Lent' ? '💸 Lent' : '🏦 Debt'}
              </label>
            ))}
          </div>
          <p className="lef-type-hint">
            {selectedType === 'Lent' ? 'You gave money — they owe you' : 'You received money — you owe them'}
          </p>

          {/* Amount */}
          <div className="lef-field">
            <label className="lef-label">Amount (৳)</label>
            <input
              {...register('total_amount', { valueAsNumber: true })}
              type="number" step="0.01" placeholder="0.00"
              className={cn('lef-input lef-amount-input', errors.total_amount && 'lef-input-error')}
              autoFocus={!editing}
            />
            {errors.total_amount && <p className="lef-error">{errors.total_amount.message}</p>}
          </div>

          {/* Date */}
          <div className="lef-field">
            <label className="lef-label">Date</label>
            <input
              {...register('start_date')}
              type="date"
              className={cn('lef-input', errors.start_date && 'lef-input-error')}
            />
            {errors.start_date && <p className="lef-error">{errors.start_date.message}</p>}
          </div>

          {/* Reason */}
          <div className="lef-field">
            <label className="lef-label">Reason <span className="lef-optional">(optional)</span></label>
            <input
              {...register('reason')}
              className="lef-input"
              placeholder="e.g. Medical emergency, Business capital"
            />
          </div>

          {/* Payment method + Account */}
          <div className="lef-row">
            <div className="lef-field">
              <label className="lef-label">Method</label>
              <div className="lef-select-wrap">
                <select {...register('payment_method')} className="lef-select">
                  <option value="">— None —</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="lef-select-icon" size={14} />
              </div>
            </div>
            <div className="lef-field">
              <label className="lef-label">Account</label>
              <div className="lef-select-wrap">
                <select {...register('account')} className="lef-select">
                  <option value="">— None —</option>
                  {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown className="lef-select-icon" size={14} />
              </div>
            </div>
          </div>

          {/* Doc link */}
          <div className="lef-field">
            <label className="lef-label">Document link <span className="lef-optional">(optional)</span></label>
            <input
              {...register('doc_link')}
              className={cn('lef-input', errors.doc_link && 'lef-input-error')}
              placeholder="Google Drive, receipt link…"
              type="url"
            />
            {errors.doc_link && <p className="lef-error">{errors.doc_link.message}</p>}
          </div>

          <div className="lef-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <motion.button
              type="submit"
              className="btn-primary lef-submit"
              disabled={isPending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span key="spin" className="lef-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                ) : (
                  <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {editing ? 'Save changes' : 'Add entry'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </form>
      </motion.div>

      <style>{`
        .lef-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        @media (max-width: 640px) {
          .lef-overlay { align-items: flex-end; padding: 0; }
          .lef-panel { border-radius: 20px 20px 0 0 !important; max-height: 92vh; overflow-y: auto; }
        }
        .lef-panel {
          width: 100%; max-width: 460px;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px;
          padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .lef-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .lef-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .lef-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .lef-close:hover { background: var(--bg-card); color: var(--text-primary); }
        .lef-form { display: flex; flex-direction: column; gap: 14px; }
        .lef-type-toggle { display: flex; gap: 8px; }
        .lef-type-btn {
          flex: 1; padding: 9px 12px; border-radius: 10px; text-align: center;
          font-size: 13px; font-weight: 600; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-secondary); transition: background 0.15s, color 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .lef-type-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .lef-type-btn-active { color: #fff !important; border-color: transparent !important; }
        .lef-type-lent { background: linear-gradient(135deg, #10B981, #06B6D4) !important; }
        .lef-type-debt { background: linear-gradient(135deg, #F97316, #EF4444) !important; }
        .lef-type-hint { font-size: 12px; color: var(--text-muted); margin: -8px 0 0; }
        .lef-field { display: flex; flex-direction: column; gap: 5px; }
        .lef-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .lef-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .lef-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px; width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .lef-input::placeholder { color: var(--text-muted); }
        .lef-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
        .lef-input-error { border-color: var(--accent-red) !important; }
        .lef-amount-input { font-size: 22px; font-weight: 700; padding: 12px 14px; }
        .lef-error { font-size: 12px; color: #FCA5A5; margin: 0; }
        .lef-select-wrap { position: relative; }
        .lef-select {
          width: 100%; appearance: none;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 32px 10px 14px; cursor: pointer;
        }
        .lef-select:focus { outline: none; border-color: var(--border-focus); }
        .lef-select option { background: #1E1E38; }
        .lef-select-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .lef-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .lef-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
        .lef-submit { min-width: 110px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .lef-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:lef-spin 0.7s linear infinite; }
        @keyframes lef-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
