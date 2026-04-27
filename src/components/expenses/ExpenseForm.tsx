import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { useCreateExpense, useUpdateExpense } from '@/hooks/useExpenses'
import { TXN_TYPES } from '@/lib/constants'
import type { PaymentMethod, Account } from '@/lib/constants'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import { toISODateString } from '@/lib/utils'
import { scaleIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types/expense.types'
import CategoryCombobox from '@/components/expenses/CategoryCombobox'

const schema = z.object({
  type:           z.enum(['Expense', 'Income']),
  amount:         z.number().positive('Amount must be positive'),
  category_id:    z.string().min(1, 'Select a category'),
  description:    z.string().optional(),
  txn_date:       z.string().min(1, 'Select a date'),
  payment_method: z.string().optional(),
  account:        z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const LS_METHOD_KEY = 'fintrack_last_method'
const LS_ACCOUNT_KEY = 'fintrack_last_account'

interface ExpenseFormProps {
  editing?: Transaction | null
  defaultType?: 'Expense' | 'Income'
  onClose: () => void
}

export default function ExpenseForm({ editing, defaultType = 'Expense', onClose }: ExpenseFormProps) {
  const { data: categories = [] } = useCategories()
  const { mutateAsync: create, isPending: creating } = useCreateExpense()
  const { mutateAsync: update, isPending: updating } = useUpdateExpense()
  const isPending = creating || updating

  const lastMethod = (localStorage.getItem(LS_METHOD_KEY) ?? 'Cash') as FormValues['payment_method']
  const lastAccount = (localStorage.getItem(LS_ACCOUNT_KEY) ?? 'Cash') as FormValues['account']

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          type:           editing.type,
          amount:         editing.amount,
          category_id:    editing.category_id ?? '',
          description:    editing.description ?? '',
          txn_date:       editing.txn_date,
          payment_method: editing.payment_method ?? lastMethod,
          account:        editing.account ?? lastAccount,
        }
      : {
          type:           defaultType,
          txn_date:       toISODateString(new Date()),
          payment_method: lastMethod,
          account:        lastAccount,
        },
  })

  const selectedType = watch('type')

  const filteredCategories = categories.filter((c) => c.type === selectedType)

  useEffect(() => {
    if (!editing) setValue('category_id', '')
  }, [selectedType, editing, setValue])

  async function onSubmit(values: FormValues) {
    if (values.payment_method) localStorage.setItem(LS_METHOD_KEY, values.payment_method)
    if (values.account) localStorage.setItem(LS_ACCOUNT_KEY, values.account)

    const payload = {
      ...values,
      description:    values.description    ?? null,
      payment_method: (values.payment_method ?? null) as PaymentMethod | null,
      account:        (values.account        ?? null) as Account | null,
    }
    if (editing) {
      await update({ id: editing.id, ...payload })
    } else {
      await create(payload)
    }
    onClose()
  }

  return (
    <div className="expense-form-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="expense-form-panel"
        variants={scaleIn}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header */}
        <div className="ef-header">
          <h2 className="ef-title">{editing ? 'Edit transaction' : 'Add transaction'}</h2>
          <button className="ef-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="ef-form">
          {/* Type toggle */}
          <div className="ef-type-toggle">
            {TXN_TYPES.map((t) => (
              <Controller
                key={t}
                control={control}
                name="type"
                render={({ field }) => (
                  <button
                    type="button"
                    className={cn('ef-type-btn', field.value === t && 'ef-type-btn-active')}
                    onClick={() => field.onChange(t)}
                    style={field.value === t ? {
                      background: t === 'Expense'
                        ? 'linear-gradient(135deg, #F97316, #EF4444)'
                        : 'linear-gradient(135deg, #10B981, #06B6D4)',
                    } : undefined}
                  >
                    {t === 'Expense' ? '📉' : '📈'} {t}
                  </button>
                )}
              />
            ))}
          </div>

          {/* Amount */}
          <div className="ef-field">
            <label className="ef-label">Amount (৳) <span className="req">*</span></label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="0.00"
              className={cn('ef-input ef-amount-input', errors.amount && 'ef-input-error')}
              autoFocus={!editing}
            />
            {errors.amount && <p className="ef-error">{errors.amount.message}</p>}
          </div>

          {/* Category */}
          <div className="ef-field">
            <label className="ef-label">Category <span className="req">*</span></label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <CategoryCombobox
                  value={field.value}
                  onChange={field.onChange}
                  categories={filteredCategories}
                  txnType={selectedType}
                  error={!!errors.category_id}
                />
              )}
            />
            {errors.category_id && <p className="ef-error">{errors.category_id.message}</p>}
          </div>

          {/* Description */}
          <div className="ef-field">
            <label className="ef-label">Description <span className="ef-optional">(optional)</span></label>
            <input
              {...register('description')}
              type="text"
              placeholder="e.g. Lunch at office"
              className="ef-input"
            />
          </div>

          {/* Date */}
          <div className="ef-field">
            <label className="ef-label">Date <span className="req">*</span></label>
            <input
              {...register('txn_date')}
              type="date"
              className={cn('ef-input', errors.txn_date && 'ef-input-error')}
            />
            {errors.txn_date && <p className="ef-error">{errors.txn_date.message}</p>}
          </div>

          {/* Payment method + Account — linked picker */}
          <Controller
            control={control}
            name="payment_method"
            render={({ field: mField }) => (
              <Controller
                control={control}
                name="account"
                render={({ field: aField }) => (
                  <PaymentMethodPicker
                    method={mField.value as PaymentMethod | undefined}
                    account={aField.value as Account | undefined}
                    onMethodChange={mField.onChange}
                    onAccountChange={aField.onChange}
                  />
                )}
              />
            )}
          />

          {/* Actions */}
          <div className="ef-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <motion.button
              type="submit"
              className="btn-primary ef-submit"
              disabled={isPending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span key="spin" className="auth-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                ) : (
                  <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {editing ? 'Save changes' : 'Save'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </form>
      </motion.div>

      <style>{`
        .expense-form-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        @media (max-width: 640px) {
          .expense-form-overlay { align-items: flex-end; padding: 0; }
          .expense-form-panel { border-radius: 20px 20px 0 0 !important; max-height: 92vh; overflow-y: auto; }
        }

        .expense-form-panel {
          width: 100%; max-width: 460px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        @media (max-width: 400px) { .expense-form-panel { padding: 14px; } }

        .ef-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .ef-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .ef-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .ef-close:hover { background: var(--bg-card); color: var(--text-primary); }

        .ef-form { display: flex; flex-direction: column; gap: 14px; }

        .ef-type-toggle { display: flex; gap: 8px; }
        .ef-type-btn {
          flex: 1; padding: 9px 12px; border-radius: 10px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-secondary);
          transition: background 0.15s, color 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .ef-type-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ef-type-btn-active { color: #fff !important; border-color: transparent !important; }

        .ef-field { display: flex; flex-direction: column; gap: 5px; }
        .ef-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .ef-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }

        .ef-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px;
          transition: border-color 0.15s, box-shadow 0.15s; width: 100%;
        }
        .ef-input::placeholder { color: var(--text-muted); }
        .ef-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
        .ef-input-error { border-color: var(--accent-red) !important; }
        .ef-amount-input { font-size: 22px; font-weight: 700; padding: 12px 14px; }
        .ef-error { font-size: 12px; color: #FCA5A5; margin: 0; }

        .ef-select-wrap { position: relative; }
        .ef-select {
          width: 100%; appearance: none;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 36px 10px 14px;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ef-select:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
        .ef-select option, .ef-select optgroup { background: #1E1E38; color: var(--text-primary); }
        .ef-select-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

        .ef-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 400px) { .ef-row { grid-template-columns: 1fr; } }

        .ef-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
        .ef-submit { min-width: 110px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .auth-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
