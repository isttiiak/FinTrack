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
      deleteExpense(id)
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
            {txn.original_currency && txn.original_amount != null && (
              <div className="expense-card-original">
                originally {formatCurrency(txn.original_amount, txn.original_currency)}
              </div>
            )}

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

export const expenseCardStyles = `
.expense-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: default;
  transition: background 0.15s, border-color 0.15s;
  position: relative;
}
.expense-card:hover { background: var(--bg-hover); border-color: rgba(108,99,255,0.2); }

.expense-card-icon {
  font-size: 22px; width: 36px; height: 36px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-elevated); border-radius: 10px;
}

.expense-card-body { flex: 1; min-width: 0; }
.expense-card-name { font-size: 14px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.expense-card-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.expense-card-method-chip {
  display: inline-block; margin-top: 4px;
  padding: 1px 7px; border-radius: 10px;
  font-size: 10px; font-weight: 500;
  background: var(--bg-elevated); color: var(--text-muted);
  border: 1px solid var(--border);
}

.expense-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.expense-card-amount { font-size: 14px; font-weight: 600; }
.expense-amount-income { color: var(--accent-teal); }
.expense-amount-expense { color: var(--text-primary); }
.expense-card-original { font-size: 10px; color: var(--text-muted); }

.expense-card-actions { display: flex; gap: 4px; }
.expense-action-btn {
  height: 26px; padding: 0 8px; border-radius: 6px; gap: 4px;
  display: flex; align-items: center; font-size: 12px; font-weight: 600;
  border: 1px solid var(--border); cursor: pointer; white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.expense-action-edit { background: var(--bg-elevated); color: var(--text-secondary); }
`
