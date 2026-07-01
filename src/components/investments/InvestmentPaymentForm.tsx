import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowUpRight } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, formatCurrency } from '@/lib/utils'
import { useCreateInvestmentPayment } from '@/hooks/useInvestments'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import type { Investment } from '@/types/investment.types'

const schema = z.object({
  amount:         z.number().positive('Enter a valid amount'),
  payment_date:   z.string().min(1, 'Select a date'),
  payment_method: z.string().min(1, 'Required'),
  account:        z.string().min(1, 'Required'),
  notes:          z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const LS_METHOD_KEY = 'fintrack_last_method'
const LS_ACCOUNT_KEY = 'fintrack_last_account'

interface InvestmentPaymentFormProps {
  investment: Investment
  onClose: () => void
}

export default function InvestmentPaymentForm({ investment, onClose }: InvestmentPaymentFormProps) {
  const { mutateAsync: createPayment, isPending } = useCreateInvestmentPayment()

  const committed = investment.committed_amount ?? 0
  const paid = investment.total_paid ?? 0
  const remaining = Math.max(0, committed - paid)

  const lastMethod = localStorage.getItem(LS_METHOD_KEY) ?? 'Cash'
  const lastAccount = localStorage.getItem(LS_ACCOUNT_KEY) ?? 'Cash'

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount:         remaining > 0 ? remaining : undefined,
      payment_date:   toISODateString(new Date()),
      payment_method: lastMethod,
      account:        lastAccount,
    },
  })
  const watchMethod  = watch('payment_method')
  const watchAccount = watch('account')

  async function onSubmit(values: FormValues) {
    if (values.payment_method) localStorage.setItem(LS_METHOD_KEY, values.payment_method)
    if (values.account) localStorage.setItem(LS_ACCOUNT_KEY, values.account)

    await createPayment({
      investment_id:  investment.id,
      amount:         values.amount,
      payment_date:   values.payment_date,
      payment_method: values.payment_method || null,
      account:        values.account || null,
      notes:          values.notes || null,
    })
    onClose()
  }

  return (
    <div className="ipf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="ipf-panel" variants={scaleIn} initial="initial" animate="animate" exit="exit">
        <div className="ipf-header">
          <div>
            <h2 className="ipf-title">Log installment payment</h2>
            <p className="ipf-sub">
              <ArrowUpRight size={11} style={{ display: 'inline', color: 'var(--accent-coral)' }} />
              {' '}{investment.name}
            </p>
          </div>
          <button className="ipf-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Progress strip */}
        {committed > 0 && (
          <div className="ipf-progress-wrap">
            <div className="ipf-progress-row">
              <span className="ipf-progress-label">Committed: {formatCurrency(committed)}</span>
              <span className="ipf-progress-label">Paid: {formatCurrency(paid)}</span>
            </div>
            <div className="ipf-progress-bar">
              <div
                className="ipf-progress-fill"
                style={{ width: `${committed > 0 ? Math.min(100, (paid / committed) * 100) : 0}%` }}
              />
            </div>
            {remaining > 0 && (
              <p className="ipf-remaining">৳{formatCurrency(remaining)} remaining to pay</p>
            )}
            {remaining === 0 && paid > 0 && (
              <p className="ipf-remaining" style={{ color: 'var(--accent-teal)' }}>Fully paid ✓</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="ipf-form">
          <div className="ipf-field">
            <label className="ipf-label">Amount paid (৳) <span className="req">*</span></label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number" step="0.01" placeholder="0.00"
              className={cn('ipf-input ipf-amount', errors.amount && 'ipf-input-error')}
              autoFocus
            />
            {errors.amount && <p className="ipf-error">{errors.amount.message}</p>}
          </div>

          <div className="ipf-field">
            <label className="ipf-label">Payment date <span className="req">*</span></label>
            <input
              {...register('payment_date')}
              type="date"
              className={cn('ipf-input', errors.payment_date && 'ipf-input-error')}
            />
          </div>

          {/* Payment method + account */}
          <PaymentMethodPicker
            method={watchMethod}
            account={watchAccount}
            onMethodChange={(v) => setValue('payment_method', v ?? lastMethod)}
            onAccountChange={(v) => setValue('account', v ?? lastAccount)}
          />

          <div className="ipf-field">
            <label className="ipf-label">Notes <span className="ipf-optional">(optional)</span></label>
            <input {...register('notes')} className="ipf-input" placeholder="e.g. 1st instalment, final payment" />
          </div>

          <div className="ipf-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <motion.button
              type="submit"
              className="btn-primary ipf-submit"
              disabled={isPending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span key="spin" className="ipf-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
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
        .ipf-overlay {
          position: fixed; inset: 0; z-index: 60;
          background: rgba(0,0,0,0.65);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        @media (max-width: 640px) { .ipf-overlay { align-items: flex-end; padding: 0; } .ipf-panel { border-radius: 20px 20px 0 0 !important; } }
        .ipf-panel {
          width: 100%; max-width: 420px;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px;
          padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .ipf-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .ipf-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 3px; }
        .ipf-sub { font-size: 12px; color: var(--text-muted); margin: 0; }
        .ipf-close {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .ipf-close:hover { background: var(--bg-card); color: var(--text-primary); }
        .ipf-progress-wrap {
          padding: 12px 14px; border-radius: 10px; margin-bottom: 16px;
          background: rgba(249,115,22,0.06); border: 1px solid rgba(249,115,22,0.15);
        }
        .ipf-progress-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .ipf-progress-label { font-size: 12px; color: var(--text-secondary); }
        .ipf-progress-bar { height: 6px; border-radius: 3px; background: var(--bg-elevated); overflow: hidden; margin-bottom: 5px; }
        .ipf-progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg,#F97316,#EF4444); transition: width 0.4s ease; }
        .ipf-remaining { font-size: 11px; color: var(--accent-coral); margin: 0; }
        .ipf-form { display: flex; flex-direction: column; gap: 14px; }
        .ipf-field { display: flex; flex-direction: column; gap: 5px; }
        .ipf-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .ipf-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .ipf-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px; width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ipf-input::placeholder { color: var(--text-muted); }
        .ipf-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
        .ipf-input-error { border-color: var(--accent-red) !important; }
        .ipf-amount { font-size: 22px; font-weight: 700; padding: 12px 14px; }
        .ipf-error { font-size: 12px; color: #FCA5A5; margin: 0; }
        .ipf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
        .ipf-submit { min-width: 120px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .ipf-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:ipf-spin 0.7s linear infinite; }
        @keyframes ipf-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
