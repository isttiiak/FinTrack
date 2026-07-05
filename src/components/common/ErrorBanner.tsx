import { motion } from 'framer-motion'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { fadeUp } from '@/lib/animations'

interface ErrorBannerProps {
  message?: string
  onRetry: () => void
}

export default function ErrorBanner({
  message = "Couldn't load some of your data — your connection or session may have hiccuped.",
  onRetry,
}: ErrorBannerProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 12,
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        marginBottom: 16,
      }}
    >
      <AlertTriangle size={16} color="var(--accent-red)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{message}</span>
      <button
        onClick={onRetry}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--accent-red)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <RotateCw size={13} /> Retry
      </button>
    </motion.div>
  )
}
