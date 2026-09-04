import { AnimatePresence, motion } from 'framer-motion'
import { Calculator } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import FloatingCalculatorPanel from './FloatingCalculatorPanel'

export default function FloatingCalculatorFAB() {
  const calculatorOpen = useUIStore((s) => s.calculatorOpen)
  const setCalculatorOpen = useUIStore((s) => s.setCalculatorOpen)

  return (
    <>
      <motion.button
        className="calc-fab"
        onClick={() => setCalculatorOpen(!calculatorOpen)}
        whileHover={{ scale: 1.08, boxShadow: '0 8px 30px rgba(79, 169, 129,0.55)' }}
        whileTap={{ scale: 0.93 }}
        title="Calculator"
      >
        <Calculator size={22} />
      </motion.button>

      <AnimatePresence>
        {calculatorOpen && <FloatingCalculatorPanel />}
      </AnimatePresence>
    </>
  )
}
