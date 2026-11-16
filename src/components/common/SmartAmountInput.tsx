import { useEffect, useRef, useState } from 'react'
import { cn, round2 } from '@/lib/utils'
import { evaluate, hasOperator } from '@/lib/calculator'

interface SmartAmountInputProps {
  value: number | null | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  className?: string
  error?: boolean
  autoFocus?: boolean
  disabled?: boolean
  id?: string
}

// Whether a mouse/pen/finger is currently pressed anywhere on the page —
// see handleBlur. Capture phase so it's set before any element's handlers.
let pointerIsDown = false
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { pointerIsDown = true }, true)
  window.addEventListener('pointerup', () => { pointerIsDown = false }, true)
  window.addEventListener('pointercancel', () => { pointerIsDown = false }, true)
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
  const [rawText, setRawText] = useState(value != null && !Number.isNaN(value) ? String(value) : '')
  const [focused, setFocused] = useState(false)
  const lastEmitted = useRef<number | null | undefined>(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync in external resets (e.g. edit-mode defaultValues) without fighting
  // this component's own emitted updates.
  useEffect(() => {
    if (!Object.is(value, lastEmitted.current)) {
      setRawText(value != null && !Number.isNaN(value) ? String(value) : '')
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
      // Emit null rather than undefined so React Hook Form <Controller> does not
      // treat an intentionally cleared field as unset and revert to defaultValues.
      const emptyValue = null as unknown as number | undefined
      lastEmitted.current = emptyValue
      onChange(emptyValue)
    } else {
      lastEmitted.current = Number.NaN
      onChange(Number.NaN)
    }
  }

  function handleChange(text: string) {
    setRawText(text)
    commit(text)
  }

  function handleBlur() {
    // Collapsing the chip row reflows whatever sits below this field (e.g.
    // the Category combobox in ExpenseForm). If that happens between the
    // mousedown and mouseup of the click that caused this blur, the two land
    // on different elements and the browser fires no click at all — the user
    // has to click twice. A setTimeout(0) alone isn't enough: it still fires
    // while the button is held. So when a pointer is down, wait for it to be
    // released (and the click dispatched) before collapsing. Touch and
    // keyboard blurs arrive with no pointer held and just defer a tick.
    const collapse = () => {
      if (document.activeElement !== inputRef.current) setFocused(false)
    }
    if (pointerIsDown) {
      window.addEventListener('pointerup', () => setTimeout(collapse, 0), { once: true })
    } else {
      setTimeout(collapse, 0)
    }
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

  const evalResult = evaluate(rawText)
  const preview = hasOperator(rawText) ? evalResult : null
  const invalidOnBlur = !focused && rawText.trim().length > 0 && !evalResult.ok

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

      {invalidOnBlur ? (
        <p className="sai-error-hint" style={{ fontSize: 11, color: 'var(--accent-red)', margin: '4px 0 0' }}>
          Invalid expression — finish typing or clear
        </p>
      ) : preview && (
        <p className={cn('sai-preview', !preview.ok && 'sai-preview-error')}>
          {preview.ok
            ? `= ${round2(preview.value)}`
            : preview.reason === 'div-by-zero'
              ? "can't divide by zero"
              : 'keep typing…'}
        </p>
      )}
    </div>
  )
}
