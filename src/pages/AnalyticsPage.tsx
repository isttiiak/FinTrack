import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Spending trends, category breakdowns, and no-spend calendar</p>
      </div>

      <div className="empty-state">
        <BarChart3 size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Charts coming soon.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Add some transactions first to see your analytics.</p>
      </div>

      <style>{`.page-container{max-width:900px}.page-title{font-size:28px;font-weight:700;color:var(--text-primary);margin:0 0 4px}.page-subtitle{font-size:14px;color:var(--text-secondary);margin:0}.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center}`}</style>
    </motion.div>
  )
}
