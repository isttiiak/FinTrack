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
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/expenses',   label: 'Expenses',   icon: Receipt },
  { to: '/ledger',     label: 'Lent & Debt', icon: Users },
  { to: '/analytics',  label: 'Analytics',  icon: BarChart3 },
] as const

const BOTTOM_ITEMS = [
  { to: '/profile',  label: 'Profile',  icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export default function Sidebar() {
  const location = useRouterState({ select: (s) => s.location.pathname })
  const { profile } = useAuthStore()
  const { isDemo, exitDemo } = useDemoStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

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
          <div className="sidebar-logo">
            <span>৳</span>
          </div>
          <div>
            <div className="sidebar-brand-name">FinTrack</div>
            <div className="sidebar-brand-tagline">Personal Finance</div>
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

      <style>{sidebarStyles}</style>
    </>
  )
}

const sidebarStyles = `
.sidebar-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 30;
  display: none;
}
@media (max-width: 768px) {
  .sidebar-overlay { display: block; }
}

.sidebar {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: 240px; z-index: 40;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 20px 12px;
  transition: transform 0.25s ease;
}
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.sidebar-open { transform: translateX(0); }
}
@media (min-width: 769px) {
  .sidebar-close-btn { display: none; }
}

.sidebar-close-btn {
  position: absolute; top: 16px; right: 12px;
  background: none; border: none;
  color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px;
}
.sidebar-close-btn:hover { color: var(--text-primary); background: var(--bg-hover); }

.sidebar-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 0 8px 20px;
}
.sidebar-logo {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, #6C63FF, #A855F7);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(108,99,255,0.3);
}
.sidebar-brand-name { font-size: 16px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
.sidebar-brand-tagline { font-size: 11px; color: var(--text-muted); }

.sidebar-demo-banner {
  display: flex; align-items: center; gap: 6px; justify-content: center;
  padding: 5px 10px; margin: 0 0 12px;
  background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.25); border-radius: 8px;
  font-size: 11px; font-weight: 500; color: var(--accent-primary);
}

.sidebar-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }

.sidebar-nav-item {
  position: relative; display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  font-size: 14px; font-weight: 500; color: var(--text-secondary);
  text-decoration: none; transition: color 0.15s;
}
.sidebar-nav-item:hover { color: var(--text-primary); background: var(--bg-hover); }
.sidebar-nav-item-active { color: var(--text-primary); }
.sidebar-active-bg {
  position: absolute; inset: 0; border-radius: 10px;
  background: var(--bg-elevated);
  border: 1px solid rgba(108,99,255,0.2);
  z-index: -1;
}

.sidebar-bottom { display: flex; flex-direction: column; gap: 2px; }
.sidebar-divider { height: 1px; background: var(--border); margin: 8px 0; }

.sidebar-user {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 10px;
}
.sidebar-avatar {
  width: 32px; height: 32px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
  background: linear-gradient(135deg, #6C63FF, #A855F7);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; color: #fff;
}
.sidebar-avatar img { width: 100%; height: 100%; object-fit: cover; }
.sidebar-user-info { flex: 1; min-width: 0; }
.sidebar-user-name { font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar-user-email { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar-signout-btn {
  background: none; border: none; color: var(--text-muted); cursor: pointer;
  padding: 4px; border-radius: 6px; flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}
.sidebar-signout-btn:hover { color: var(--accent-red); background: rgba(239,68,68,0.1); }
`
