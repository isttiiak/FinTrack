import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, Search } from 'lucide-react'
import { useCategories, useCreateCategory } from '@/hooks/useCategories'
import { useDemoStore } from '@/stores/demoStore'
import { scaleIn } from '@/lib/animations'
import type { TxnType } from '@/lib/constants'
import './CategoryManagerModal.css'

interface CategoryManagerModalProps {
  open: boolean
  onClose: () => void
  txnType: TxnType
  /** Called after a new category is created, so the parent can auto-select it */
  onCategoryCreated?: (categoryId: string) => void
}

export default function CategoryManagerModal({
  open, onClose, txnType, onCategoryCreated,
}: CategoryManagerModalProps) {
  const { data: allCategories = [] } = useCategories()
  const { mutateAsync: createCategory, isPending: saving } = useCreateCategory()
  const isDemo = useDemoStore((s) => s.isDemo)

  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [groupQuery, setGroupQuery] = useState('')
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)
  const [justCreated, setJustCreated] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)

  const typeCategories = allCategories.filter((c) => c.type === txnType)

  const allGroups = useMemo(
    () => [...new Set(typeCategories.map((c) => c.main_group))].sort(),
    [typeCategories],
  )

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return typeCategories
    return typeCategories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.main_group.toLowerCase().includes(q),
    )
  }, [typeCategories, search])

  const grouped = useMemo(() => {
    const map: Record<string, typeof filteredCategories> = {}
    for (const c of filteredCategories) {
      if (!map[c.main_group]) map[c.main_group] = []
      map[c.main_group].push(c)
    }
    return map
  }, [filteredCategories])

  const filteredGroups = allGroups.filter((g) =>
    g.toLowerCase().includes(groupQuery.toLowerCase()),
  )
  const showNewGroupOption =
    groupQuery.trim().length > 0 &&
    !allGroups.some((g) => g.toLowerCase() === groupQuery.trim().toLowerCase())

  function resetForm() {
    setNewName('')
    setNewGroup('')
    setGroupQuery('')
    setShowGroupDropdown(false)
    setFormError(null)
  }

  async function handleSave() {
    const name = newName.trim()
    const group = newGroup.trim()
    if (!name) { setFormError('Category name is required'); return }
    if (!group) { setFormError('Group is required'); return }
    setFormError(null)

    if (isDemo) {
      resetForm()
      return
    }

    try {
      const cat = await createCategory({ name, main_group: group, type: txnType, color_hex: null, is_default: false })
      setJustCreated(cat.id)
      onCategoryCreated?.(cat.id)
      resetForm()
      setTimeout(() => setJustCreated(null), 2000)
    } catch {
      setFormError('Failed to save. Try again.')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }

  if (!open) return null

  return (
    <>
    <AnimatePresence>
      {open && (
        <div className="cmm-overlay" onClick={onClose}>
          <motion.div
            className="cmm-modal"
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="cmm-header">
              <div>
                <h2 className="cmm-title">Manage Categories</h2>
                <p className="cmm-sub">Add and browse {txnType.toLowerCase()} categories</p>
              </div>
              <button className="cmm-close" onClick={onClose}><X size={18} /></button>
            </div>

            {/* Add form */}
            <div className="cmm-add-section">
              <h3 className="cmm-section-title">Add new category</h3>
              <div className="cmm-form-row">
                <div className="cmm-field">
                  <label className="cmm-label">Name <span className="req">*</span></label>
                  <input
                    ref={nameRef}
                    type="text"
                    className="cmm-input"
                    placeholder="e.g. Gym, Taxi, Freelance"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                </div>

                <div className="cmm-field" style={{ position: 'relative' }}>
                  <label className="cmm-label">Group (main category) <span className="req">*</span></label>
                  <input
                    type="text"
                    className="cmm-input"
                    placeholder="e.g. Transport, Food, Health"
                    value={groupQuery || newGroup}
                    onChange={(e) => {
                      setGroupQuery(e.target.value)
                      setNewGroup(e.target.value)
                      setShowGroupDropdown(true)
                    }}
                    onFocus={() => setShowGroupDropdown(true)}
                    onBlur={() => setTimeout(() => setShowGroupDropdown(false), 150)}
                    onKeyDown={handleKeyDown}
                  />
                  <AnimatePresence>
                    {showGroupDropdown && (filteredGroups.length > 0 || showNewGroupOption) && (
                      <motion.div
                        className="cmm-group-dropdown"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1 }}
                      >
                        {filteredGroups.map((g) => (
                          <button
                            key={g}
                            type="button"
                            className="cmm-group-option"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setNewGroup(g)
                              setGroupQuery(g)
                              setShowGroupDropdown(false)
                            }}
                          >
                            {g}
                          </button>
                        ))}
                        {showNewGroupOption && (
                          <button
                            type="button"
                            className="cmm-group-option cmm-group-new"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setNewGroup(groupQuery.trim())
                              setGroupQuery(groupQuery.trim())
                              setShowGroupDropdown(false)
                            }}
                          >
                            <Plus size={11} /> Create "{groupQuery.trim()}"
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="cmm-field cmm-field-btn">
                  <label className="cmm-label">&nbsp;</label>
                  <button
                    type="button"
                    className="cmm-save-btn"
                    onClick={handleSave}
                    disabled={saving || !newName.trim() || !newGroup.trim()}
                  >
                    {saving ? <span className="cmm-spinner" /> : <><Plus size={14} /> Add</>}
                  </button>
                </div>
              </div>

              {formError && <p className="cmm-error">{formError}</p>}

              <AnimatePresence>
                {justCreated && (
                  <motion.div
                    className="cmm-success"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Check size={13} /> Category added and selected!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search + Category list */}
            <div className="cmm-list-section">
              <div className="cmm-search-row">
                <Search size={13} className="cmm-search-icon" />
                <input
                  type="text"
                  className="cmm-search"
                  placeholder={`Search ${txnType.toLowerCase()} categories…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" className="cmm-search-clear" onClick={() => setSearch('')}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="cmm-categories">
                {Object.keys(grouped).length === 0 ? (
                  <div className="cmm-empty">
                    {search ? `No categories matching "${search}"` : `No ${txnType.toLowerCase()} categories yet.`}
                  </div>
                ) : (
                  Object.entries(grouped).map(([group, cats]) => (
                    <div key={group} className="cmm-group">
                      <div className="cmm-group-header">{group}</div>
                      <div className="cmm-group-items">
                        {cats.map((cat) => (
                          <div
                            key={cat.id}
                            className={`cmm-cat-chip ${cat.id === justCreated ? 'cmm-cat-new' : ''}`}
                          >
                            {cat.name}
                            {cat.id === justCreated && <Check size={11} style={{ color: 'var(--accent-teal)', marginLeft: 4 }} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  )
}

