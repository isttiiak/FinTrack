import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, getActiveCurrencySymbol } from '@/lib/utils'
import { LEDGER_TYPES } from '@/lib/constants'
import type { PaymentMethod, Account } from '@/lib/constants'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import { useCreateLedgerEntry, useUpdateLedgerEntry } from '@/hooks/useLedger'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import type { PersonLedger } from '@/types/ledger.types'
import './LedgerEntryForm.css'

const schema = z.object({
  ledger_type:    z.enum(LEDGER_TYPES),
  total_amount:   z.number({ error: 'Enter a valid amount' }).positive(),
  start_date:     z.string().min(1, 'Select a date'),
  reason:         z.string().optional(),
  payment_method: z.string().min(1, 'Required'),
  account:        z.string().min(1, 'Required'),
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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          ledger_type:    editing.ledger_type,
          total_amount:   editing.total_amount,
          start_date:     editing.start_date,
          reason:         editing.reason ?? '',
          payment_method: editing.payment_method ?? 'Cash',
          account:        editing.account ?? 'Cash',
          doc_link:       editing.doc_link ?? '',
          notes:          editing.notes ?? '',
        }
      : {
          ledger_type:    defaultType,
          start_date:     toISODateString(new Date()),
          payment_method: 'Cash',
          account:        'Cash',
        },
  })

  const selectedType   = watch('ledger_type')
  const paymentMethod  = watch('payment_method')
  const accountValue   = watch('account')

  async function onSubmit(values: FormValues) {
    const payload = {
      person_id:      personId,
      ledger_type:    values.ledger_type,
      total_amount:   values.total_amount,
      start_date:     values.start_date,
      reason:         values.reason || null,
      payment_method: (values.payment_method || null) as PaymentMethod | null,
      account:        (values.account || null) as Account | null,
      doc_link:       values.doc_link || null,
      notes:          values.notes || null,
      settled_date:   editing?.settled_date ?? null,
    }
    try {
      if (editing) {
        await update({ id: editing.id, ...payload })
      } else {
        await create(payload)
      }
      onClose()
    } catch (err) {
      if (err instanceof DemoBlockedError) onClose()
    }
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
            <label className="lef-label">Amount ({getActiveCurrencySymbol()})</label>
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
          <div className="lef-field">
            <label className="lef-label">Payment</label>
            <PaymentMethodPicker
              method={paymentMethod}
              account={accountValue}
              onMethodChange={(m) => setValue('payment_method', m ?? 'Cash')}
              onAccountChange={(a) => setValue('account', a ?? 'Cash')}
            />
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

    </div>
  )
}
