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

      <style>{`
        .calc-fab {
          position: fixed; bottom: 88px; left: 24px; z-index: 20;
          width: 56px; height: 56px; border-radius: 16px;
          background: linear-gradient(135deg, #4FA981, #3E9B72);
          border: none; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 20px rgba(79, 169, 129,0.45);
        }
        @media (min-width: 769px) {
          /* Desktop sidebar is fixed, 240px wide, z-index:40 — left:24px would
             render directly underneath it, so shift clear of the sidebar. */
          .calc-fab { bottom: 32px; left: 264px; }
        }
      `}</style>
    </>
  )
}
