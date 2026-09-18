import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowUpRight } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, formatCurrency, getActiveCurrencySymbol } from '@/lib/utils'
import { useCreateInvestmentPayment } from '@/hooks/useInvestments'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import type { Investment } from '@/types/investment.types'
import './InvestmentPaymentForm.css'

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

    try {
      await createPayment({
        investment_id:  investment.id,
        amount:         values.amount,
        payment_date:   values.payment_date,
        payment_method: values.payment_method || null,
        account:        values.account || null,
        notes:          values.notes || null,
      })
      onClose()
    } catch (err) {
      if (err instanceof DemoBlockedError) onClose()
    }
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
              <p className="ipf-remaining">{formatCurrency(remaining)} remaining to pay</p>
            )}
            {remaining === 0 && paid > 0 && (
              <p className="ipf-remaining" style={{ color: 'var(--accent-teal)' }}>Fully paid ✓</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="ipf-form">
          <div className="ipf-field">
            <label className="ipf-label">Amount paid ({getActiveCurrencySymbol()}) <span className="req">*</span></label>
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

    </div>
  )
}
