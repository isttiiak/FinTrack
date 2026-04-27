import { useState, useRef } from 'react'
import type React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Papa from 'papaparse'
import { useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, Plus, Download, AlertTriangle,
  ChevronDown, Check, X, Upload, Sparkles, Eye, EyeOff,
} from 'lucide-react'
import DeleteButton from '@/components/common/DeleteButton'
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
                <DeleteButton
                  onConfirm={() => deleteBudget(b.id)}
                  className="budget-delete-btn"
                  iconSize={14}
                />
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

// ── Import Section ────────────────────────────────────────────────────────────

const CSV_HEADERS = ['Date', 'Type', 'Amount', 'Category', 'Description', 'Payment Method', 'Account']
const TEMPLATE_CSV = [
  CSV_HEADERS.join(','),
  '2026-04-01,Expense,500,Food,Lunch at restaurant,Cash,Cash',
  '2026-04-02,Income,15000,Income,Monthly salary,Bank Transfer,BRAC Bank Savings',
].join('\n')

function ImportSection() {
  const { data: allCategories = [] } = useCategories()
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<number | null>(null)

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'fintrack-import-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(file: File) {
    setError(null); setImported(null); setPreview([])
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data
        if (rows.length === 0) { setError('No data rows found in the file.'); return }
        const missing = CSV_HEADERS.filter((h) => !(h in (rows[0] ?? {})))
        if (missing.length > 0) {
          setError(`Missing columns: ${missing.join(', ')}. Use the template.`)
          return
        }
        setPreview(rows.slice(0, 5))
      },
      error: () => setError('Could not parse CSV. Make sure it uses commas as separators.'),
    })
  }

  async function handleImport() {
    if (!userId || isDemo || preview.length === 0 || !fileName) return
    setImporting(true); setError(null)

    // Re-parse full file
    const input = fileRef.current?.files?.[0]
    if (!input) { setImporting(false); return }

    Papa.parse<Record<string, string>>(input, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data
          const catMap: Record<string, string> = {}
          allCategories.forEach((c) => { catMap[c.name.toLowerCase()] = c.id })
          const othersId = allCategories.find((c) => c.name === 'Others')?.id ?? null

          const txns = rows.map((r) => ({
            user_id: userId,
            txn_date: r['Date']?.trim() ?? '',
            type: r['Type']?.trim() === 'Income' ? 'Income' : 'Expense',
            amount: parseFloat(r['Amount']?.replace(/,/g, '') ?? '0') || 0,
            category_id: catMap[r['Category']?.trim().toLowerCase() ?? ''] ?? othersId,
            description: r['Description']?.trim() || null,
            payment_method: r['Payment Method']?.trim() || null,
            account: r['Account']?.trim() || null,
            no_spend_flag: false,
          })).filter((t) => t.txn_date && t.amount > 0)

          if (txns.length === 0) { setError('No valid rows to import.'); setImporting(false); return }

          const { error: dbErr } = await supabase.from('transactions').insert(txns)
          if (dbErr) throw dbErr

          await qc.invalidateQueries({ queryKey: ['expenses'] })
          setImported(txns.length)
          setPreview([])
          setFileName(null)
          if (fileRef.current) fileRef.current.value = ''
        } catch (e) {
          setError('Import failed. Check your data and try again.')
        } finally {
          setImporting(false)
        }
      },
    })
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title"><Upload size={16} /> Import Expenses</h2>
          <p className="settings-section-desc">
            Import transactions from a CSV file.{' '}
            <button className="import-template-link" onClick={downloadTemplate}>Download template</button>{' '}
            to see the required format.
          </p>
        </div>
      </div>

      {isDemo && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 0 }}>
          Import is disabled in demo mode.
        </p>
      )}

      {!isDemo && (
        <>
          <div
            className="import-drop-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <Upload size={20} style={{ color: 'var(--text-muted)' }} />
            <span className="import-drop-text">
              {fileName ? fileName : 'Click or drag a CSV file here'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>

          {error && <p className="import-error">{error}</p>}

          {imported !== null && (
            <motion.div
              className="import-success"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Check size={14} /> Successfully imported {imported} transaction{imported !== 1 ? 's' : ''}!
            </motion.div>
          )}

          {preview.length > 0 && (
            <div className="import-preview">
              <div className="import-preview-title">Preview (first {preview.length} rows)</div>
              <div className="import-preview-table-wrap">
                <table className="import-preview-table">
                  <thead>
                    <tr>
                      {CSV_HEADERS.map((h) => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {CSV_HEADERS.map((h) => <td key={h}>{row[h] ?? ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? <span className="auth-spinner" /> : <><Upload size={14} /> Import transactions</>}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ── AI Analytics Section ──────────────────────────────────────────────────────

type AIProvider = 'gemini' | 'groq'

const AI_PROVIDERS: { id: AIProvider; name: string; badge: string; placeholder: string; hint: string; free: string }[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: '15 req/min free',
    placeholder: 'AIzaSy…',
    hint: 'Get a free key at ai.google.dev → Get API key → Create API key in new project.',
    free: '1M tokens/day, no card needed',
  },
  {
    id: 'groq',
    name: 'Groq',
    badge: '⚡ Fastest',
    placeholder: 'gsk_…',
    hint: 'Get a free key at console.groq.com → API Keys → Create API key. Sign up is free.',
    free: '14,400 req/day free — ~10× faster than Gemini',
  },
]

function AISection() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('ai_insights_enabled') === 'true')
  const [provider, setProvider] = useState<AIProvider>(
    () => (localStorage.getItem('ai_provider') as AIProvider) ?? 'groq',
  )
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gemini_api_key') ?? '')
  const [groqKey,   setGroqKey]   = useState(() => localStorage.getItem('groq_api_key')   ?? '')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const currentKey   = provider === 'gemini' ? geminiKey   : groqKey
  const setCurrentKey = provider === 'gemini' ? setGeminiKey : setGroqKey
  const providerMeta = AI_PROVIDERS.find((p) => p.id === provider)!

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    localStorage.setItem('ai_insights_enabled', String(next))
  }

  function handleProviderChange(p: AIProvider) {
    setProvider(p)
    localStorage.setItem('ai_provider', p)
    setShowKey(false)
  }

  function handleSaveKey() {
    localStorage.setItem(`${provider}_api_key`, currentKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title"><Sparkles size={16} /> AI Insights (Beta)</h2>
          <p className="settings-section-desc">
            Get AI-powered spending analysis on the Analytics page.
            Both providers are free — no credit card required.
          </p>
        </div>
        <button
          className={`ai-toggle ${enabled ? 'ai-toggle-on' : ''}`}
          onClick={handleToggle}
          aria-label="Toggle AI insights"
        >
          <span className="ai-toggle-knob" />
        </button>
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            className="ai-key-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div style={{ padding: '16px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Provider selector */}
              <div>
                <label className="pf-label" style={{ marginBottom: 8, display: 'block' }}>AI Provider</label>
                <div className="ai-provider-row">
                  {AI_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`ai-provider-btn ${provider === p.id ? 'ai-provider-active' : ''}`}
                      onClick={() => handleProviderChange(p.id)}
                    >
                      <span className="ai-provider-name">{p.name}</span>
                      <span className={`ai-provider-badge ${p.id === 'groq' ? 'ai-badge-groq' : 'ai-badge-gemini'}`}>
                        {p.badge}
                      </span>
                      <span className="ai-provider-free">{p.free}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key field */}
              <div>
                <label className="pf-label" style={{ marginBottom: 6, display: 'block' }}>
                  {providerMeta.name} API Key
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <input
                      type={showKey ? 'text' : 'password'}
                      className="pf-input"
                      placeholder={providerMeta.placeholder}
                      value={currentKey}
                      onChange={(e) => setCurrentKey(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                        display: 'flex', padding: 0,
                      }}
                      onClick={() => setShowKey((v) => !v)}
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                    onClick={handleSaveKey}
                    disabled={!currentKey.trim()}
                  >
                    {saved ? <><Check size={14} /> Saved!</> : 'Save key'}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '7px 0 0' }}>
                  {providerMeta.hint}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', opacity: 0.7 }}>
                  Stored in this browser only — never sent to any server except the AI provider directly.
                </p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [showDataSettings, setShowDataSettings] = useState(false)

  // Lazy import to keep initial bundle small
  const [DataSettingsPage, setDataSettingsPage] = useState<React.ComponentType<{ onClose: () => void }> | null>(null)
  function openDataSettings() {
    import('@/pages/DataSettingsPage').then((mod) => {
      setDataSettingsPage(() => mod.default)
      setShowDataSettings(true)
    })
  }

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

      {/* Data Preferences card */}
      <motion.div variants={staggerItem}>
        <section className="settings-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 className="settings-section-title">⚙️ Data Preferences</h2>
            <p className="settings-section-desc">
              Manage your categories (main groups & sub-categories), payment methods, and bank accounts.
            </p>
          </div>
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
            onClick={openDataSettings}
          >
            Manage →
          </button>
        </section>
      </motion.div>

      <motion.div variants={staggerItem}><BudgetSection /></motion.div>
      <motion.div variants={staggerItem}><AISection /></motion.div>
      <motion.div variants={staggerItem}><ExportSection /></motion.div>
      <motion.div variants={staggerItem}><ImportSection /></motion.div>
      {!isDemo && <motion.div variants={staggerItem}><DangerSection /></motion.div>}

      {/* Data settings slide-in panel */}
      <AnimatePresence>
        {showDataSettings && DataSettingsPage && (
          <DataSettingsPage onClose={() => setShowDataSettings(false)} />
        )}
      </AnimatePresence>

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

  /* Import */
  .import-template-link {
    background: none; border: none; padding: 0; cursor: pointer;
    color: var(--accent-primary); font-size: inherit; text-decoration: underline;
    text-underline-offset: 2px;
  }
  .import-template-link:hover { opacity: 0.8; }
  .import-drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    padding: 28px 20px; border: 2px dashed var(--border); border-radius: 12px;
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
    background: var(--bg-elevated);
  }
  .import-drop-zone:hover { border-color: var(--accent-primary); background: rgba(108,99,255,0.04); }
  .import-drop-text { font-size: 13px; color: var(--text-muted); }
  .import-error { font-size: 12px; color: #FCA5A5; margin: 8px 0 0; }
  .import-success {
    display: flex; align-items: center; gap: 6px; margin-top: 10px;
    font-size: 13px; font-weight: 500; color: var(--accent-teal);
  }
  .import-preview { margin-top: 12px; }
  .import-preview-title { font-size: 12px; font-weight: 500; color: var(--text-muted); margin-bottom: 8px; }
  .import-preview-table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--border); }
  .import-preview-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .import-preview-table th {
    background: var(--bg-elevated); color: var(--text-muted); font-weight: 600;
    padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.05em; border-bottom: 1px solid var(--border);
  }
  .import-preview-table td {
    padding: 8px 12px; color: var(--text-secondary); border-bottom: 1px solid rgba(42,42,74,0.4);
  }
  .import-preview-table tr:last-child td { border-bottom: none; }

  /* AI toggle */
  .ai-toggle {
    width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
    background: var(--bg-elevated); border: 1px solid var(--border);
    position: relative; transition: background 0.2s, border-color 0.2s; flex-shrink: 0;
    padding: 0;
  }
  .ai-toggle-on { background: linear-gradient(135deg,#6C63FF,#A855F7); border-color: transparent; }
  .ai-toggle-knob {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%; background: var(--text-muted);
    transition: transform 0.2s, background 0.2s;
  }
  .ai-toggle-on .ai-toggle-knob { transform: translateX(20px); background: #fff; }
  .ai-key-section { overflow: hidden; }

  /* AI provider selector */
  .ai-provider-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .ai-provider-btn {
    flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
    padding: 12px 14px; border-radius: 12px; cursor: pointer; text-align: left;
    background: var(--bg-elevated); border: 2px solid var(--border);
    transition: border-color 0.15s, background 0.15s;
  }
  .ai-provider-btn:hover { border-color: rgba(108,99,255,0.3); background: rgba(108,99,255,0.04); }
  .ai-provider-active { border-color: var(--accent-primary) !important; background: rgba(108,99,255,0.07) !important; }
  .ai-provider-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
  .ai-provider-badge {
    font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px;
    letter-spacing: 0.02em;
  }
  .ai-badge-groq { background: rgba(16,185,129,0.15); color: var(--accent-teal); }
  .ai-badge-gemini { background: rgba(108,99,255,0.12); color: var(--accent-primary); }
  .ai-provider-free { font-size: 11px; color: var(--text-muted); }
`
