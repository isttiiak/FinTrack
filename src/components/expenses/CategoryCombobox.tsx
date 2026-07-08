import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Check, ChevronDown, X, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import CategoryManagerModal from './CategoryManagerModal'
import type { Category } from '@/types/expense.types'
import type { TxnType } from '@/lib/constants'

interface CategoryComboboxProps {
  value: string               // category_id
  onChange: (id: string) => void
  categories: Category[]
  txnType: TxnType
  error?: boolean
}

export default function CategoryCombobox({ value, onChange, categories, txnType, error }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [managerOpen, setManagerOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = categories.find((c) => c.id === value)

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

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-focus search when opening
  useEffect(() => {
    if (!open) return
    setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  function handleSelect(cat: Category) {
    onChange(cat.id)
    setOpen(false)
    setQuery('')
  }

  function handleCategoryCreated(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="catcb-wrap">
      {/* Trigger button */}
      <button
        type="button"
        className={cn('catcb-trigger', error && 'catcb-trigger-error', open && 'catcb-trigger-open')}
        onClick={() => setOpen((v) => !v)}
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

            {/* Manage button */}
            <div className="catcb-footer">
              <button
                type="button"
                className="catcb-manage-btn"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setOpen(false)
                  setManagerOpen(true)
                }}
              >
                <Settings2 size={13} /> Manage categories
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category manager modal — rendered outside the dropdown */}
      <CategoryManagerModal
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        txnType={txnType}
        onCategoryCreated={handleCategoryCreated}
      />

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
          box-shadow: 0 0 0 3px rgba(79, 169, 129,0.15);
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

        .catcb-search-row {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-bottom: 1px solid var(--border);
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

        .catcb-footer { border-top: 1px solid var(--border); padding: 8px; }
        .catcb-manage-btn {
          display: flex; align-items: center; gap: 7px; width: 100%;
          padding: 8px 10px; border-radius: 8px;
          background: none; border: none; font-size: 12px; font-weight: 500;
          color: var(--text-secondary); cursor: pointer; transition: background 0.1s, color 0.1s;
        }
        .catcb-manage-btn:hover { background: rgba(79, 169, 129,0.08); color: var(--accent-primary); }
      `}</style>
    </div>
  )
}
