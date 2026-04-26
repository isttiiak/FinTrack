import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateCategory } from '@/hooks/useCategories'
import { useDemoStore } from '@/stores/demoStore'
import type { Category } from '@/types/expense.types'
import type { TxnType } from '@/lib/constants'

interface CategoryComboboxProps {
  value: string               // category_id
  onChange: (id: string) => void
  categories: Category[]
  txnType: TxnType
  error?: boolean
}

type Mode = 'browse' | 'create'

export default function CategoryCombobox({ value, onChange, categories, txnType, error }: CategoryComboboxProps) {
  const { mutateAsync: createCategory, isPending: creating } = useCreateCategory()
  const isDemo = useDemoStore((s) => s.isDemo)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<Mode>('browse')

  // New-category form state
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [groupQuery, setGroupQuery] = useState('')
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const newNameRef = useRef<HTMLInputElement>(null)

  const selected = categories.find((c) => c.id === value)

  // All distinct main_groups from ALL categories (both types, for group suggestions)
  const allGroups = useMemo(
    () => [...new Set(categories.map((c) => c.main_group))].sort(),
    [categories],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return categories
    const q = query.toLowerCase()
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.main_group.toLowerCase().includes(q),
    )
  }, [categories, query])

  const grouped = useMemo(() => {
    const map: Record<string, Category[]> = {}
    for (const c of filtered) {
      if (!map[c.main_group]) map[c.main_group] = []
      map[c.main_group].push(c)
    }
    return map
  }, [filtered])

  const filteredGroups = allGroups.filter((g) =>
    g.toLowerCase().includes(groupQuery.toLowerCase()),
  )
  const showNewGroupOption = groupQuery.trim().length > 0
    && !allGroups.some((g) => g.toLowerCase() === groupQuery.trim().toLowerCase())

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        resetCreate()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-focus search/new-name when opening
  useEffect(() => {
    if (!open) return
    setTimeout(() => {
      if (mode === 'browse') searchRef.current?.focus()
      else newNameRef.current?.focus()
    }, 50)
  }, [open, mode])

  function resetCreate() {
    setMode('browse')
    setNewName('')
    setNewGroup('')
    setGroupQuery('')
    setShowGroupDropdown(false)
  }

  function handleSelect(cat: Category) {
    onChange(cat.id)
    setOpen(false)
    setQuery('')
    resetCreate()
  }

  function openCreate() {
    setMode('create')
    setNewName(query.trim())  // pre-fill with what was typed
    setQuery('')
  }

  async function handleCreateSubmit() {
    if (!newName.trim() || !newGroup.trim()) return
    if (isDemo) { setOpen(false); resetCreate(); return }

    const cat = await createCategory({
      name:       newName.trim(),
      main_group: newGroup.trim(),
      type:       txnType,
      color_hex:  null,
      is_default: false,
    })
    onChange(cat.id)
    setOpen(false)
    resetCreate()
  }

  function handleCreateKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleCreateSubmit() }
  }

  return (
    <div ref={containerRef} className="catcb-wrap">
      {/* Trigger button */}
      <button
        type="button"
        className={cn('catcb-trigger', error && 'catcb-trigger-error', open && 'catcb-trigger-open')}
        onClick={() => { setOpen((v) => !v); if (!open) setMode('browse') }}
      >
        {selected ? (
          <span className="catcb-selected-label">
            <span className="catcb-selected-group">{selected.main_group} /</span> {selected.name}
          </span>
        ) : (
          <span className="catcb-placeholder">Select category…</span>
        )}
        <ChevronDown size={14} className={cn('catcb-chevron', open && 'catcb-chevron-open')} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="catcb-dropdown"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
          >
            {mode === 'browse' ? (
              <>
                {/* Search */}
                <div className="catcb-search-row">
                  <Search size={13} className="catcb-search-icon" />
                  <input
                    ref={searchRef}
                    type="text"
                    className="catcb-search"
                    placeholder="Search categories…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button type="button" className="catcb-search-clear" onClick={() => setQuery('')}>
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Category list */}
                <div className="catcb-list">
                  {Object.keys(grouped).length === 0 ? (
                    <div className="catcb-empty">No categories match "{query}"</div>
                  ) : (
                    Object.entries(grouped).map(([group, cats]) => (
                      <div key={group}>
                        <div className="catcb-group-label">{group}</div>
                        {cats.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            className={cn('catcb-item', cat.id === value && 'catcb-item-selected')}
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(cat) }}
                          >
                            {cat.id === value && <Check size={13} className="catcb-check" />}
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>

                {/* Create new */}
                <div className="catcb-footer">
                  <button type="button" className="catcb-create-btn" onMouseDown={(e) => { e.preventDefault(); openCreate() }}>
                    <Plus size={13} /> Add new category
                  </button>
                </div>
              </>
            ) : (
              /* Create — uses div, NOT form, because this lives inside ExpenseForm already */
              <div className="catcb-create-form">
                <div className="catcb-create-header">
                  <span className="catcb-create-title">New {txnType.toLowerCase()} category</span>
                  <button type="button" className="catcb-create-back" onClick={() => setMode('browse')}>
                    <X size={14} />
                  </button>
                </div>

                <div className="catcb-create-field">
                  <label className="catcb-create-label">Category name <span className="req">*</span></label>
                  <input
                    ref={newNameRef}
                    type="text"
                    className="catcb-create-input"
                    placeholder="e.g. Gym, Taxi, Freelance"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleCreateKeyDown}
                  />
                </div>

                <div className="catcb-create-field">
                  <label className="catcb-create-label">Group (main category) <span className="req">*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="catcb-create-input"
                      placeholder="e.g. Transport, Food, Health"
                      value={groupQuery || newGroup}
                      onChange={(e) => {
                        setGroupQuery(e.target.value)
                        setNewGroup(e.target.value)
                        setShowGroupDropdown(true)
                      }}
                      onFocus={() => setShowGroupDropdown(true)}
                      onKeyDown={handleCreateKeyDown}
                    />
                    <AnimatePresence>
                      {showGroupDropdown && (filteredGroups.length > 0 || showNewGroupOption) && (
                        <motion.div
                          className="catcb-group-dropdown"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.1 }}
                        >
                          {filteredGroups.map((g) => (
                            <button
                              key={g}
                              type="button"
                              className="catcb-group-option"
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
                              className="catcb-group-option catcb-group-option-new"
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
                </div>

                <div className="catcb-create-actions">
                  <button type="button" className="catcb-create-cancel" onClick={() => setMode('browse')}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSubmit}
                    className="catcb-create-save"
                    disabled={creating || !newName.trim() || !newGroup.trim()}
                  >
                    {creating ? <span className="catcb-spinner" /> : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .catcb-wrap { position: relative; }

        .catcb-trigger {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px;
          cursor: pointer; text-align: left;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .catcb-trigger:focus, .catcb-trigger-open {
          outline: none; border-color: var(--border-focus);
          box-shadow: 0 0 0 3px rgba(108,99,255,0.15);
        }
        .catcb-trigger-error { border-color: var(--accent-red) !important; }
        .catcb-selected-label { font-size: 14px; color: var(--text-primary); }
        .catcb-selected-group { color: var(--text-muted); font-size: 12px; }
        .catcb-placeholder { color: var(--text-muted); }
        .catcb-chevron { color: var(--text-muted); transition: transform 0.15s; flex-shrink: 0; }
        .catcb-chevron-open { transform: rotate(180deg); }

        .catcb-dropdown {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 100;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 12px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.45); overflow: hidden;
        }

        /* Search row */
        .catcb-search-row {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-bottom: 1px solid var(--border);
          position: relative;
        }
        .catcb-search-icon { color: var(--text-muted); flex-shrink: 0; }
        .catcb-search {
          flex: 1; background: none; border: none; outline: none;
          color: var(--text-primary); font-size: 13px;
        }
        .catcb-search::placeholder { color: var(--text-muted); }
        .catcb-search-clear {
          background: none; border: none; color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; padding: 0;
        }
        .catcb-search-clear:hover { color: var(--text-primary); }

        /* List */
        .catcb-list { max-height: 220px; overflow-y: auto; padding: 6px 0; }
        .catcb-group-label {
          font-size: 10px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.07em;
          padding: 6px 14px 3px;
        }
        .catcb-item {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 8px 14px; background: none; border: none;
          font-size: 13px; color: var(--text-secondary); text-align: left; cursor: pointer;
          transition: background 0.1s, color 0.1s;
        }
        .catcb-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .catcb-item-selected { color: var(--accent-primary) !important; font-weight: 500; }
        .catcb-check { color: var(--accent-primary); flex-shrink: 0; }
        .catcb-empty { padding: 12px 14px; font-size: 13px; color: var(--text-muted); }

        /* Footer */
        .catcb-footer { border-top: 1px solid var(--border); padding: 8px; }
        .catcb-create-btn {
          display: flex; align-items: center; gap: 7px; width: 100%;
          padding: 8px 10px; border-radius: 8px;
          background: none; border: none; font-size: 12px; font-weight: 500;
          color: var(--accent-primary); cursor: pointer; transition: background 0.1s;
        }
        .catcb-create-btn:hover { background: rgba(108,99,255,0.08); }

        /* Create form */
        .catcb-create-form { padding: 14px; display: flex; flex-direction: column; gap: 11px; }
        .catcb-create-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
        .catcb-create-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .catcb-create-back {
          background: none; border: none; color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; padding: 2px;
        }
        .catcb-create-back:hover { color: var(--text-primary); }
        .catcb-create-field { display: flex; flex-direction: column; gap: 4px; }
        .catcb-create-label { font-size: 11px; font-weight: 500; color: var(--text-muted); }
        .catcb-create-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text-primary); font-size: 13px; padding: 8px 10px; width: 100%;
        }
        .catcb-create-input::placeholder { color: var(--text-muted); }
        .catcb-create-input:focus { outline: none; border-color: var(--border-focus); }

        /* Group dropdown */
        .catcb-group-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 200;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden; max-height: 160px; overflow-y: auto;
        }
        .catcb-group-option {
          display: flex; align-items: center; gap: 6px;
          width: 100%; padding: 8px 12px; background: none; border: none;
          font-size: 12px; color: var(--text-secondary); text-align: left; cursor: pointer;
          transition: background 0.1s;
        }
        .catcb-group-option:hover { background: var(--bg-hover); color: var(--text-primary); }
        .catcb-group-option-new { color: var(--accent-primary); }

        /* Create actions */
        .catcb-create-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 2px; }
        .catcb-create-cancel {
          padding: 7px 14px; border-radius: 8px; font-size: 13px; cursor: pointer;
          background: none; border: 1px solid var(--border); color: var(--text-secondary);
          transition: background 0.12s;
        }
        .catcb-create-cancel:hover { background: var(--bg-hover); color: var(--text-primary); }
        .catcb-create-save {
          padding: 7px 16px; border-radius: 8px; font-size: 13px; cursor: pointer;
          background: linear-gradient(135deg, #6C63FF, #A855F7); border: none; color: #fff; font-weight: 600;
          transition: opacity 0.12s; display: flex; align-items: center; justify-content: center; min-width: 56px;
        }
        .catcb-create-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .catcb-spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%; animation: catcb-spin 0.7s linear infinite;
        }
        @keyframes catcb-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
