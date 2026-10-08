import { useForm, Controller } from 'react-hook-form'
import SmartAmountInput from '@/components/common/SmartAmountInput'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, formatCurrency, getActiveCurrencySymbol, round2 } from '@/lib/utils'
import type { PaymentMethod, Account } from '@/lib/constants'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import { useCreatePayment, useUpdatePayment } from '@/hooks/useLedger'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import type { LedgerType } from '@/lib/constants'
import type { LedgerPayment } from '@/types/ledger.types'
import './PaymentForm.css'

const schema = z.object({
  amount:         z.number({ error: 'Enter a valid amount' }).positive(),
  payment_date:   z.string().min(1, 'Select a date'),
  payment_method: z.string().optional(),
  account:        z.string().optional(),
  notes:          z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface PaymentFormProps {
  personId: string
  personName: string
  ledgerType: LedgerType
  remaining: number
  // Edit an existing payment instead of logging a new one
  editing?: LedgerPayment | null
  onClose: () => void
}

export default function PaymentForm({ personId, personName, ledgerType, remaining, editing, onClose }: PaymentFormProps) {
  const { mutateAsync: createPayment, isPending: creating } = useCreatePayment()
  const { mutateAsync: updatePayment, isPending: updating } = useUpdatePayment()
  const isPending = creating || updating
  // The payment being edited is already counted in `remaining`, so it can grow back up to it
  const maxAmount = editing ? round2(remaining + editing.amount) : remaining

  const { register, control, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<FormValues>({
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
          amount:         remaining,
          payment_date:   toISODateString(new Date()),
          payment_method: 'Cash',
          account:        'Cash',
        },
  })

  const paymentMethod = watch('payment_method')
  const accountValue  = watch('account')

  async function onSubmit(values: FormValues) {
    if (values.amount > maxAmount) {
      setError('amount', { message: `Cannot exceed remaining balance of ${formatCurrency(maxAmount)}` })
      return
    }
    const fields = {
      amount:         values.amount,
      payment_date:   values.payment_date,
      payment_method: (values.payment_method || null) as PaymentMethod | null,
      account:        (values.account || null) as Account | null,
      notes:          values.notes || null,
    }
    try {
      if (editing) {
        await updatePayment({ id: editing.id, ...fields })
      } else {
        await createPayment({ person_id: personId, ledger_type: ledgerType, ...fields })
      }
      onClose()
    } catch (err) {
      if (err instanceof DemoBlockedError) onClose()
    }
  }

  return (
    <div className="payf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="payf-panel" variants={scaleIn} initial="initial" animate="animate" exit="exit">
        <div className="payf-header">
          <div>
            <h2 className="payf-title">{editing ? 'Edit payment' : 'Log payment'} — {personName}</h2>
            <p className="payf-sub">
              {ledgerType === 'Lent' ? 'They paid you back' : 'You paid them'}
              {' · '}
              <span className="payf-remaining">{editing ? 'Up to' : 'Remaining'}: {formatCurrency(maxAmount)}</span>
            </p>
          </div>
          <button aria-label="Close" className="payf-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="payf-form">
          <div className="payf-field">
            <label className="payf-label">Amount ({getActiveCurrencySymbol()})</label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <SmartAmountInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0.00"
                  className={cn('payf-input payf-amount-input', errors.amount && 'payf-input-error')}
                  autoFocus
                />
              )}
            />
            {errors.amount && <p className="payf-error">{errors.amount.message}</p>}
          </div>

          <div className="payf-field">
            <label className="payf-label">Date</label>
            <input aria-label="Date"
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
              onMethodChange={(v) => setValue('payment_method', v ?? '')}
              onAccountChange={(v) => setValue('account', v ?? '')}
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
