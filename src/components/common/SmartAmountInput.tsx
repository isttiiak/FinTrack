import { useEffect, useRef, useState } from 'react'
import { cn, round2 } from '@/lib/utils'
import { evaluate, hasOperator } from '@/lib/calculator'

interface SmartAmountInputProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  className?: string
  error?: boolean
  autoFocus?: boolean
  disabled?: boolean
  id?: string
}

const OPERATOR_CHIPS = [
  { label: '+', char: '+' },
  { label: '−', char: '-' },
  { label: '×', char: '*' },
  { label: '÷', char: '/' },
]

export default function SmartAmountInput({
  value,
  onChange,
  placeholder = '0.00',
  className,
  error,
  autoFocus,
  disabled,
  id,
}: SmartAmountInputProps) {
  const [rawText, setRawText] = useState(value != null ? String(value) : '')
  const [focused, setFocused] = useState(false)
  const lastEmitted = useRef(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync in external resets (e.g. edit-mode defaultValues) without fighting
  // this component's own emitted updates.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setRawText(value != null ? String(value) : '')
      lastEmitted.current = value
    }
  }, [value])

  function commit(text: string) {
    const result = evaluate(text)
    if (result.ok) {
      const rounded = round2(result.value)
      lastEmitted.current = rounded
      onChange(rounded)
    } else if (result.reason === 'empty') {
      lastEmitted.current = undefined
      onChange(undefined)
    }
    // 'invalid' | 'div-by-zero': leave the last committed value alone, let the user keep typing
  }

  function handleChange(text: string) {
    setRawText(text)
    commit(text)
  }

  function handleBlur() {
    setFocused(false)
    const result = evaluate(rawText)
    if (result.ok) setRawText(String(round2(result.value)))
  }

  function insertOperator(char: string) {
    const el = inputRef.current
    if (!el) return
    const start = el.selectionStart ?? rawText.length
    const end = el.selectionEnd ?? rawText.length
    const next = rawText.slice(0, start) + char + rawText.slice(end)
    handleChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + char.length, start + char.length)
    })
  }

  const preview = hasOperator(rawText) ? evaluate(rawText) : null

  return (
    <div className="sai-wrap">
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={rawText}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        className={cn(className, error && 'sai-input-error')}
      />

      {focused && (
        <div className="sai-chip-row">
          {OPERATOR_CHIPS.map((op) => (
            <button
              key={op.char}
              type="button"
              className="sai-chip"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertOperator(op.char)}
            >
              {op.label}
            </button>
          ))}
        </div>
      )}

      {preview && (
        <p className={cn('sai-preview', !preview.ok && 'sai-preview-error')}>
          {preview.ok
            ? `= ${round2(preview.value)}`
            : preview.reason === 'div-by-zero'
              ? "can't divide by zero"
              : 'keep typing…'}
        </p>
      )}

      <style>{`
        .sai-wrap { display: flex; flex-direction: column; gap: 6px; }
        .sai-input-error { border-color: var(--accent-red) !important; }

        .sai-chip-row { display: flex; gap: 6px; }
        .sai-chip {
          width: 34px; height: 30px; border-radius: 8px;
          background: rgba(79, 169, 129,0.1); border: 1px solid rgba(79, 169, 129,0.3);
          color: var(--accent-primary); font-size: 15px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s;
        }
        .sai-chip:hover { background: rgba(79, 169, 129,0.2); }

        .sai-preview { font-size: 12px; color: var(--accent-teal); margin: 0; font-weight: 500; }
        .sai-preview-error { color: var(--text-muted); }
      `}</style>
    </div>
  )
}
