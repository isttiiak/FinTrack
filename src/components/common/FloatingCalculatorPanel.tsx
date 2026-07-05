import { useEffect, useRef, useState } from 'react'
import { motion, useDragControls, useMotionValue } from 'framer-motion'
import { Check, Copy, GripHorizontal, X } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { evaluate } from '@/lib/calculator'
import { cn, round2 } from '@/lib/utils'
import { scaleIn } from '@/lib/animations'

const KEYS: { label: string; kind: 'digit' | 'op' | 'clear' | 'equals'; value: string }[][] = [
  [
    { label: 'C', kind: 'clear', value: 'C' },
    { label: '(', kind: 'op', value: '(' },
    { label: ')', kind: 'op', value: ')' },
    { label: '⌫', kind: 'clear', value: 'back' },
  ],
  [
    { label: '7', kind: 'digit', value: '7' },
    { label: '8', kind: 'digit', value: '8' },
    { label: '9', kind: 'digit', value: '9' },
    { label: '÷', kind: 'op', value: '/' },
  ],
  [
    { label: '4', kind: 'digit', value: '4' },
    { label: '5', kind: 'digit', value: '5' },
    { label: '6', kind: 'digit', value: '6' },
    { label: '×', kind: 'op', value: '*' },
  ],
  [
    { label: '1', kind: 'digit', value: '1' },
    { label: '2', kind: 'digit', value: '2' },
    { label: '3', kind: 'digit', value: '3' },
    { label: '−', kind: 'op', value: '-' },
  ],
  [
    { label: '0', kind: 'digit', value: '0' },
    { label: '.', kind: 'digit', value: '.' },
    { label: '%', kind: 'op', value: '%' },
    { label: '+', kind: 'op', value: '+' },
  ],
]

