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
        whileHover={{ scale: 1.08, boxShadow: '0 8px 30px rgba(79, 169, 129,0.55)' }}
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
    </>
  )
}
