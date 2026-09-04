import { Calculator } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface CalculatorToggleButtonProps {
  className?: string
  showLabel?: boolean
}

// Was a circular FAB fixed over every page's scrollable content — it sat
// on top of whatever list row happened to scroll underneath it, not just
// the last one, which is a real "can't read the text behind it" bug, not
// just a visual nicety. Moved into the topbar (mobile) / sidebar (desktop)
// instead, where it's a normal toolbar button that never overlaps content.
export default function CalculatorToggleButton({ className, showLabel }: CalculatorToggleButtonProps) {
  const calculatorOpen = useUIStore((s) => s.calculatorOpen)
  const setCalculatorOpen = useUIStore((s) => s.setCalculatorOpen)

  return (
    <button
      type="button"
      className={cn('calc-toggle-btn', calculatorOpen && 'calc-toggle-btn-active', className)}
      onClick={() => setCalculatorOpen(!calculatorOpen)}
      aria-label="Calculator"
      aria-pressed={calculatorOpen}
      title="Calculator"
    >
      <Calculator size={showLabel ? 18 : 20} />
      {showLabel && <span>Calculator</span>}
    </button>
  )
}
