import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Edit2, Check, X, Users, Trash2, ChevronDown } from 'lucide-react'
import { fadeUp } from '@/lib/animations'
import ErrorBanner from '@/components/common/ErrorBanner'
import SearchToggle from '@/components/common/SearchToggle'
import { usePersons, useCreatePerson, useUpdatePerson, useDeletePerson } from '@/hooks/useLedger'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import { useConfirmStore } from '@/stores/confirmStore'
import { formatCurrency } from '@/lib/utils'
import { RELATIONSHIPS } from '@/lib/constants'
import type { PersonWithLedgers } from '@/types/ledger.types'
import type { Relationship } from '@/lib/constants'
import './PeoplePage.css'

// Literal hex (not CSS vars) — these get a hex-alpha suffix appended below
// (e.g. `${relColor}33`), which only works with plain hex strings.
const RELATIONSHIP_COLORS: Record<string, string> = {
  Friend:             '#4FA981',
  Family:             '#3E9B72',
  'Business Partner': '#C2A24E',
  Colleague:          '#B4923F',
  Self:               '#8A968C',
  Other:              '#5F6B62',
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
  const relColor = RELATIONSHIP_COLORS[person.relationship ?? ''] ?? '#8A968C'
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
                  className="peoplepage-pmp-select"
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
              className="peoplepage-pmp-select"
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
  const personsQ = usePersons()
  const { data: persons = [] } = personsQ
  const { mutateAsync: createPerson, isPending: isCreating } = useCreatePerson()
  const { mutateAsync: updatePerson, isPending: isUpdating } = useUpdatePerson()
  const { mutate: deletePerson } = useDeletePerson()
  const confirm = useConfirmStore((s) => s.confirm)

  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedEditId, setExpandedEditId] = useState<string | null>(null)
  const [tab, setTab] = useState<PeopleTab>('all')
  const [relFilter, setRelFilter] = useState<Relationship | ''>('')
  const [search, setSearch] = useState('')

  // ── Stats
  const stats = useMemo(() => ({
    total: persons.length,
    owedToYou: persons.filter((p) => p.total_outstanding_lent > 0).length,
    youOwe: persons.filter((p) => p.total_outstanding_debt > 0).length,
  }), [persons])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return persons.filter((p) => {
      if (tab === 'lent' && p.total_outstanding_lent <= 0) return false
      if (tab === 'debt' && p.total_outstanding_debt <= 0) return false
      if (relFilter && p.relationship !== relFilter) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [persons, tab, relFilter, search])

  async function handleCreatePerson(data: { name: string; relationship: Relationship | null; phone: string }) {
    try {
      await createPerson({ name: data.name, relationship: data.relationship, phone: data.phone || null, notes: null })
      setShowAddForm(false)
    } catch (err) {
      if (err instanceof DemoBlockedError) setShowAddForm(false)
    }
  }

  async function handleUpdatePerson(id: string, data: { relationship: Relationship | null; phone: string }) {
    try {
      await updatePerson({ id, relationship: data.relationship, phone: data.phone || null })
      setExpandedEditId(null)
    } catch (err) {
      if (err instanceof DemoBlockedError) setExpandedEditId(null)
    }
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

      {personsQ.isError && <ErrorBanner onRetry={() => personsQ.refetch()} />}

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
        <SearchToggle value={search} onChange={setSearch} placeholder="Search people…" />
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

    </motion.div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