export default function FloatingCalculatorPanel() {
  const calculatorPosition = useUIStore((s) => s.calculatorPosition)
  const setCalculatorPosition = useUIStore((s) => s.setCalculatorPosition)
  const setCalculatorOpen = useUIStore((s) => s.setCalculatorOpen)

  const [expression, setExpression] = useState('')
  const [committedValue, setCommittedValue] = useState(0)
  const [copied, setCopied] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const constraintsRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  const x = useMotionValue(calculatorPosition.x)
  const y = useMotionValue(calculatorPosition.y)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const maxX = Math.max(8, window.innerWidth - rect.width - 8)
    const maxY = Math.max(8, window.innerHeight - rect.height - 8)

    // Default first-open position: just above the trigger FAB. The FAB sits
    // at left:24px on mobile, but shifts to left:264px on desktop to clear
    // the fixed 240px sidebar — mirror that here so the panel opens where
    // the button visually is.
    const isDesktop = window.innerWidth >= 769
    const defaultX = isDesktop ? 264 : 24
    const isUnset = calculatorPosition.x === 0 && calculatorPosition.y === 0
    const nextX = isUnset ? Math.min(defaultX, maxX) : Math.min(Math.max(calculatorPosition.x, 8), maxX)
    const nextY = isUnset ? Math.max(8, maxY - 100) : Math.min(Math.max(calculatorPosition.y, 8), maxY)
    x.set(nextX)
    y.set(nextY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDragEnd() {
    setCalculatorPosition({ x: x.get(), y: y.get() })
  }

  function updateExpression(next: string) {
    if (next.length > 64) return
    setExpression(next)
    const result = evaluate(next)
    if (result.ok) setCommittedValue(round2(result.value))
  }

  function pressKey(key: (typeof KEYS)[number][number]) {
    if (key.kind === 'clear' && key.value === 'C') {
      setExpression('')
      setCommittedValue(0)
      return
    }
    if (key.kind === 'clear' && key.value === 'back') {
      updateExpression(expression.slice(0, -1))
      return
    }
    updateExpression(expression + key.value)
  }

  function pressEquals() {
    const result = evaluate(expression)
    if (result.ok) {
      const rounded = round2(result.value)
      setExpression(String(rounded))
      setCommittedValue(rounded)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(String(committedValue))
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // clipboard permission denied — nothing more we can do here
    }
  }

  return (
    <div ref={constraintsRef} className="fcp-constraints">
      <motion.div
        ref={panelRef}
        className="fcp-panel"
        style={{ x, y }}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        variants={scaleIn}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="fcp-header" onPointerDown={(e) => dragControls.start(e)}>
          <GripHorizontal size={16} className="fcp-grip" />
          <span className="fcp-title">Calculator</span>
          <button
            type="button"
            className="fcp-close"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setCalculatorOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="fcp-screen">
          <button type="button" className="fcp-copy" onClick={handleCopy} title="Copy result">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <div className="fcp-expression">{expression || '0'}</div>
          <div className="fcp-result">{committedValue}</div>
        </div>

        <div className="fcp-grid">
          {KEYS.flat().map((key) => (
            <button
              key={key.label + key.kind}
              type="button"
              className={cn(
                'fcp-key',
                key.kind === 'op' && 'fcp-key-op',
                key.kind === 'clear' && 'fcp-key-clear',
              )}
              onClick={() => pressKey(key)}
            >
              {key.label}
            </button>
          ))}
          <button type="button" className="fcp-key fcp-key-equals" onClick={pressEquals}>
            =
          </button>
        </div>
      </motion.div>

      <style>{`
        .fcp-constraints {
          position: fixed; inset: 0; z-index: 300; pointer-events: none;
        }
        .fcp-panel {
          position: absolute; top: 0; left: 0; pointer-events: auto;
          width: 280px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          padding: 14px;
        }
        @media (max-width: 400px) { .fcp-panel { width: 250px; padding: 10px; } }

        .fcp-header {
          display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
          cursor: grab; user-select: none;
        }
        .fcp-header:active { cursor: grabbing; }
        .fcp-grip { color: var(--text-muted); }
        .fcp-title { flex: 1; font-size: 14px; font-weight: 700; color: var(--text-primary); }
        .fcp-close {
          width: 26px; height: 26px; border-radius: 7px;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .fcp-close:hover { background: var(--bg-card); color: var(--text-primary); }

        .fcp-screen {
          position: relative;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          padding: 12px 14px; margin-bottom: 12px;
        }
        .fcp-copy {
          position: absolute; top: 8px; right: 8px;
          width: 26px; height: 26px; border-radius: 7px;
          background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.3);
          color: var(--accent-primary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .fcp-copy:hover { background: rgba(108,99,255,0.2); }
        .fcp-expression {
          font-size: 12px; color: var(--text-muted);
          white-space: nowrap; overflow-x: auto; margin-bottom: 2px;
        }
        .fcp-result {
          font-size: 26px; font-weight: 700; color: var(--text-primary);
          white-space: nowrap; overflow-x: auto;
        }

        .fcp-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
        }
        .fcp-key {
          height: 44px; border-radius: 10px;
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-primary); font-size: 15px; font-weight: 600; cursor: pointer;
          transition: background 0.12s;
        }
        .fcp-key:hover { background: var(--bg-hover); }
        .fcp-key-op {
          background: rgba(108,99,255,0.1); border-color: rgba(108,99,255,0.3); color: var(--accent-primary);
        }
        .fcp-key-op:hover { background: rgba(108,99,255,0.2); }
        .fcp-key-clear {
          background: rgba(249,115,22,0.12); border-color: rgba(249,115,22,0.3); color: var(--accent-coral);
        }
        .fcp-key-clear:hover { background: rgba(249,115,22,0.2); }
        .fcp-key-equals {
          grid-column: span 4;
          background: linear-gradient(135deg, #6C63FF, #A855F7);
          border: none; color: #fff;
        }
      `}</style>
    </div>
  )
}
