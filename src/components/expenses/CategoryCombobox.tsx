import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Check, ChevronDown, X, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import CategoryManagerModal from './CategoryManagerModal'
import type { Category } from '@/types/expense.types'
import type { TxnType } from '@/lib/constants'
import './CategoryCombobox.css'

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

    </div>
  )
}
