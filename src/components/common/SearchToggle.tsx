import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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

      <style>{`
        .stg-wrap { display: inline-flex; align-items: center; }

        .stg-icon-btn {
          width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .stg-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .stg-icon-btn-active { border-color: var(--accent-primary); color: var(--accent-primary); }

        .stg-input-row {
          display: flex; align-items: center; gap: 7px; overflow: hidden;
          height: 34px; padding: 0 10px; border-radius: 8px;
          background: var(--bg-card); border: 1px solid var(--border-focus);
          box-shadow: 0 0 0 3px rgba(79, 169, 129,0.15);
        }
        .stg-icon { color: var(--text-muted); flex-shrink: 0; }
        .stg-input {
          flex: 1; min-width: 0; background: none; border: none; outline: none;
          color: var(--text-primary); font-size: 13px;
        }
        .stg-input::placeholder { color: var(--text-muted); }
        .stg-clear, .stg-close {
          background: none; border: none; color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; padding: 0; flex-shrink: 0;
        }
        .stg-clear:hover, .stg-close:hover { color: var(--text-primary); }
      `}</style>
    </div>
  )
}
