import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'

export default function SettingsPage() {
  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Budget limits, categories, data export, and account management</p>
      </div>

      <div className="settings-placeholder">
        Budget limits, category management, data export (Excel / CSV), and account deletion flow — coming soon.
      </div>

      <style>{`.page-container{max-width:700px}.page-title{font-size:28px;font-weight:700;color:var(--text-primary);margin:0 0 4px}.page-subtitle{font-size:14px;color:var(--text-secondary);margin:0}.settings-placeholder{padding:20px;background:var(--bg-elevated);border:1px dashed var(--border);border-radius:12px;font-size:13px;color:var(--text-muted)}`}</style>
    </motion.div>
  )
}
