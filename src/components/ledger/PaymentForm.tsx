import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, formatCurrency } from '@/lib/utils'
import type { PaymentMethod, Account } from '@/lib/constants'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import { useCreatePayment } from '@/hooks/useLedger'
import type { PersonLedger } from '@/types/ledger.types'

const schema = z.object({
  amount:         z.number({ error: 'Enter a valid amount' }).positive(),
  payment_date:   z.string().min(1, 'Select a date'),
  payment_method: z.string().min(1, 'Required'),
  account:        z.string().min(1, 'Required'),
  notes:          z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface PaymentFormProps {
  entry: PersonLedger
  onClose: () => void
}

export default function PaymentForm({ entry, onClose }: PaymentFormProps) {
  const { mutateAsync: createPayment, isPending } = useCreatePayment()
  const remaining = entry.remaining ?? entry.total_amount

  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount:         remaining,
      payment_date:   toISODateString(new Date()),
      payment_method: 'Cash',
      account:        'Cash',
    },
  })

  const paymentMethod = watch('payment_method')
  const accountValue  = watch('account')

  async function onSubmit(values: FormValues) {
    if (values.amount > remaining) {
      setError('amount', { message: `Cannot exceed remaining balance of ${formatCurrency(remaining)}` })
      return
    }
    await createPayment({
      ledger_id:      entry.id,
      amount:         values.amount,
      payment_date:   values.payment_date,
      payment_method: (values.payment_method || null) as PaymentMethod | null,
      account:        (values.account || null) as Account | null,
      notes:          values.notes || null,
    })
    onClose()
  }

  return (
    <div className="payf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="payf-panel" variants={scaleIn} initial="initial" animate="animate" exit="exit">
        <div className="payf-header">
          <div>
            <h2 className="payf-title">Log payment</h2>
            <p className="payf-sub">
              {entry.ledger_type === 'Lent' ? 'They paid you back' : 'You paid them'}
              {' · '}
              <span className="payf-remaining">Remaining: {formatCurrency(remaining)}</span>
            </p>
          </div>
          <button className="payf-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="payf-form">
          <div className="payf-field">
            <label className="payf-label">Amount (৳)</label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number" step="0.01" placeholder="0.00"
              className={cn('payf-input payf-amount-input', errors.amount && 'payf-input-error')}
              autoFocus
            />
            {errors.amount && <p className="payf-error">{errors.amount.message}</p>}
          </div>

          <div className="payf-field">
            <label className="payf-label">Date</label>
            <input
              {...register('payment_date')}
              type="date"
              className={cn('payf-input', errors.payment_date && 'payf-input-error')}
            />
            {errors.payment_date && <p className="payf-error">{errors.payment_date.message}</p>}
          </div>

          <div className="payf-field">
            <label className="payf-label">Payment</label>
            <PaymentMethodPicker
              method={paymentMethod}
              account={accountValue}
              onMethodChange={(v) => setValue('payment_method', v ?? 'Cash')}
              onAccountChange={(v) => setValue('account', v ?? 'Cash')}
            />
          </div>

          <div className="payf-field">
            <label className="payf-label">Notes <span className="payf-optional">(optional)</span></label>
            <input {...register('notes')} className="payf-input" placeholder="e.g. Settled in full" />
          </div>

          <div className="payf-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <motion.button
              type="submit"
              className="btn-primary payf-submit"
              disabled={isPending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span key="spin" className="payf-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                ) : (
                  <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Log payment
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </form>
      </motion.div>

      <style>{`
        .payf-overlay {
          position: fixed; inset: 0; z-index: 60;
          background: rgba(0,0,0,0.65);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        @media (max-width: 640px) {
          .payf-overlay { align-items: flex-end; padding: 0; }
          .payf-panel { border-radius: 20px 20px 0 0 !important; }
        }
        .payf-panel {
          width: 100%; max-width: 420px;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px;
          padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .payf-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 12px; }
        .payf-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 3px; }
        .payf-sub { font-size: 12px; color: var(--text-muted); margin: 0; }
        .payf-remaining { color: var(--accent-teal); }
        .payf-close {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .payf-close:hover { background: var(--bg-card); color: var(--text-primary); }
        .payf-form { display: flex; flex-direction: column; gap: 14px; }
        .payf-field { display: flex; flex-direction: column; gap: 5px; }
        .payf-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .payf-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .payf-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px; width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .payf-input::placeholder { color: var(--text-muted); }
        .payf-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
        .payf-input-error { border-color: var(--accent-red) !important; }
        .payf-amount-input { font-size: 22px; font-weight: 700; padding: 12px 14px; }
        .payf-error { font-size: 12px; color: #FCA5A5; margin: 0; }
        .payf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
        .payf-submit { min-width: 120px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .payf-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:payf-spin 0.7s linear infinite; }
        @keyframes payf-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
