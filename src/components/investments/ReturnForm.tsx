import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, formatCurrency, getActiveCurrencySymbol } from '@/lib/utils'
import { RETURN_TYPES } from '@/types/investment.types'
import { useCreateReturn } from '@/hooks/useInvestments'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import type { Investment } from '@/types/investment.types'
import './ReturnForm.css'

const schema = z.object({
  amount:         z.number().positive('Enter a valid amount'),
  return_date:    z.string().min(1, 'Select a date'),
  return_type:    z.enum(RETURN_TYPES).optional(),
  payment_method: z.string().min(1, 'Required'),
  account:        z.string().min(1, 'Required'),
  notes:          z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const LS_METHOD_KEY = 'fintrack_last_method'
const LS_ACCOUNT_KEY = 'fintrack_last_account'

interface ReturnFormProps {
  investment: Investment
  onClose: () => void
}

export default function ReturnForm({ investment, onClose }: ReturnFormProps) {
  const { mutateAsync: createReturn, isPending } = useCreateReturn()

  const lastMethod = localStorage.getItem(LS_METHOD_KEY) ?? 'Cash'
  const lastAccount = localStorage.getItem(LS_ACCOUNT_KEY) ?? 'Cash'

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { return_date: toISODateString(new Date()), payment_method: lastMethod, account: lastAccount },
  })
  const watchMethod  = watch('payment_method')
  const watchAccount = watch('account')

  async function onSubmit(values: FormValues) {
    if (values.payment_method) localStorage.setItem(LS_METHOD_KEY, values.payment_method)
    if (values.account) localStorage.setItem(LS_ACCOUNT_KEY, values.account)

    try {
      await createReturn({
        investment_id:  investment.id,
        amount:         values.amount,
        return_date:    values.return_date,
        return_type:    values.return_type ?? null,
        payment_method: values.payment_method || null,
        account:        values.account || null,
        notes:          values.notes || null,
      })
      onClose()
    } catch (err) {
      if (err instanceof DemoBlockedError) onClose()
    }
  }

  const committed = investment.committed_amount ?? 0
  const totalReturned = investment.total_returned ?? 0

  return (
    <div className="retf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="retf-panel" variants={scaleIn} initial="initial" animate="animate" exit="exit">
        <div className="retf-header">
          <div>
            <h2 className="retf-title">Log return</h2>
            <p className="retf-sub">
              {investment.name}
              {committed > 0 && (
                <> · <span className="retf-committed">Committed: {formatCurrency(committed)}</span></>
              )}
              {totalReturned > 0 && (
                <> · <span className="retf-returned">Returned so far: {formatCurrency(totalReturned)}</span></>
              )}
            </p>
          </div>
          <button className="retf-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="retf-form">
          <div className="retf-field">
            <label className="retf-label">Amount received ({getActiveCurrencySymbol()})</label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number" step="0.01" placeholder="0.00"
              className={cn('retf-input retf-amount', errors.amount && 'retf-input-error')}
              autoFocus
            />
            {errors.amount && <p className="retf-error">{errors.amount.message}</p>}
          </div>

          <div className="retf-row">
            <div className="retf-field">
              <label className="retf-label">Date</label>
              <input
                {...register('return_date')}
                type="date"
                className={cn('retf-input', errors.return_date && 'retf-input-error')}
              />
            </div>
            <div className="retf-field">
              <label className="retf-label">Type <span className="retf-optional">(optional)</span></label>
              <select {...register('return_type')} className="retf-select">
                <option value="">— None —</option>
                {RETURN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Payment method + account (where was the money received?) */}
          <div style={{ marginTop: 2 }}>
            <PaymentMethodPicker
              method={watchMethod}
              account={watchAccount}
              onMethodChange={(v) => setValue('payment_method', v ?? lastMethod)}
              onAccountChange={(v) => setValue('account', v ?? lastAccount)}
            />
          </div>

          <div className="retf-field">
            <label className="retf-label">Notes <span className="retf-optional">(optional)</span></label>
            <input {...register('notes')} className="retf-input" placeholder="e.g. Q1 dividend, partial exit" />
          </div>

          <div className="retf-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <motion.button
              type="submit"
              className="btn-primary retf-submit"
              disabled={isPending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span key="spin" className="retf-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                ) : (
                  <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Log return</motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </form>
      </motion.div>

    </div>
  )
}
