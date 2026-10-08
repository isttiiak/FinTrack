import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Edit2, Users, Trash2, ChevronDown } from 'lucide-react'
import { fadeUp } from '@/lib/animations'
import ErrorBanner from '@/components/common/ErrorBanner'
import SearchToggle from '@/components/common/SearchToggle'
import { usePersons, useDeletePerson } from '@/hooks/useLedger'
import PersonForm from '@/components/ledger/PersonForm'
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
  onEdit: () => void
  onDelete: () => void
}

function PersonRow({ person, onEdit, onDelete }: PersonRowProps) {
  const relColor = RELATIONSHIP_COLORS[person.relationship ?? ''] ?? '#8A968C'

  return (
    <div className="pmp-person-row-wrap">
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
          <button className="pmp-edit-btn" onClick={onEdit}>
            <Edit2 size={13} /> Edit
          </button>
          <button className="pmp-delete-btn" onClick={onDelete} aria-label={`Remove ${person.name}`}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function PeoplePage() {
  const navigate = useNavigate()
  const personsQ = usePersons()
  const { data: persons = [] } = personsQ
  const { mutate: deletePerson } = useDeletePerson()
  const confirm = useConfirmStore((s) => s.confirm)

  // Add (editing: null) or edit one person — the full PersonForm, so name,
  // notes and custom relationships are editable too
  const [personForm, setPersonForm] = useState<{ editing: PersonWithLedgers | null } | null>(null)
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
          onClick={() => setPersonForm({ editing: null })}
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
        {filtered.length === 0 && (
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
              onEdit={() => setPersonForm({ editing: person })}
              onDelete={() => handleDeletePerson(person)}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {personForm && <PersonForm editing={personForm.editing} onClose={() => setPersonForm(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
