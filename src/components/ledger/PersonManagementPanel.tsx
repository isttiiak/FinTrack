import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Edit2, Check, X, Users, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { usePersons, useCreatePerson, useUpdatePerson, useDeletePerson } from '@/hooks/useLedger'
import { useConfirmStore } from '@/stores/confirmStore'
import { formatCurrency } from '@/lib/utils'
import { RELATIONSHIPS } from '@/lib/constants'
import type { PersonWithLedgers } from '@/types/ledger.types'
import type { Relationship } from '@/lib/constants'

const RELATIONSHIP_COLORS: Record<string, string> = {
  Friend:             '#6C63FF',
  Family:             '#10B981',
  'Business Partner': '#F59E0B',
  Colleague:          '#06B6D4',
  Self:               '#A855F7',
  Other:              '#9D9AB8',
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  colorClass: 'teal' | 'coral'
  icon: React.ReactNode
}

function KpiCard({ label, value, sub, colorClass, icon }: KpiCardProps) {
  return (
    <div className={`pmp-kpi pmp-kpi-${colorClass}`}>
      <div className="pmp-kpi-icon">{icon}</div>
      <div className="pmp-kpi-body">
        <div className="pmp-kpi-label">{label}</div>
        <div className="pmp-kpi-value">{value}</div>
        {sub && <div className="pmp-kpi-sub">{sub}</div>}
      </div>
    </div>
  )
}

// ── Person Row ────────────────────────────────────────────────────────────────
interface PersonRowProps {
  person: PersonWithLedgers
  isExpanded: boolean
  onToggleEdit: () => void
  onSave: (data: { relationship: Relationship | null; phone: string }) => Promise<void>
  onDelete: () => void
  isSaving: boolean
}

