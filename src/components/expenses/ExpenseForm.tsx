import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Repeat } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { useCreateExpense, useUpdateExpense } from '@/hooks/useExpenses'
import { useCreateRecurringRule } from '@/hooks/useRecurring'
import { useAICategorySuggest } from '@/hooks/useAICategorySuggest'
import { TXN_TYPES, RECURRING_CADENCES } from '@/lib/constants'
import type { PaymentMethod, Account, RecurringCadence } from '@/lib/constants'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import SmartAmountInput from '@/components/common/SmartAmountInput'
import { toISODateString, getActiveCurrencySymbol } from '@/lib/utils'
import { scaleIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types/expense.types'
import CategoryCombobox from '@/components/expenses/CategoryCombobox'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import { useIsExpensesOnly } from '@/hooks/useTrackingMode'
import './ExpenseForm.css'

const schema = z.object({
  type:           z.enum(['Expense', 'Income']),
  amount:         z.number().positive('Amount must be positive'),
  category_id:    z.string().min(1, 'Select a category'),
  description:    z.string().optional(),
  txn_date:       z.string().min(1, 'Select a date'),
  payment_method: z.string().min(1, 'Required'),
  account:        z.string().min(1, 'Required'),
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
  const { mutateAsync: createRule } = useCreateRecurringRule()
  const isPending = creating || updating

  // In Expenses-only mode, don't offer switching a transaction to Income —
  // except an already-Income transaction being edited, so it stays visible
  // and editable rather than silently stuck. New transactions and existing
  // Expense ones simply never see the toggle.
  const isExpensesOnly = useIsExpensesOnly()
  const showTypeToggle = !isExpensesOnly || editing?.type === 'Income'

  // Only offered when adding a new transaction — editing an existing one
  // doesn't retroactively make sense as "the start of a recurring rule".
  const [makeRecurring, setMakeRecurring] = useState(false)
  const [recurringCadence, setRecurringCadence] = useState<RecurringCadence>('Monthly')

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

  const selectedType  = watch('type')
  const description   = watch('description') ?? ''
  const categoryId    = watch('category_id')

  const filteredCategories = categories.filter((c) => c.type === selectedType)

  const { suggestedCategory, loading: suggestLoading, dismiss: dismissSuggest } =
    useAICategorySuggest(description, filteredCategories, categoryId)

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
    try {
      if (editing) {
        await update({ id: editing.id, ...payload })
      } else {
        await create(payload)
        if (makeRecurring) {
          // start_date = this transaction's own date — it's the first
          // occurrence and already exists, so last_materialized_date is set
          // to match rather than left null, or the next "materialize on app
          // open" would immediately create a duplicate for today.
          await createRule({
            type: payload.type,
            amount: payload.amount,
            category_id: payload.category_id,
            description: payload.description ?? undefined,
            cadence: recurringCadence,
            start_date: payload.txn_date,
            payment_method: payload.payment_method ?? undefined,
            account: payload.account ?? undefined,
            last_materialized_date: payload.txn_date,
          })
        }
      }
      onClose()
    } catch (err) {
      // Demo-blocked edits have nothing further to do (the toast already
      // explained it) — close like a normal save. Real errors leave the
      // form open with the entered values so the user can retry.
      if (err instanceof DemoBlockedError) onClose()
    }
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
          {/* Type toggle — hidden in Expenses-only mode, see showTypeToggle above */}
          {showTypeToggle && (
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
                          ? 'linear-gradient(135deg, #C9736E, #C25B55)'
                          : 'linear-gradient(135deg, #4FA981, #3E9B72)',
                      } : undefined}
                    >
                      {t === 'Expense' ? '📉' : '📈'} {t}
                    </button>
                  )}
                />
              ))}
            </div>
          )}

          {/* Amount */}
          <div className="ef-field">
            <label className="ef-label">Amount ({getActiveCurrencySymbol()}) <span className="req">*</span></label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <SmartAmountInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0.00"
                  className={cn('ef-input ef-amount-input', errors.amount && 'ef-input-error')}
                  autoFocus={!editing}
                />
              )}
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

          {/* Description + AI category hint */}
          <div className="ef-field">
            <label className="ef-label">Description <span className="ef-optional">(optional)</span></label>
            <input
              {...register('description')}
              type="text"
              placeholder="e.g. Lunch at office"
              className="ef-input"
            />
            <AnimatePresence>
              {(suggestLoading || suggestedCategory) && !categoryId && (
                <motion.div
                  className="ef-ai-hint"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {suggestLoading ? (
                    <span className="ef-ai-loading">✨ Detecting category…</span>
                  ) : suggestedCategory ? (
                    <>
                      <span className="ef-ai-label">✨ AI suggests:</span>
                      <button
                        type="button"
                        className="ef-ai-chip"
                        onClick={() => { setValue('category_id', suggestedCategory.id); dismissSuggest() }}
                      >
                        {suggestedCategory.main_group} › {suggestedCategory.name}
                      </button>
                      <button type="button" className="ef-ai-dismiss" onClick={dismissSuggest}>✕</button>
                    </>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
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

          {/* Make recurring — only offered when adding, not editing */}
          {!editing && (
            <div className="ef-field">
              <button
                type="button"
                className={cn('ef-recur-toggle', makeRecurring && 'ef-recur-toggle-active')}
                onClick={() => setMakeRecurring((v) => !v)}
              >
                <Repeat size={14} /> Make this recurring
              </button>
              <AnimatePresence>
                {makeRecurring && (
                  <motion.div
                    className="ef-recur-cadence-row"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {RECURRING_CADENCES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={cn('ef-recur-cadence-btn', recurringCadence === c && 'ef-recur-cadence-btn-active')}
                        onClick={() => setRecurringCadence(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

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

    </div>
  )
}
