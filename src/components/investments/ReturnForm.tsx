import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, formatCurrency } from '@/lib/utils'
import { RETURN_TYPES } from '@/types/investment.types'
import { useCreateReturn } from '@/hooks/useInvestments'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import type { Investment } from '@/types/investment.types'

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
            <label className="retf-label">Amount received (৳)</label>
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

      <style>{`
        .retf-overlay {
          position: fixed; inset: 0; z-index: 60;
          background: rgba(0,0,0,0.65);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        @media (max-width: 640px) { .retf-overlay { align-items: flex-end; padding: 0; }  .retf-panel { border-radius: 20px 20px 0 0 !important; } }
        .retf-panel {
          width: 100%; max-width: 420px;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px;
          padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .retf-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
        .retf-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 3px; }
        .retf-sub { font-size: 12px; color: var(--text-muted); margin: 0; display: flex; flex-wrap: wrap; gap: 4px; }
        .retf-committed { color: var(--accent-coral); }
        .retf-returned { color: var(--accent-teal); }
        .retf-close {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .retf-close:hover { background: var(--bg-card); color: var(--text-primary); }
        .retf-form { display: flex; flex-direction: column; gap: 14px; }
        .retf-field { display: flex; flex-direction: column; gap: 5px; }
        .retf-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .retf-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .retf-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px; width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .retf-input::placeholder { color: var(--text-muted); }
        .retf-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(79, 169, 129,0.15); }
        .retf-input-error { border-color: var(--accent-red) !important; }
        .retf-amount { font-size: 22px; font-weight: 700; padding: 12px 14px; }
        .retf-error { font-size: 12px; color: #FCA5A5; margin: 0; }
        .retf-select {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px;
          width: 100%; appearance: none; cursor: pointer;
        }
        .retf-select:focus { outline: none; border-color: var(--border-focus); }
        .retf-select option { background: #18201A; }
        .retf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .retf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
        .retf-submit { min-width: 120px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .retf-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:retf-spin 0.7s linear infinite; }
        @keyframes retf-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
