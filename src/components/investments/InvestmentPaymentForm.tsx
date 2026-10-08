import { useForm, Controller } from 'react-hook-form'
import SmartAmountInput from '@/components/common/SmartAmountInput'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowUpRight } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, formatCurrency, getActiveCurrencySymbol } from '@/lib/utils'
import { useCreateInvestmentPayment, useUpdateInvestmentPayment } from '@/hooks/useInvestments'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import type { Investment, InvestmentPayment } from '@/types/investment.types'
import './InvestmentPaymentForm.css'

const schema = z.object({
  amount:         z.number().positive('Enter a valid amount'),
  payment_date:   z.string().min(1, 'Select a date'),
  payment_method: z.string().optional(),
  account:        z.string().optional(),
  notes:          z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const LS_METHOD_KEY = 'fintrack_last_method'
const LS_ACCOUNT_KEY = 'fintrack_last_account'

interface InvestmentPaymentFormProps {
  investment: Investment
  // Edit an existing installment instead of logging a new one
  editing?: InvestmentPayment | null
  onClose: () => void
}

export default function InvestmentPaymentForm({ investment, editing, onClose }: InvestmentPaymentFormProps) {
  const { mutateAsync: createPayment, isPending: creating } = useCreateInvestmentPayment()
  const { mutateAsync: updatePayment, isPending: updating } = useUpdateInvestmentPayment()
  const isPending = creating || updating

  const committed = investment.committed_amount ?? 0
  const paid = investment.total_paid ?? 0
  const remaining = Math.max(0, committed - paid)

  const lastMethod = localStorage.getItem(LS_METHOD_KEY) ?? 'Cash'
  const lastAccount = localStorage.getItem(LS_ACCOUNT_KEY) ?? 'Cash'

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          amount:         editing.amount,
          payment_date:   editing.payment_date,
          payment_method: editing.payment_method ?? '',
          account:        editing.account ?? '',
          notes:          editing.notes ?? '',
        }
      : {
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

    const fields = {
      amount:         values.amount,
      payment_date:   values.payment_date,
      payment_method: values.payment_method || null,
      account:        values.account || null,
      notes:          values.notes || null,
    }
    try {
      if (editing) {
        await updatePayment({ id: editing.id, ...fields })
      } else {
        await createPayment({ investment_id: investment.id, ...fields })
      }
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
            <h2 className="ipf-title">{editing ? 'Edit installment payment' : 'Log installment payment'}</h2>
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
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <SmartAmountInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0.00"
                  className={cn('ipf-input ipf-amount', errors.amount && 'ipf-input-error')}
                  autoFocus
                />
              )}
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
            onMethodChange={(v) => setValue('payment_method', v ?? '')}
            onAccountChange={(v) => setValue('account', v ?? '')}
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
                    {editing ? 'Save changes' : 'Log payment'}
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
