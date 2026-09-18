import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import './SearchToggle.css'

interface SearchToggleProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

// Collapsed: a plain bordered icon button, matching the `.filter-toggle-btn`/
// `.ef-close` icon-button convention. Click expands it in place into a
// bordered text input (borrowing CategoryCombobox's search-row layout) that
// filters live, no submit. Collapses back on explicit close or blur-while-empty.
export default function SearchToggle({ value, onChange, placeholder = 'Search…', className }: SearchToggleProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // A value set from outside (e.g. the command palette jumping to a transaction)
  // must not sit behind a collapsed icon with no sign a filter is active.
  useEffect(() => {
    if (value) setOpen(true)
  }, [value])

  function handleBlur() {
    if (!value) setOpen(false)
  }

  function handleClose() {
    onChange('')
    setOpen(false)
  }

  return (
    <div className={cn('stg-wrap', className)}>
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="open"
            className="stg-input-row"
            initial={{ width: 34, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 34, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Search size={14} className="stg-icon" />
            <input
              ref={inputRef}
              type="text"
              className="stg-input"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={handleBlur}
            />
            {value && (
              <button
                type="button"
                className="stg-clear"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange('')}
              >
                <X size={12} />
              </button>
            )}
            <button
              type="button"
              className="stg-close"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClose}
            >
              <X size={13} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="closed"
            type="button"
            className={cn('stg-icon-btn', value && 'stg-icon-btn-active')}
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Search size={15} />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  )
}
