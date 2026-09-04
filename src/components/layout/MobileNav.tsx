import { Link, useRouterState } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { LayoutDashboard, Receipt, Users, BarChart3, TrendingUp, Menu } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Home',     icon: LayoutDashboard },
  { to: '/expenses',   label: 'Expenses', icon: Receipt },
  { to: '/ledger',     label: 'Ledger',   icon: Users },
  { to: '/investments', label: 'Invest',    icon: TrendingUp },
  { to: '/analytics',   label: 'Analytics', icon: BarChart3 },
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
    </nav>
  )
}
