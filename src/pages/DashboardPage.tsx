import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Wallet, TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const KPI_CARDS = [
  { label: 'Spent this month', value: '৳12,480', sub: '+8% vs last month', up: true,  icon: Wallet,      color: 'coral' },
  { label: 'Total lent',       value: '৳15,000', sub: '2 people owe you',  up: null,  icon: TrendingUp,  color: 'teal' },
  { label: 'Total debt',       value: '৳12,000', sub: 'You owe 2 people',  up: null,  icon: TrendingDown, color: 'coral' },
  { label: 'No-spend streak',  value: '3 days',  sub: 'Keep it up!',       up: null,  icon: Zap,         color: 'purple' },
]

export default function DashboardPage() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="page-container"
    >
      <motion.div variants={staggerItem} className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your financial snapshot</p>
      </motion.div>

      <motion.div className="kpi-grid" variants={staggerContainer}>
        {KPI_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              className={`kpi-card kpi-card-${card.color}`}
              variants={staggerItem}
              whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
            >
              <div className="kpi-icon-wrap">
                <Icon size={18} />
              </div>
              <div className="kpi-label">{card.label}</div>
              <div className="kpi-value">{card.value}</div>
              <div className="kpi-sub">
                {card.up !== null && (
                  card.up
                    ? <ArrowUpRight size={12} style={{ color: 'var(--accent-red)' }} />
                    : <ArrowDownRight size={12} style={{ color: 'var(--accent-teal)' }} />
                )}
                {card.sub}
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div className="coming-soon-note" variants={staggerItem}>
        Full dashboard widgets — charts, trends, and quick-add — coming in the next build.
      </motion.div>

      <style>{`
        .page-container { max-width: 900px; }
        .page-header { margin-bottom: 24px; }
        .page-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
        .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .kpi-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          cursor: default;
        }
        .kpi-card:hover { box-shadow: 0 4px 20px rgba(108,99,255,0.15); }

        .kpi-icon-wrap {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .kpi-card-purple .kpi-icon-wrap { background: rgba(108,99,255,0.15); color: var(--accent-primary); }
        .kpi-card-teal   .kpi-icon-wrap { background: rgba(16,185,129,0.15);  color: var(--accent-teal); }
        .kpi-card-coral  .kpi-icon-wrap { background: rgba(249,115,22,0.15);  color: var(--accent-coral); }

        .kpi-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .kpi-value { font-size: 26px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
        .kpi-sub { font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }

        .coming-soon-note {
          padding: 16px 20px;
          background: var(--bg-elevated);
          border: 1px dashed var(--border);
          border-radius: 12px;
          font-size: 13px; color: var(--text-muted);
          text-align: center;
        }
      `}</style>
    </motion.div>
  )
}
