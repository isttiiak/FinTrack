import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, Search } from 'lucide-react'
import { useCategories, useCreateCategory } from '@/hooks/useCategories'
import { useDemoStore } from '@/stores/demoStore'
import { scaleIn } from '@/lib/animations'
import type { TxnType } from '@/lib/constants'

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
    <style>{STYLES}</style>
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

const STYLES = `
  .cmm-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .cmm-modal {
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 18px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    width: 100%; max-width: 580px; max-height: 85vh;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .cmm-header {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
  }
  .cmm-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
  .cmm-sub { font-size: 13px; color: var(--text-muted); margin: 0; }
  .cmm-close {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: background 0.12s, color 0.12s; flex-shrink: 0;
  }
  .cmm-close:hover { background: var(--bg-hover); color: var(--text-primary); }

  .cmm-add-section {
    padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
    background: var(--bg-card);
  }
  .cmm-section-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin: 0 0 12px; }
  .cmm-form-row { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
  .cmm-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 140px; }
  .cmm-field-btn { flex: 0 0 auto; }
  .cmm-label { font-size: 12px; font-weight: 500; color: var(--text-muted); }
  .cmm-input {
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 9px;
    color: var(--text-primary); font-size: 13px; padding: 9px 12px; width: 100%;
    transition: border-color 0.15s;
  }
  .cmm-input::placeholder { color: var(--text-muted); }
  .cmm-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.12); }
  .cmm-save-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer;
    background: linear-gradient(135deg, #6C63FF, #A855F7); border: none; color: #fff;
    transition: opacity 0.12s; white-space: nowrap;
  }
  .cmm-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cmm-error { font-size: 12px; color: #FCA5A5; margin: 8px 0 0; }
  .cmm-success {
    display: flex; align-items: center; gap: 6px; margin-top: 8px;
    font-size: 12px; font-weight: 500; color: var(--accent-teal);
  }
  .cmm-spinner {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
    border-radius: 50%; animation: cmm-spin 0.7s linear infinite;
  }
  @keyframes cmm-spin { to { transform: rotate(360deg); } }

  .cmm-group-dropdown {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 200;
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden; max-height: 180px; overflow-y: auto;
  }
  .cmm-group-option {
    display: flex; align-items: center; gap: 6px;
    width: 100%; padding: 9px 14px; background: none; border: none;
    font-size: 13px; color: var(--text-secondary); text-align: left; cursor: pointer;
    transition: background 0.1s;
  }
  .cmm-group-option:hover { background: var(--bg-hover); color: var(--text-primary); }
  .cmm-group-new { color: var(--accent-primary); }

  .cmm-list-section { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .cmm-search-row {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 24px; border-bottom: 1px solid var(--border);
  }
  .cmm-search-icon { color: var(--text-muted); flex-shrink: 0; }
  .cmm-search { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 13px; }
  .cmm-search::placeholder { color: var(--text-muted); }
  .cmm-search-clear { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; padding: 0; }
  .cmm-search-clear:hover { color: var(--text-primary); }

  .cmm-categories { flex: 1; overflow-y: auto; padding: 12px 24px 20px; display: flex; flex-direction: column; gap: 12px; }
  .cmm-empty { font-size: 13px; color: var(--text-muted); padding: 12px 0; }
  .cmm-group { }
  .cmm-group-header {
    font-size: 10px; font-weight: 600; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px;
  }
  .cmm-group-items { display: flex; flex-wrap: wrap; gap: 6px; }
  .cmm-cat-chip {
    display: inline-flex; align-items: center;
    padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
  }
  .cmm-cat-new {
    background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: var(--accent-teal);
  }
`
