import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import ExpenseForm from './ExpenseForm'

export default function QuickAddFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <motion.button
        className="fab"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.08, boxShadow: '0 8px 30px rgba(108,99,255,0.55)' }}
        whileTap={{ scale: 0.93 }}
        title="Add transaction"
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus size={24} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && <ExpenseForm onClose={() => setOpen(false)} />}
      </AnimatePresence>

      <style>{`
        .fab {
          position: fixed; bottom: 88px; right: 24px; z-index: 20;
          width: 56px; height: 56px; border-radius: 16px;
          background: linear-gradient(135deg, #6C63FF, #A855F7);
          border: none; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 20px rgba(108,99,255,0.45);
        }
        @media (min-width: 769px) {
          .fab { bottom: 32px; }
        }
      `}</style>
    </>
  )
}