function PersonRow({ person, isExpanded, onToggleEdit, onSave, onDelete, isSaving }: PersonRowProps) {
  const relColor = RELATIONSHIP_COLORS[person.relationship ?? ''] ?? '#9D9AB8'
  const [editRel, setEditRel] = useState<Relationship | ''>(person.relationship ?? '')
  const [editPhone, setEditPhone] = useState(person.phone ?? '')

  async function handleSave() {
    await onSave({
      relationship: editRel ? (editRel as Relationship) : null,
      phone: editPhone,
    })
  }

  return (
    <div className="pmp-person-row-wrap">
      {/* Main row */}
      <div className="pmp-person-row">
        {/* Avatar */}
        <div
          className="pmp-avatar"
          style={{
            background: `linear-gradient(135deg, ${relColor}33, ${relColor}55)`,
            color: relColor,
          }}
        >
          {person.name[0]?.toUpperCase()}
        </div>

        {/* Info */}
        <div className="pmp-person-info">
          <div className="pmp-person-name-row">
            <span className="pmp-person-name">{person.name}</span>
            {person.relationship && (
              <span
                className="pmp-rel-badge"
                style={{
                  background: `${relColor}22`,
                  color: relColor,
                  borderColor: `${relColor}44`,
                }}
              >
                {person.relationship}
              </span>
            )}
          </div>
          <div className="pmp-person-amounts">
            {person.total_outstanding_lent > 0 && (
              <span className="pmp-lent-amt">+{formatCurrency(person.total_outstanding_lent)} they owe</span>
            )}
            {person.total_outstanding_debt > 0 && (
              <span className="pmp-debt-amt">−{formatCurrency(person.total_outstanding_debt)} you owe</span>
            )}
            {person.total_outstanding_lent === 0 && person.total_outstanding_debt === 0 && (
              <span className="pmp-settled-label">All settled</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            className={`pmp-edit-btn ${isExpanded ? 'pmp-edit-btn-active' : ''}`}
            onClick={onToggleEdit}
          >
            {isExpanded ? <><X size={13} /> Cancel</> : <><Edit2 size={13} /> Edit</>}
          </button>
          {!isExpanded && (
            <button className="pmp-delete-btn" onClick={onDelete}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Inline edit form */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="pmp-edit-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pmp-edit-form-inner">
              <div className="pmp-field-group">
                <label className="pmp-label">Relationship</label>
                <select
                  className="pmp-select"
                  value={editRel}
                  onChange={(e) => setEditRel(e.target.value as Relationship | '')}
                >
                  <option value="">— None —</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="pmp-field-group">
                <label className="pmp-label">Phone</label>
                <input
                  className="pmp-input"
                  type="tel"
                  placeholder="Optional phone number"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>

              <div className="pmp-edit-actions">
                <button
                  className="pmp-save-btn"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="pmp-saving-dot" />
                  ) : (
                    <Check size={13} />
                  )}
                  Save
                </button>
                <button className="pmp-cancel-btn" onClick={onToggleEdit}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Add Person Form ───────────────────────────────────────────────────────────
interface AddPersonFormProps {
  onSave: (data: { name: string; relationship: Relationship | null; phone: string }) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

function AddPersonForm({ onSave, onCancel, isSaving }: AddPersonFormProps) {
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState<Relationship | ''>('')
  const [phone, setPhone] = useState('')

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    await onSave({
      name: trimmed,
      relationship: relationship ? (relationship as Relationship) : null,
      phone,
    })
  }

  return (
    <motion.div
      className="pmp-add-form"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
    >
      <div className="pmp-add-form-title">
        <Plus size={14} style={{ color: 'var(--accent-primary)' }} />
        New person
      </div>

      <div className="pmp-add-form-fields">
        <div className="pmp-field-group">
          <label className="pmp-label">Name *</label>
          <input
            className="pmp-input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>

        <div className="pmp-field-row">
          <div className="pmp-field-group" style={{ flex: 1 }}>
            <label className="pmp-label">Relationship</label>
            <select
              className="pmp-select"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as Relationship | '')}
            >
              <option value="">— None —</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="pmp-field-group" style={{ flex: 1 }}>
            <label className="pmp-label">Phone</label>
            <input
              className="pmp-input"
              type="tel"
              placeholder="Optional"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pmp-add-form-actions">
        <button
          className="pmp-save-btn"
          onClick={handleSubmit}
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? <span className="pmp-saving-dot" /> : <Check size={13} />}
          Add person
        </button>
        <button className="pmp-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function PersonManagementPanel({ onClose }: { onClose: () => void }) {
  const { data: persons = [] } = usePersons()
  const { mutateAsync: createPerson, isPending: isCreating } = useCreatePerson()
  const { mutateAsync: updatePerson, isPending: isUpdating } = useUpdatePerson()
  const { mutate: deletePerson } = useDeletePerson()
  const confirm = useConfirmStore((s) => s.confirm)

  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedEditId, setExpandedEditId] = useState<string | null>(null)

  // ── KPI computations
  const kpi = useMemo(() => {
    const lenders = persons.filter((p) => p.total_outstanding_lent > 0)
    const borrowers = persons.filter((p) => p.total_outstanding_debt > 0)

    const topLent = lenders.reduce<PersonWithLedgers | null>(
      (best, p) => (!best || p.total_outstanding_lent > best.total_outstanding_lent ? p : best),
      null,
    )
    const topDebt = borrowers.reduce<PersonWithLedgers | null>(
      (best, p) => (!best || p.total_outstanding_debt > best.total_outstanding_debt ? p : best),
      null,
    )

    return { topLent, topDebt, lenderCount: lenders.length, borrowerCount: borrowers.length }
  }, [persons])

  async function handleCreatePerson(data: { name: string; relationship: Relationship | null; phone: string }) {
    await createPerson({ name: data.name, relationship: data.relationship, phone: data.phone || null, notes: null })
    setShowAddForm(false)
  }

  async function handleUpdatePerson(id: string, data: { relationship: Relationship | null; phone: string }) {
    await updatePerson({ id, relationship: data.relationship, phone: data.phone || null })
    setExpandedEditId(null)
  }

  function toggleEdit(id: string) {
    setExpandedEditId((prev) => (prev === id ? null : id))
  }

  async function handleDeletePerson(person: PersonWithLedgers) {
    const ok = await confirm({
      title: `Remove ${person.name}?`,
      description: 'This removes the person and all their ledger entries permanently.',
      itemName: person.name,
    })
    if (ok) deletePerson(person.id)
  }

  return (
    <motion.div
      className="pmp-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="pmp-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* ── Header ── */}
        <div className="pmp-header">
          <div className="pmp-header-top">
            <button className="pmp-back-btn" onClick={onClose}>
              <ArrowLeft size={18} /> Back
            </button>
            <button
              className="pmp-add-person-btn"
              onClick={() => { setShowAddForm((v) => !v); setExpandedEditId(null) }}
            >
              <Plus size={15} />
              Add person
            </button>
          </div>
          <h1 className="pmp-title">People</h1>
          <p className="pmp-sub">Manage people in your lent &amp; debt ledger</p>
        </div>

        {/* ── KPI Grid ── */}
        <div className="pmp-kpi-grid">
          <KpiCard
            label="Top lent"
            value={kpi.topLent ? formatCurrency(kpi.topLent.total_outstanding_lent) : '—'}
            sub={kpi.topLent?.name}
            colorClass="teal"
            icon={<TrendingUp size={16} />}
          />
          <KpiCard
            label="Top debt"
            value={kpi.topDebt ? formatCurrency(kpi.topDebt.total_outstanding_debt) : '—'}
            sub={kpi.topDebt?.name}
            colorClass="coral"
            icon={<TrendingDown size={16} />}
          />
          <KpiCard
            label="Owe you"
            value={kpi.lenderCount}
            sub="people with balance"
            colorClass="teal"
            icon={<Users size={16} />}
          />
          <KpiCard
            label="You owe"
            value={kpi.borrowerCount}
            sub="people with balance"
            colorClass="coral"
            icon={<Users size={16} />}
          />
        </div>

        {/* ── Person list ── */}
        <div className="pmp-content">
          <AnimatePresence>
            {showAddForm && (
              <AddPersonForm
                key="add-form"
                onSave={handleCreatePerson}
                onCancel={() => setShowAddForm(false)}
                isSaving={isCreating}
              />
            )}
          </AnimatePresence>

          {persons.length === 0 && !showAddForm && (
            <div className="pmp-empty">
              <Users size={36} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
              <p>No people yet</p>
              <p style={{ fontSize: 12 }}>Add someone to start tracking lent &amp; debt</p>
            </div>
          )}

          <div className="pmp-list">
            {persons.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                isExpanded={expandedEditId === person.id}
                onToggleEdit={() => toggleEdit(person.id)}
                onSave={(data) => handleUpdatePerson(person.id, data)}
                onDelete={() => handleDeletePerson(person)}
                isSaving={isUpdating}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <style>{STYLES}</style>
    </motion.div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const STYLES = `
  .pmp-overlay {
    position: fixed; inset: 0; z-index: 800;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  }
  .pmp-panel {
    position: absolute; top: 0; right: 0; bottom: 0; width: 100%; max-width: 600px;
    background: var(--bg-page); overflow: hidden; display: flex; flex-direction: column;
    box-shadow: -24px 0 60px rgba(0,0,0,0.4);
  }

  /* Header */
  .pmp-header {
    padding: 18px 22px 14px; border-bottom: 1px solid var(--border);
    background: var(--bg-elevated); flex-shrink: 0;
  }
  .pmp-header-top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .pmp-back-btn {
    display: inline-flex; align-items: center; gap: 6px; background: none; border: none;
    color: var(--text-muted); font-size: 13px; cursor: pointer; padding: 0;
    transition: color 0.12s;
  }
  .pmp-back-btn:hover { color: var(--text-primary); }
  .pmp-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
  .pmp-sub { font-size: 12px; color: var(--text-muted); margin: 0; }
  .pmp-add-person-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 10px; border: none; cursor: pointer;
    font-size: 13px; font-weight: 600;
    background: linear-gradient(135deg, #6C63FF, #A855F7); color: #fff;
    transition: opacity 0.12s, transform 0.12s;
  }
  .pmp-add-person-btn:hover { opacity: 0.88; transform: scale(1.02); }

  /* KPI grid */
  .pmp-kpi-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    padding: 14px 22px; border-bottom: 1px solid var(--border);
    background: var(--bg-card); flex-shrink: 0;
  }
  .pmp-kpi {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: 12px; border: 1px solid;
  }
  .pmp-kpi-teal {
    background: rgba(16,185,129,0.07);
    border-color: rgba(16,185,129,0.2);
  }
  .pmp-kpi-coral {
    background: rgba(249,115,22,0.07);
    border-color: rgba(249,115,22,0.2);
  }
  .pmp-kpi-icon {
    width: 32px; height: 32px; border-radius: 8px; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0;
  }
  .pmp-kpi-teal .pmp-kpi-icon { background: rgba(16,185,129,0.15); color: var(--accent-teal); }
  .pmp-kpi-coral .pmp-kpi-icon { background: rgba(249,115,22,0.15); color: var(--accent-coral); }
  .pmp-kpi-body { min-width: 0; }
  .pmp-kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 2px; }
  .pmp-kpi-value { font-size: 16px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pmp-kpi-teal .pmp-kpi-value { color: var(--accent-teal); }
  .pmp-kpi-coral .pmp-kpi-value { color: var(--accent-coral); }
  .pmp-kpi-sub { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Content + list */
  .pmp-content { flex: 1; overflow-y: auto; padding: 16px 22px 32px; display: flex; flex-direction: column; gap: 10px; }
  .pmp-list { display: flex; flex-direction: column; gap: 8px; }
  .pmp-empty {
    text-align: center; padding: 48px 16px; color: var(--text-muted);
    font-size: 14px; display: flex; flex-direction: column; align-items: center;
  }
  .pmp-empty p { margin: 0 0 4px; }

  /* Person row */
  .pmp-person-row-wrap {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
    overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .pmp-person-row-wrap:hover { border-color: rgba(108,99,255,0.25); box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
  .pmp-person-row {
    display: flex; align-items: center; gap: 12px; padding: 14px 14px 14px 16px;
  }
  .pmp-avatar {
    width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; font-weight: 700;
  }
  .pmp-person-info { flex: 1; min-width: 0; }
  .pmp-person-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px; }
  .pmp-person-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
  .pmp-rel-badge {
    font-size: 11px; font-weight: 500; padding: 2px 8px;
    border-radius: 20px; border: 1px solid; white-space: nowrap;
  }
  .pmp-person-amounts { display: flex; gap: 8px; flex-wrap: wrap; }
  .pmp-lent-amt { font-size: 12px; color: var(--accent-teal); font-weight: 500; }
  .pmp-debt-amt { font-size: 12px; color: var(--accent-coral); font-weight: 500; }
  .pmp-settled-label { font-size: 12px; color: var(--text-muted); }
  .pmp-edit-btn {
    height: 30px; padding: 0 10px; border-radius: 8px; flex-shrink: 0; gap: 5px;
    display: flex; align-items: center; font-size: 12px; font-weight: 600;
    border: 1px solid var(--border); background: none;
    color: var(--text-muted); cursor: pointer; transition: background 0.12s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
  }
  .pmp-edit-btn:hover { background: rgba(108,99,255,0.12); color: var(--accent-primary); border-color: rgba(108,99,255,0.3); }
  .pmp-edit-btn-active { background: rgba(108,99,255,0.12); color: var(--accent-primary); border-color: rgba(108,99,255,0.3); }
  .pmp-delete-btn {
    height: 30px; padding: 0 10px; border-radius: 8px; flex-shrink: 0; gap: 5px;
    display: flex; align-items: center; font-size: 12px; font-weight: 600;
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
    color: var(--accent-red); cursor: pointer; transition: background 0.12s;
  }
  .pmp-delete-btn:hover { background: rgba(239,68,68,0.16); }

  /* Inline edit form */
  .pmp-edit-form { border-top: 1px solid var(--border); }
  .pmp-edit-form-inner {
    display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px;
    padding: 12px 16px 14px; background: rgba(108,99,255,0.04);
  }
  .pmp-field-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 130px; }
  .pmp-field-row { display: flex; gap: 10px; flex-wrap: wrap; width: 100%; }
  .pmp-label { font-size: 11px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .pmp-input {
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text-primary); font-size: 13px;
    padding: 7px 10px; width: 100%;
  }
  .pmp-input:focus { outline: none; border-color: var(--border-focus); }
  .pmp-select {
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text-primary); font-size: 13px;
    padding: 7px 10px; width: 100%; cursor: pointer;
  }
  .pmp-select:focus { outline: none; border-color: var(--border-focus); }
  .pmp-edit-actions { display: flex; gap: 8px; align-items: center; margin-top: 2px; }

  /* Shared save/cancel buttons */
  .pmp-save-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px; border: none; cursor: pointer;
    font-size: 13px; font-weight: 600;
    background: linear-gradient(135deg, #6C63FF, #A855F7); color: #fff;
    transition: opacity 0.12s; white-space: nowrap;
  }
  .pmp-save-btn:hover:not(:disabled) { opacity: 0.88; }
  .pmp-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .pmp-cancel-btn {
    padding: 7px 12px; border-radius: 8px; font-size: 13px; font-weight: 500;
    background: none; border: 1px solid var(--border); color: var(--text-muted);
    cursor: pointer; transition: color 0.12s, border-color 0.12s;
  }
  .pmp-cancel-btn:hover { color: var(--text-primary); border-color: var(--text-muted); }
  .pmp-saving-dot {
    width: 10px; height: 10px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
    animation: pmp-spin 0.6s linear infinite; display: inline-block;
  }
  @keyframes pmp-spin { to { transform: rotate(360deg); } }

  /* Add person form */
  .pmp-add-form {
    background: var(--bg-card); border: 1px solid rgba(108,99,255,0.3);
    border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px;
  }
  .pmp-add-form-title {
    display: flex; align-items: center; gap: 7px;
    font-size: 13px; font-weight: 600; color: var(--text-primary);
  }
  .pmp-add-form-fields { display: flex; flex-direction: column; gap: 10px; }
  .pmp-add-form-actions { display: flex; gap: 8px; align-items: center; }
`
