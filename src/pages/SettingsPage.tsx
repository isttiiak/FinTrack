import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  DollarSign, Plus, Trash2, Download, AlertTriangle,
  ChevronDown, Check, X
} from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { useBudgets, useUpsertBudget, useDeleteBudget } from '@/hooks/useBudgets'
import { useExpenses } from '@/hooks/useExpenses'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { supabase } from '@/lib/supabase'
import { exportTransactionsExcel, exportTransactionsCSV, exportFullExcel } from '@/lib/export'
import { formatCurrency } from '@/lib/utils'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'

// ── Budget Limit Row ──────────────────────────────────────────────────────────

const budgetSchema = z.object({
  category_id:   z.string().min(1, 'Pick a category'),
  monthly_limit: z.number().positive('Must be > 0'),
})
type BudgetForm = z.infer<typeof budgetSchema>

function BudgetSection() {
  const { data: categories = [] } = useCategories('Expense')
  const { data: budgets = [], isLoading } = useBudgets()
  const { mutate: upsert, isPending: upserting } = useUpsertBudget()
  const { mutate: deleteBudget } = useDeleteBudget()
  const [addOpen, setAddOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
  })

  const existingCatIds = new Set(budgets.map((b) => b.category_id))
  const availableCategories = categories.filter((c) => !existingCatIds.has(c.id))

  function onSubmit(values: BudgetForm) {
    upsert(values, {
      onSuccess: () => {
        reset()
        setAddOpen(false)
      },
    })
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title"><DollarSign size={16} /> Budget Limits</h2>
          <p className="settings-section-desc">Set monthly spending caps per category. A warning shows at 80%, alert at 100%.</p>
        </div>
        <button className="settings-add-btn" onClick={() => setAddOpen((v) => !v)}>
          <Plus size={14} /> Add limit
        </button>
      </div>

      <AnimatePresence>
        {addOpen && (
          <motion.form
            className="budget-add-form"
            onSubmit={handleSubmit(onSubmit)}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="budget-add-inner">
              <div className="pf-field" style={{ flex: 1 }}>
                <label className="pf-label">Category</label>
                <div style={{ position: 'relative' }}>
                  <select {...register('category_id')} className="pf-select">
                    <option value="">Select…</option>
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.main_group} › {c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
                {errors.category_id && <p className="pf-error">{errors.category_id.message}</p>}
              </div>

              <div className="pf-field" style={{ width: 160 }}>
                <label className="pf-label">Monthly limit (৳)</label>
                <input {...register('monthly_limit', { valueAsNumber: true })} type="number" placeholder="e.g. 5000" className={cn('pf-input', errors.monthly_limit && 'pf-input-error')} />
                {errors.monthly_limit && <p className="pf-error">{errors.monthly_limit.message}</p>}
              </div>

              <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={() => { reset(); setAddOpen(false) }}><X size={14} /></button>
                <button type="submit" className="btn-primary" style={{ padding: '9px 16px', minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled={upserting}>
                  {upserting ? <span className="auth-spinner" /> : <><Check size={14} /> Save</>}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="budget-list">
        {isLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Loading…</div>
        ) : budgets.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No budget limits set.</div>
        ) : (
          budgets.map((b) => (
            <motion.div
              key={b.id}
              className="budget-row"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <div>
                <span className="budget-row-name">{b.category?.name ?? 'Unknown'}</span>
                <span className="budget-row-group">{b.category?.main_group}</span>
              </div>
              <div className="budget-row-right">
                <span className="budget-row-amount">{formatCurrency(b.monthly_limit)}/mo</span>
                <button
                  className="budget-delete-btn"
                  onClick={() => deleteBudget(b.id)}
                  title="Remove limit"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </section>
  )
}

// ── Export Section ────────────────────────────────────────────────────────────

function ExportSection() {
  const { data: transactions = [] } = useExpenses()
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoLedgers = useDemoStore((s) => s.ledgers)
  const demoPayments = useDemoStore((s) => s.payments)
  const demoPersons = useDemoStore((s) => s.persons)

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMon  = String(now.getMonth() + 1).padStart(2, '0')
  const from = `${thisYear}-${thisMon}-01`
  const to   = new Date(thisYear, now.getMonth() + 1, 0).toISOString().split('T')[0]

  const thisMonthTxns = transactions.filter((t) => t.txn_date >= from && t.txn_date <= to)

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title"><Download size={16} /> Data Export</h2>
          <p className="settings-section-desc">Download your data as Excel (.xlsx) or CSV. Your data, always yours.</p>
        </div>
      </div>

      <div className="export-grid">
        <div className="export-card">
          <div className="export-card-title">This month</div>
          <div className="export-card-sub">{thisMonthTxns.length} transactions</div>
          <div className="export-card-actions">
            <button className="export-btn" onClick={() => exportTransactionsExcel(thisMonthTxns, `fintrack-${thisYear}-${thisMon}`)}>
              Excel
            </button>
            <button className="export-btn export-btn-secondary" onClick={() => exportTransactionsCSV(thisMonthTxns, `fintrack-${thisYear}-${thisMon}`)}>
              CSV
            </button>
          </div>
        </div>

        <div className="export-card">
          <div className="export-card-title">All transactions</div>
          <div className="export-card-sub">{transactions.length} total</div>
          <div className="export-card-actions">
            <button className="export-btn" onClick={() => exportTransactionsExcel(transactions, 'fintrack-all-transactions')}>
              Excel
            </button>
            <button className="export-btn export-btn-secondary" onClick={() => exportTransactionsCSV(transactions, 'fintrack-all-transactions')}>
              CSV
            </button>
          </div>
        </div>

        <div className="export-card export-card-full">
          <div className="export-card-title">Full export</div>
          <div className="export-card-sub">Transactions + Ledger + Persons — all sheets in one Excel file</div>
          <div className="export-card-actions">
            <button
              className="export-btn"
              onClick={() => exportFullExcel(
                transactions,
                isDemo ? demoPersons : [],
                isDemo ? demoLedgers : [],
                isDemo ? demoPayments : [],
                'fintrack-full-export',
              )}
            >
              Download Full Excel
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Account Deletion ──────────────────────────────────────────────────────────

function DangerSection() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'typing'>('idle')
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const { profile } = useAuthStore()
  const { data: transactions = [] } = useExpenses()

  async function handleDelete() {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', profile!.id)
    await supabase.auth.signOut()
  }

  return (
    <section className="settings-section settings-danger-section">
      <h2 className="settings-section-title" style={{ color: 'var(--accent-red)' }}>
        <AlertTriangle size={16} /> Danger Zone
      </h2>

      <AnimatePresence mode="wait">
        {step === 'idle' && (
          <motion.div key="idle" variants={fadeUp} initial="initial" animate="animate">
            <p className="settings-section-desc">
              Permanently delete your account and all data. You have a 30-day recovery window after deletion.
            </p>
            <button className="danger-btn" onClick={() => setStep('confirm')}>
              Delete my account
            </button>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div key="confirm" className="danger-confirm-card" variants={fadeUp} initial="initial" animate="animate">
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Before you go — you have <strong style={{ color: 'var(--text-primary)' }}>{transactions.length} transactions</strong>. Want to export your data first?
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <button className="export-btn" onClick={() => exportTransactionsExcel(transactions)}>
                <Download size={13} /> Export Excel
              </button>
              <button className="export-btn export-btn-secondary" onClick={() => exportTransactionsCSV(transactions)}>
                <Download size={13} /> Export CSV
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="danger-btn" onClick={() => setStep('typing')}>Continue to delete</button>
              <button className="btn-ghost" onClick={() => setStep('idle')}>Cancel</button>
            </div>
          </motion.div>
        )}

        {step === 'typing' && (
          <motion.div key="typing" className="danger-confirm-card" variants={fadeUp} initial="initial" animate="animate">
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Type <strong style={{ color: 'var(--accent-red)' }}>DELETE</strong> to confirm account deletion.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="pf-input"
              style={{ marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="danger-btn"
                disabled={confirmText !== 'DELETE' || deleting}
                onClick={handleDelete}
                style={{ opacity: confirmText !== 'DELETE' ? 0.4 : 1 }}
              >
                {deleting ? <span className="auth-spinner" /> : 'Delete account'}
              </button>
              <button className="btn-ghost" onClick={() => { setStep('idle'); setConfirmText('') }}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ── Main Settings Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const isDemo = useDemoStore((s) => s.isDemo)

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="settings-page"
    >
      <motion.div variants={staggerItem} style={{ marginBottom: 28 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Budget limits, data export, and account management</p>
      </motion.div>

      {isDemo && (
        <motion.div className="demo-notice" variants={staggerItem}>
          Settings are read-only in demo mode.
        </motion.div>
      )}

      <motion.div variants={staggerItem}><BudgetSection /></motion.div>
      <motion.div variants={staggerItem}><ExportSection /></motion.div>
      {!isDemo && <motion.div variants={staggerItem}><DangerSection /></motion.div>}

      <style>{settingsStyles}</style>
    </motion.div>
  )
}

const settingsStyles = `
  .settings-page { max-width: 820px; padding-bottom: 48px; }
  .page-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }

  .demo-notice {
    margin-bottom: 20px; padding: 10px 16px;
    background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.2); border-radius: 10px;
    font-size: 13px; color: var(--accent-primary);
  }

  .settings-section {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
    padding: 24px; margin-bottom: 20px;
  }
  .settings-danger-section { border-color: rgba(239,68,68,0.2); }
  .settings-section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .settings-section-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
  .settings-section-desc { font-size: 13px; color: var(--text-secondary); margin: 0; }
  .settings-add-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px; font-size: 13px;
    background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.25); color: var(--accent-primary);
    cursor: pointer; transition: background 0.15s; flex-shrink: 0;
  }
  .settings-add-btn:hover { background: rgba(108,99,255,0.18); }

  .budget-add-form { overflow: hidden; }
  .budget-add-inner {
    display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap;
    padding: 16px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px;
    margin-bottom: 14px;
  }

  .budget-list { display: flex; flex-direction: column; gap: 8px; }
  .budget-row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 10px 14px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px;
  }
  .budget-row-name { font-size: 14px; font-weight: 500; color: var(--text-primary); margin-right: 8px; }
  .budget-row-group { font-size: 11px; color: var(--text-muted); }
  .budget-row-right { display: flex; align-items: center; gap: 10px; }
  .budget-row-amount { font-size: 13px; font-weight: 600; color: var(--accent-primary); }
  .budget-delete-btn {
    width: 28px; height: 28px; border-radius: 7px;
    background: none; border: 1px solid var(--border); color: var(--text-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .budget-delete-btn:hover { background: rgba(239,68,68,0.1); color: var(--accent-red); border-color: rgba(239,68,68,0.3); }

  .export-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .export-card {
    padding: 16px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 12px;
  }
  .export-card-full { grid-column: 1 / -1; }
  .export-card-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
  .export-card-sub { font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; }
  .export-card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .export-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 500;
    background: linear-gradient(135deg, #6C63FF, #A855F7); color: #fff;
    border: none; cursor: pointer;
    transition: opacity 0.15s, box-shadow 0.15s;
  }
  .export-btn:hover { opacity: 0.9; box-shadow: 0 4px 14px rgba(108,99,255,0.35); }
  .export-btn-secondary {
    background: var(--bg-card); color: var(--text-secondary);
    border: 1px solid var(--border);
  }
  .export-btn-secondary:hover { background: var(--bg-hover); color: var(--text-primary); box-shadow: none; }

  .danger-btn {
    padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
    background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35); color: var(--accent-red);
    cursor: pointer; transition: background 0.15s; display: inline-flex; align-items: center; gap: 8px;
    min-height: 38px; min-width: 120px; justify-content: center;
  }
  .danger-btn:hover:not(:disabled) { background: rgba(239,68,68,0.22); }
  .danger-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .danger-confirm-card {
    padding: 16px; background: var(--bg-elevated);
    border: 1px solid rgba(239,68,68,0.2); border-radius: 12px;
  }

  /* shared field styles referenced from sub-components */
  .pf-field { display: flex; flex-direction: column; gap: 5px; }
  .pf-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
  .pf-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
  .pf-input {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
    color: var(--text-primary); font-size: 14px; padding: 10px 14px;
    transition: border-color 0.15s, box-shadow 0.15s; width: 100%;
  }
  .pf-input::placeholder { color: var(--text-muted); }
  .pf-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
  .pf-input-error { border-color: var(--accent-red) !important; }
  .pf-error { font-size: 12px; color: #FCA5A5; margin: 0; }
  .pf-select {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
    color: var(--text-primary); font-size: 14px; padding: 10px 36px 10px 14px;
    width: 100%; cursor: pointer; appearance: none;
  }
  .pf-select:focus { outline: none; border-color: var(--border-focus); }
  .auth-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`
