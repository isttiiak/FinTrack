import { Link, useRouterState } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { LayoutDashboard, Receipt, Users, BarChart3, Menu } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Home',     icon: LayoutDashboard },
  { to: '/expenses',   label: 'Expenses', icon: Receipt },
  { to: '/ledger',     label: 'Ledger',   icon: Users },
  { to: '/analytics',  label: 'Analytics', icon: BarChart3 },
] as const

export default function MobileNav() {
  const location = useRouterState({ select: (s) => s.location.pathname })
  const { toggleSidebar } = useUIStore()

  return (
    <nav className="mobile-nav">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        const active = location === to || location.startsWith(to + '/')
        return (
          <Link key={to} to={to} className={cn('mobile-nav-item', active && 'mobile-nav-item-active')}>
            {active && (
              <motion.div className="mobile-nav-indicator" layoutId="mobile-nav-indicator" />
            )}
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        )
      })}
      <button className="mobile-nav-item mobile-nav-menu-btn" onClick={toggleSidebar}>
        <Menu size={20} />
        <span>More</span>
      </button>

      <style>{`
        .mobile-nav {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          padding: 8px 0 env(safe-area-inset-bottom, 8px);
        }
        @media (max-width: 768px) { .mobile-nav { display: flex; } }

        .mobile-nav-item {
          position: relative; flex: 1;
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 6px 4px;
          font-size: 10px; font-weight: 500;
          color: var(--text-muted); text-decoration: none;
          background: none; border: none; cursor: pointer;
          transition: color 0.15s;
        }
        .mobile-nav-item-active { color: var(--accent-primary); }
        .mobile-nav-menu-btn { color: var(--text-muted); }
        .mobile-nav-menu-btn:hover { color: var(--text-primary); }

        .mobile-nav-indicator {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 24px; height: 3px; border-radius: 0 0 3px 3px;
          background: var(--accent-primary);
        }
      `}</style>
    </nav>
  )
}
