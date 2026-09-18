import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useConfirmStore } from '@/stores/confirmStore'
import './ConfirmDialog.css'

export default function ConfirmDialog() {
  const { open, step, config, next, accept, cancel } = useConfirmStore()

  return (
    <>
      <AnimatePresence>
        {open && config && (
          <motion.div
            className="cd-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={cancel}
          >
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  className="cd-card"
                  initial={{ opacity: 0, scale: 0.88, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -8 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="cd-icon cd-icon-warn">
                    <Trash2 size={26} />
                  </div>

                  <h2 className="cd-title">{config.title}</h2>
                  <p className="cd-desc">{config.description}</p>

                  {config.itemName && (
                    <div className="cd-item-name">{config.itemName}</div>
                  )}

                  <div className="cd-actions">
                    <button className="cd-btn-cancel" onClick={cancel}>
                      Cancel
                    </button>
                    <button className="cd-btn-delete" onClick={next}>
                      Delete &rarr;
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  className="cd-card cd-card-danger"
                  initial={{ opacity: 0, scale: 0.88, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="cd-icon cd-icon-danger">
                    <AlertTriangle size={28} />
                  </div>

                  <h2 className="cd-title cd-title-danger">Are you absolutely sure?</h2>
                  <p className="cd-desc">
                    This action <strong style={{ color: 'var(--accent-red)' }}>cannot be undone</strong>.
                    The data will be permanently removed and cannot be recovered.
                  </p>

                  <div className="cd-actions">
                    <button className="cd-btn-cancel cd-btn-cancel-lg" onClick={cancel}>
                      No, keep it
                    </button>
                    <button className="cd-btn-final" onClick={accept}>
                      Yes, permanently delete
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  )
}
