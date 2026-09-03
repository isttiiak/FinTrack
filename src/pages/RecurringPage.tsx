import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Pause, Play, Pencil, X, Repeat } from 'lucide-react'
import {
  useRecurringRules, useCreateRecurringRule, useUpdateRecurringRule, useDeleteRecurringRule,
} from '@/hooks/useRecurring'
import { useCategories } from '@/hooks/useCategories'
import { getNextOccurrence } from '@/lib/recurring'
import { RECURRING_CADENCES } from '@/lib/constants'
import type { PaymentMethod, Account } from '@/lib/constants'
import CategoryCombobox from '@/components/expenses/CategoryCombobox'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import SmartAmountInput from '@/components/common/SmartAmountInput'
import DeleteButton from '@/components/common/DeleteButton'
import ErrorBanner from '@/components/common/ErrorBanner'
import { formatCurrency, toISODateString } from '@/lib/utils'
import { fadeUp, staggerContainer, staggerItem, modalIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import type { RecurringRule } from '@/types/recurring.types'

const schema = z.object({
  type:           z.enum(['Expense', 'Income']),
  amount:         z.number().positive('Amount must be positive'),
  category_id:    z.string().min(1, 'Select a category'),
  description:    z.string().optional(),
  cadence:        z.enum(['Weekly', 'Monthly', 'Yearly']),
  start_date:     z.string().min(1, 'Select a start date'),
  end_date:       z.string().optional(),
  payment_method: z.string().min(1, 'Required'),
  account:        z.string().min(1, 'Required'),
})
type FormValues = z.infer<typeof schema>

// ── Rule form (add / edit) ──────────────────────────────────────────────────
function RecurringRuleForm({ editing, onClose }: { editing?: RecurringRule | null; onClose: () => void }) {
  const { data: categories = [] } = useCategories()
  const { mutateAsync: create, isPending: creating } = useCreateRecurringRule()
  const { mutateAsync: update, isPending: updating } = useUpdateRecurringRule()
  const isPending = creating || updating

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          type:           editing.type,
          amount:         editing.amount,
          category_id:    editing.category_id ?? '',
          description:    editing.description ?? '',
          cadence:        editing.cadence,
          start_date:     editing.start_date,
          end_date:       editing.end_date ?? '',
          payment_method: editing.payment_method ?? 'Cash',
          account:        editing.account ?? 'Cash',
        }
      : {
          type:           'Expense',
          cadence:        'Monthly',
          start_date:     toISODateString(new Date()),
          payment_method: 'Cash',
          account:        'Cash',
        },
  })

  const selectedType = watch('type')
  const filteredCategories = categories.filter((c) => c.type === selectedType)

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      description: values.description || undefined,
      end_date:    values.end_date    || undefined,
      payment_method: values.payment_method as PaymentMethod,
      account:        values.account as Account,
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
    <div className="rf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="rf-panel" variants={modalIn} initial="initial" animate="animate" exit="exit">
        <div className="rf-header">
          <h2 className="rf-title">{editing ? 'Edit recurring rule' : 'New recurring rule'}</h2>
          <button className="rf-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="rf-form">
          <div className="rf-type-toggle">
            {(['Expense', 'Income'] as const).map((t) => (
              <Controller
                key={t}
                control={control}
                name="type"
                render={({ field }) => (
                  <button
                    type="button"
                    className={cn('rf-type-btn', field.value === t && 'rf-type-btn-active')}
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

          <div className="rf-field">
            <label className="rf-label">Amount (৳) <span className="req">*</span></label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <SmartAmountInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0.00"
                  className={cn('rf-input rf-amount-input', errors.amount && 'rf-input-error')}
                />
              )}
            />
            {errors.amount && <p className="rf-error">{errors.amount.message}</p>}
          </div>

          <div className="rf-field">
            <label className="rf-label">Category <span className="req">*</span></label>
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
            {errors.category_id && <p className="rf-error">{errors.category_id.message}</p>}
          </div>

          <div className="rf-field">
            <label className="rf-label">Description <span className="rf-optional">(optional)</span></label>
            <input {...register('description')} type="text" placeholder="e.g. Netflix subscription" className="rf-input" />
          </div>

          <div className="rf-field">
            <label className="rf-label">Repeats <span className="req">*</span></label>
            <div className="rf-cadence-row">
              {RECURRING_CADENCES.map((c) => (
                <Controller
                  key={c}
                  control={control}
                  name="cadence"
                  render={({ field }) => (
                    <button
                      type="button"
                      className={cn('rf-cadence-btn', field.value === c && 'rf-cadence-btn-active')}
                      onClick={() => field.onChange(c)}
                    >
                      {c}
                    </button>
                  )}
                />
              ))}
            </div>
          </div>

          <div className="rf-row">
            <div className="rf-field">
              <label className="rf-label">Start date <span className="req">*</span></label>
              <input {...register('start_date')} type="date" className={cn('rf-input', errors.start_date && 'rf-input-error')} />
              {errors.start_date && <p className="rf-error">{errors.start_date.message}</p>}
            </div>
            <div className="rf-field">
              <label className="rf-label">End date <span className="rf-optional">(optional)</span></label>
              <input {...register('end_date')} type="date" className="rf-input" />
            </div>
          </div>

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

          <div className="rf-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary rf-submit" disabled={isPending}>
              {isPending ? 'Saving…' : editing ? 'Save changes' : 'Add rule'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function RecurringPage() {
  const navigate = useNavigate()
  const rulesQ = useRecurringRules()
  const { data: rules = [], isLoading } = rulesQ
  const { mutate: update } = useUpdateRecurringRule()
  const { mutate: deleteRule } = useDeleteRecurringRule()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringRule | null>(null)

  const today = new Date()

  function openAdd() { setEditing(null); setFormOpen(true) }
  function openEdit(rule: RecurringRule) { setEditing(rule); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditing(null) }

  return (
    <motion.div className="rp-page" variants={fadeUp} initial="initial" animate="animate">
      <button className="rp-back-btn" onClick={() => navigate({ to: '/settings' })}>
        <ArrowLeft size={16} /> Back to Settings
      </button>

      <div className="rp-header-row">
        <div>
          <h1 className="rp-title">Recurring transactions</h1>
          <p className="rp-sub">Bills and income that repeat on a schedule — added for you automatically each time they're due.</p>
        </div>
        <button className="btn-primary rp-add-btn" onClick={openAdd}>
          <Plus size={15} /> New rule
        </button>
      </div>

      {rulesQ.isError && <ErrorBanner onRetry={() => rulesQ.refetch()} />}

      {isLoading ? (
        <div className="rp-empty">Loading…</div>
      ) : rules.length === 0 ? (
        <div className="rp-empty">
          <Repeat size={28} strokeWidth={1.5} />
          <p>No recurring rules yet. Add rent, subscriptions, or your salary and FinTrack will log them for you.</p>
        </div>
      ) : (
        <motion.div className="rp-list" variants={staggerContainer} initial="initial" animate="animate">
          <AnimatePresence>
            {rules.map((rule) => {
              const next = rule.is_active ? getNextOccurrence(rule, today) : null
              return (
                <motion.div
                  key={rule.id}
                  className={cn('rp-row', !rule.is_active && 'rp-row-paused')}
                  variants={staggerItem}
                  exit={{ opacity: 0, x: -16 }}
                  layout
                >
                  <div className="rp-row-main">
                    <div className="rp-row-top">
                      <span className="rp-row-desc">{rule.description || rule.category?.name || 'Recurring rule'}</span>
                      <span className={cn('rp-row-amount', rule.type === 'Income' ? 'rp-amount-income' : 'rp-amount-expense')}>
                        {rule.type === 'Income' ? '+' : '−'}{formatCurrency(rule.amount)}
                      </span>
                    </div>
                    <div className="rp-row-meta">
                      <span>{rule.category?.name ?? 'Uncategorised'}</span>
                      <span className="rp-dot">·</span>
                      <span>{rule.cadence}</span>
                      <span className="rp-dot">·</span>
                      <span>{rule.is_active ? (next ? `Next: ${next}` : 'No more occurrences') : 'Paused'}</span>
                    </div>
                  </div>
                  <div className="rp-row-actions">
                    <button
                      className="rp-icon-btn"
                      title={rule.is_active ? 'Pause' : 'Resume'}
                      onClick={() => update({ id: rule.id, is_active: !rule.is_active })}
                    >
                      {rule.is_active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button className="rp-icon-btn" title="Edit" onClick={() => openEdit(rule)}>
                      <Pencil size={14} />
                    </button>
                    <DeleteButton
                      onConfirm={() => deleteRule(rule.id)}
                      description="This recurring rule will be removed. Transactions it already created are not affected."
                      itemName={rule.description || rule.category?.name || undefined}
                    />
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {formOpen && <RecurringRuleForm editing={editing} onClose={closeForm} />}
      </AnimatePresence>

      <style>{STYLES}</style>
    </motion.div>
  )
}

const STYLES = `
  .rp-page { max-width: 720px; }
  .rp-back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--text-muted); font-size: 13px; cursor: pointer; margin-bottom: 16px; padding: 0; transition: color 0.12s; }
  .rp-back-btn:hover { color: var(--text-primary); }
  .rp-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
  .rp-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .rp-sub { font-size: 14px; color: var(--text-secondary); margin: 0; max-width: 480px; }
  .rp-add-btn { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  .rp-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    padding: 48px 24px; text-align: center; color: var(--text-muted); font-size: 13px;
    background: var(--bg-card); border: 1px dashed var(--border); border-radius: 16px;
  }

  .rp-list { display: flex; flex-direction: column; gap: 8px; }
  .rp-row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px;
  }
  .rp-row-paused { opacity: 0.55; }
  .rp-row-main { min-width: 0; flex: 1; }
  .rp-row-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 3px; }
  .rp-row-desc { font-size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rp-row-amount { font-size: 14px; font-weight: 700; flex-shrink: 0; }
  .rp-amount-income { color: var(--accent-teal); }
  .rp-amount-expense { color: var(--accent-coral); }
  .rp-row-meta { font-size: 12px; color: var(--text-muted); display: flex; gap: 6px; align-items: center; }
  .rp-dot { opacity: 0.5; }

  .rp-row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .rp-icon-btn {
    width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
    background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .rp-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

  /* Form (mirrors ExpenseForm's ef- classes) */
  .rf-overlay {
    position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  @media (max-width: 640px) {
    .rf-overlay { align-items: flex-end; padding: 0; }
    .rf-panel { border-radius: 20px 20px 0 0 !important; max-height: 92vh; overflow-y: auto; }
  }
  .rf-panel {
    width: 100%; max-width: 460px; background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: 20px; padding: 20px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  }
  .rf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .rf-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
  .rf-close {
    width: 30px; height: 30px; border-radius: 8px; background: var(--bg-hover); border: 1px solid var(--border);
    color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
  }
  .rf-close:hover { background: var(--bg-card); color: var(--text-primary); }
  .rf-form { display: flex; flex-direction: column; gap: 14px; }
  .rf-type-toggle { display: flex; gap: 8px; }
  .rf-type-btn {
    flex: 1; padding: 9px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
    transition: background 0.15s, color 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .rf-type-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .rf-type-btn-active { color: #fff !important; border-color: transparent !important; }
  .rf-field { display: flex; flex-direction: column; gap: 5px; }
  .rf-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
  .rf-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
  .rf-input {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
    color: var(--text-primary); font-size: 14px; padding: 10px 14px; width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .rf-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(79, 169, 129,0.15); }
  .rf-input-error { border-color: var(--accent-red) !important; }
  .rf-amount-input { font-size: 20px; font-weight: 700; padding: 12px 14px; }
  .rf-error { font-size: 12px; color: #FCA5A5; margin: 0; }
  .rf-cadence-row { display: flex; gap: 8px; }
  .rf-cadence-btn {
    flex: 1; padding: 8px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .rf-cadence-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .rf-cadence-btn-active { background: rgba(79, 169, 129,0.14); border-color: var(--accent-primary); color: var(--accent-primary); }
  .rf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 400px) { .rf-row { grid-template-columns: 1fr; } }
  .rf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
  .rf-submit { min-width: 110px; min-height: 40px; }
`
