import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useConfirmStore } from '@/stores/confirmStore'

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

      <style>{`
        .cd-overlay {
          position: fixed; inset: 0; z-index: 9000;
          background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }

        .cd-card {
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 20px; padding: 32px 28px; width: 100%; max-width: 420px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6);
          display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px;
        }
        .cd-card-danger { border-color: rgba(194, 91, 85,0.3); }

        .cd-icon {
          width: 64px; height: 64px; border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 4px;
        }
        .cd-icon-warn {
          background: rgba(201, 115, 110,0.12); color: var(--accent-coral);
          border: 1px solid rgba(201, 115, 110,0.25);
        }
        .cd-icon-danger {
          background: rgba(194, 91, 85,0.12); color: var(--accent-red);
          border: 1px solid rgba(194, 91, 85,0.3);
          animation: cd-pulse 1.4s ease-in-out infinite;
        }
        @keyframes cd-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(194, 91, 85,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(194, 91, 85,0); }
        }

        .cd-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .cd-title-danger { color: var(--accent-red); }
        .cd-desc { font-size: 14px; color: var(--text-secondary); margin: 0; line-height: 1.5; max-width: 340px; }

        .cd-item-name {
          font-size: 13px; font-weight: 500; color: var(--text-primary);
          background: var(--bg-card); border: 1px solid var(--border);
          padding: 8px 16px; border-radius: 10px; max-width: 100%;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .cd-actions { display: flex; gap: 10px; width: 100%; margin-top: 8px; }
        .cd-btn-cancel {
          flex: 1; padding: 11px 16px; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .cd-btn-cancel:hover { background: var(--bg-hover); color: var(--text-primary); }
        .cd-btn-cancel-lg { flex: 1.4; font-weight: 600; }

        .cd-btn-delete {
          flex: 1; padding: 11px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;
          background: rgba(201, 115, 110,0.12); border: 1px solid rgba(201, 115, 110,0.35); color: var(--accent-coral);
          transition: background 0.15s;
        }
        .cd-btn-delete:hover { background: rgba(201, 115, 110,0.22); }

        .cd-btn-final {
          flex: 1.6; padding: 11px 16px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer;
          background: linear-gradient(135deg, #C25B55, #DC2626); border: none; color: #fff;
          transition: opacity 0.15s; box-shadow: 0 4px 14px rgba(194, 91, 85,0.35);
        }
        .cd-btn-final:hover { opacity: 0.88; }
      `}</style>
    </>
  )
}
