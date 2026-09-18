import { Link, useRouterState } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Receipt,
  Users,
  BarChart3,
  Settings,
  User,
  LogOut,
  X,
  TrendingUp,
  Search,
  Home,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/common/Logo'
import CalculatorToggleButton from '@/components/common/CalculatorToggleButton'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/expenses',    label: 'Expenses',    icon: Receipt },
  { to: '/ledger',      label: 'Lent & Debt', icon: Users },
  { to: '/investments', label: 'Investments', icon: TrendingUp },
  { to: '/analytics',   label: 'Analytics',   icon: BarChart3 },
  { to: '/household',   label: 'Household',   icon: Home },
] as const

const BOTTOM_ITEMS = [
  { to: '/profile',  label: 'Profile',  icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export default function Sidebar() {
  const location = useRouterState({ select: (s) => s.location.pathname })
  const { profile } = useAuthStore()
  const { isDemo, exitDemo } = useDemoStore()
  const { sidebarOpen, setSidebarOpen, setPaletteOpen } = useUIStore()

  async function handleSignOut() {
    if (isDemo) {
      exitDemo()
    } else {
      await supabase.auth.signOut()
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={cn('sidebar', sidebarOpen && 'sidebar-open')}
        initial={false}
      >
        {/* Close button (mobile) */}
        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
          <X size={18} />
        </button>

        {/* Brand */}
        <div className="sidebar-brand">
          <Logo size={30} />
          <div>
            <div className="sidebar-brand-name">FinTrack</div>
            <div className="sidebar-brand-tagline">Finance, Tracked</div>
          </div>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <motion.div
            className="sidebar-demo-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TrendingUp size={12} />
            <span>Demo mode</span>
          </motion.div>
        )}

        {/* Global search / command palette (also Ctrl/Cmd+K) */}
        <button
          className="sidebar-search-btn"
          onClick={() => { setSidebarOpen(false); setPaletteOpen(true) }}
        >
          <Search size={15} />
          <span>Search…</span>
          <kbd>Ctrl K</kbd>
        </button>

        {/* Main nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location === to || location.startsWith(to + '/')
            return (
              <Link
                key={to}
                to={to}
                className={cn('sidebar-nav-item', active && 'sidebar-nav-item-active')}
                onClick={() => setSidebarOpen(false)}
              >
                {active && (
                  <motion.div className="sidebar-active-bg" layoutId="sidebar-active" />
                )}
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom nav */}
        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <CalculatorToggleButton className="sidebar-nav-item sidebar-nav-item-btn" showLabel />
          {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location === to
            return (
              <Link
                key={to}
                to={to}
                className={cn('sidebar-nav-item', active && 'sidebar-nav-item-active')}
                onClick={() => setSidebarOpen(false)}
              >
                {active && (
                  <motion.div className="sidebar-active-bg" layoutId="sidebar-active" />
                )}
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            )
          })}

          {/* User + sign out */}
          <div className="sidebar-divider" />
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name ?? 'Avatar'} />
              ) : (
                <span>{(profile?.full_name ?? isDemo ? 'D' : '?')[0].toUpperCase()}</span>
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{isDemo ? 'Demo User' : (profile?.full_name ?? 'You')}</div>
              <div className="sidebar-user-email">{isDemo ? 'demo mode' : (profile?.email ?? '')}</div>
            </div>
            <button className="sidebar-signout-btn" onClick={handleSignOut} title={isDemo ? 'Exit demo' : 'Sign out'}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.aside>

    </>
  )
}

