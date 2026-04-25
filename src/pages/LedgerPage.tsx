import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import { Users, Plus } from 'lucide-react'

export default function LedgerPage() {
  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" className="page-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Lent &amp; Debt</h1>
          <p className="page-subtitle">Track money you've lent and owe</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Add person
        </button>
      </div>

      <div className="empty-state">
        <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No ledger entries yet.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Add a person to start tracking.</p>
      </div>

      <style>{`.page-container{max-width:900px}.page-header-row{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:16px;flex-wrap:wrap}.page-title{font-size:28px;font-weight:700;color:var(--text-primary);margin:0 0 4px}.page-subtitle{font-size:14px;color:var(--text-secondary);margin:0}.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center}`}</style>
    </motion.div>
  )
}
