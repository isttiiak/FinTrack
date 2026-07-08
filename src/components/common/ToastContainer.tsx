import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useUIStore, type Toast } from '@/stores/uiStore'

const TYPE_STYLES: Record<Toast['type'], { icon: typeof Info; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle2, color: 'var(--accent-primary)', bg: 'rgba(79, 169, 129,0.1)', border: 'rgba(79, 169, 129,0.3)' },
  error:   { icon: XCircle,      color: 'var(--accent-red)',     bg: 'rgba(194, 91, 85,0.1)',  border: 'rgba(194, 91, 85,0.3)' },
  warning: { icon: AlertTriangle,color: 'var(--accent-gold)',    bg: 'rgba(194, 162, 78,0.1)', border: 'rgba(194, 162, 78,0.3)' },
  info:    { icon: Info,         color: 'var(--text-secondary)', bg: 'var(--bg-elevated)',     border: 'var(--border)' },
}

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((t) => {
          const { icon: Icon, color, bg, border } = TYPE_STYLES[t.type]
          return (
            <motion.div
              key={t.id}
              className="toast-item"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ background: bg, borderColor: border }}
            >
              <Icon size={16} color={color} style={{ flexShrink: 0 }} />
              <span className="toast-message">{t.message}</span>
              {t.action && (
                <button
                  className="toast-action"
                  style={{ color }}
                  onClick={() => { t.action!.onClick(); removeToast(t.id) }}
                >
                  {t.action.label}
                </button>
              )}
              <button className="toast-close" onClick={() => removeToast(t.id)} aria-label="Dismiss">
                <X size={13} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>

      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9500;
          display: flex;
          flex-direction: column-reverse;
          gap: 8px;
          width: min(360px, calc(100vw - 32px));
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .toast-container { bottom: 76px; }
        }
        .toast-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          border-radius: 12px;
          border: 1px solid;
          box-shadow: 0 12px 32px rgba(0,0,0,0.35);
          backdrop-filter: blur(8px);
          pointer-events: auto;
        }
        .toast-message { flex: 1; font-size: 13px; color: var(--text-primary); line-height: 1.4; }
        .toast-action {
          flex-shrink: 0; background: none; border: none; cursor: pointer;
          font-size: 12px; font-weight: 700; padding: 2px 4px;
        }
        .toast-close {
          flex-shrink: 0; background: none; border: none; cursor: pointer;
          color: var(--text-muted); padding: 2px; display: flex;
          border-radius: 4px; transition: color 0.15s, background 0.15s;
        }
        .toast-close:hover { color: var(--text-primary); background: var(--bg-hover); }
      `}</style>
    </div>
  )
}
