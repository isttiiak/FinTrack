import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2 } from 'lucide-react'
import DeleteButton from '@/components/common/DeleteButton'
import type { Transaction } from '@/types/expense.types'
import { formatCurrency } from '@/lib/utils'
import { useDeleteExpense } from '@/hooks/useExpenses'
import { useUIStore } from '@/stores/uiStore'

interface ExpenseCardProps {
  txn: Transaction
  onEdit: (txn: Transaction) => void
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  Food: '🍚', Restaurants: '🍽️', Coffee: '☕', Fruits: '🍎', 'Dry Food': '🛒',
  Chicken: '🍗', 'Ricksha Fare': '🛺', 'Bus Fare': '🚌', 'Uber/Pathao': '🛵',
  'Phone Bill': '📱', 'Internet Bill': '🌐', Laundry: '👕', Medical: '💊',
  Entertainment: '🎬', Education: '📚', Shopping: '🛍️', Fragrance: '🌸',
  Treats: '🍭', Donate: '❤️', Gift: '🎁', Others: '📌', 'Cashout Charge': '💸',
  Salary: '💰', Savings: '🏦', Business: '💼', 'Gift Received': '🎀',
}

export default function ExpenseCard({ txn, onEdit }: ExpenseCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { mutate: deleteExpense } = useDeleteExpense()
  const addToast = useUIStore((s) => s.addToast)

  const catName = txn.category?.name ?? 'Uncategorised'
  const icon = CATEGORY_ICON_MAP[catName] ?? '📌'
  const isIncome = txn.type === 'Income'

  function handleDelete() {
    setDeleting(true)
    const id = txn.id
    addToast({
      type: 'info',
      message: 'Transaction deleted',
      duration: 3500,
      action: {
        label: 'Undo',
        onClick: () => {
          setDeleting(false)
        },
      },
    })
    setTimeout(() => {
      // If the mutation is blocked (e.g. demo mode) or fails, the card must
      // reappear — otherwise it stays hidden forever even though nothing
      // was actually deleted, contradicting the "Undo" the toast promised.
      deleteExpense(id, { onError: () => setDeleting(false) })
    }, 3600)
  }

  return (
    <AnimatePresence>
      {!deleting && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -60, transition: { duration: 0.25 } }}
          className="expense-card"
          onHoverStart={() => setShowActions(true)}
          onHoverEnd={() => setShowActions(false)}
          onTouchStart={() => setShowActions((v) => !v)}
        >
          <div className="expense-card-icon">{icon}</div>

          <div className="expense-card-body">
            <div className="expense-card-name">{catName}</div>
            {txn.description && (
              <div className="expense-card-desc">{txn.description}</div>
            )}
            {txn.payment_method && (
              <span className="expense-card-method-chip">{txn.payment_method}</span>
            )}
          </div>

          <div className="expense-card-right">
            <div className={`expense-card-amount ${isIncome ? 'expense-amount-income' : 'expense-amount-expense'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
            </div>

            <AnimatePresence>
              {showActions && (
                <motion.div
                  className="expense-card-actions"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.1 }}
                >
                  <button
                    className="expense-action-btn expense-action-edit edit-btn-purple"
                    onClick={() => onEdit(txn)}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <DeleteButton onConfirm={handleDelete} iconSize={13} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

