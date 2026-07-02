import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Edit2, Check, X, Users, Trash2, ChevronDown } from 'lucide-react'
import { fadeUp } from '@/lib/animations'
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

type PeopleTab = 'all' | 'lent' | 'debt'

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
export default function PeoplePage() {
  const navigate = useNavigate()
  const { data: persons = [] } = usePersons()
  const { mutateAsync: createPerson, isPending: isCreating } = useCreatePerson()
  const { mutateAsync: updatePerson, isPending: isUpdating } = useUpdatePerson()
  const { mutate: deletePerson } = useDeletePerson()
  const confirm = useConfirmStore((s) => s.confirm)

  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedEditId, setExpandedEditId] = useState<string | null>(null)
  const [tab, setTab] = useState<PeopleTab>('all')
  const [relFilter, setRelFilter] = useState<Relationship | ''>('')

  // ── Stats
  const stats = useMemo(() => ({
    total: persons.length,
    owedToYou: persons.filter((p) => p.total_outstanding_lent > 0).length,
    youOwe: persons.filter((p) => p.total_outstanding_debt > 0).length,
  }), [persons])

  const filtered = useMemo(() => {
    return persons.filter((p) => {
      if (tab === 'lent' && p.total_outstanding_lent <= 0) return false
      if (tab === 'debt' && p.total_outstanding_debt <= 0) return false
      if (relFilter && p.relationship !== relFilter) return false
      return true
    })
  }, [persons, tab, relFilter])

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
    <motion.div className="pmp-page" variants={fadeUp} initial="initial" animate="animate">
      {/* Header */}
      <button className="pd-back" onClick={() => navigate({ to: '/ledger' })}>
        <ArrowLeft size={15} /> Back to Lent &amp; Debt
      </button>

      <div className="pmp-header-row">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-subtitle">Manage people in your lent &amp; debt ledger</p>
        </div>
        <motion.button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => { setShowAddForm((v) => !v); setExpandedEditId(null) }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={16} /> Add person
        </motion.button>
      </div>

      {/* Compact stats strip */}
      <div className="pmp-stats-strip">
        <div className="pmp-stat"><strong>{stats.total}</strong> total people</div>
        <div className="pmp-stat-sep" />
        <div className="pmp-stat pmp-stat-teal"><strong>{stats.owedToYou}</strong> owe you</div>
        <div className="pmp-stat-sep" />
        <div className="pmp-stat pmp-stat-coral"><strong>{stats.youOwe}</strong> you owe</div>
      </div>

      {/* Tabs + relationship filter */}
      <div className="pmp-controls-row">
        <div className="pmp-tabs">
          {([['all', 'All people'], ['lent', '💸 Lent'], ['debt', '🏦 Debt']] as [PeopleTab, string][]).map(([t, label]) => (
            <button
              key={t}
              className={`pmp-tab ${tab === t ? 'pmp-tab-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="pmp-rel-filter-wrap">
          <select
            className="pmp-rel-filter"
            value={relFilter}
            onChange={(e) => setRelFilter(e.target.value as Relationship | '')}
          >
            <option value="">All relationships</option>
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown size={13} className="pmp-rel-filter-icon" />
        </div>
      </div>

      {/* Person list */}
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

        {filtered.length === 0 && !showAddForm && (
          <div className="pmp-empty">
            <Users size={36} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
            <p>{persons.length === 0 ? 'No people yet' : 'No people match this filter'}</p>
            <p style={{ fontSize: 12 }}>
              {persons.length === 0 ? 'Add someone to start tracking lent & debt' : 'Try a different tab or relationship filter'}
            </p>
          </div>
        )}

        <div className="pmp-list">
          {filtered.map((person) => (
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

      <style>{STYLES}</style>
    </motion.div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const STYLES = `
  .pmp-page { max-width: 900px; }
  .pd-back {
    display: inline-flex; align-items: center; gap: 6px; background: none; border: none;
    color: var(--text-muted); font-size: 13px; cursor: pointer; padding: 0; margin-bottom: 16px;
    transition: color 0.12s;
  }
  .pd-back:hover { color: var(--text-primary); }

  .pmp-header-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
  .page-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }

  /* Stats strip */
  .pmp-stats-strip {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    padding: 12px 16px; border-radius: 12px; margin-bottom: 16px;
    background: var(--bg-card); border: 1px solid var(--border);
    font-size: 13px; color: var(--text-secondary);
  }
  .pmp-stat strong { color: var(--text-primary); font-size: 15px; margin-right: 4px; }
  .pmp-stat-teal strong { color: var(--accent-teal); }
  .pmp-stat-coral strong { color: var(--accent-coral); }
  .pmp-stat-sep { width: 1px; height: 14px; background: var(--border); }

  /* Controls row */
  .pmp-controls-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .pmp-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .pmp-tab {
    padding: 7px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .pmp-tab:hover { background: var(--bg-hover); color: var(--text-primary); }
  .pmp-tab-active { background: linear-gradient(135deg, #6C63FF, #A855F7); border-color: transparent; color: #fff; }

  .pmp-rel-filter-wrap { position: relative; }
  .pmp-rel-filter {
    appearance: none; cursor: pointer; padding: 7px 30px 7px 14px; border-radius: 20px;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
    font-size: 13px; font-weight: 500;
  }
  .pmp-rel-filter:focus { outline: none; border-color: var(--border-focus); }
  .pmp-rel-filter-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

  /* Content + list */
  .pmp-content { display: flex; flex-direction: column; gap: 10px; }
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
