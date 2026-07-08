import { Outlet } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import FloatingCalculatorFAB from '@/components/common/FloatingCalculatorFAB'
import { Logo } from '@/components/common/Logo'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'

export default function AppShell() {
  const isDemo = useDemoStore((s) => s.isDemo)
  const { toggleSidebar } = useUIStore()

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        {/* Demo banner */}
        <AnimatePresence>
          {isDemo && (
            <motion.div
              className="demo-banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <span>Demo mode — data is not saved.</span>
              <a href="/signup" className="demo-banner-cta">Sign up to keep your data →</a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile topbar */}
        <header className="app-topbar">
          <button className="topbar-menu-btn" onClick={toggleSidebar} aria-label="Open sidebar">
            <Menu size={20} />
          </button>
          <div className="topbar-brand">
            <Logo size={24} />
            <span>FinTrack</span>
          </div>
          <div style={{ width: 36 }} />
        </header>

        {/* Page content — each page handles its own entrance animation */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <ConfirmDialog />
      <FloatingCalculatorFAB />

      <style>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg-page);
        }

        .app-main {
          flex: 1;
          margin-left: 240px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .app-main { margin-left: 0; padding-bottom: 64px; }
        }

        .demo-banner {
          background: linear-gradient(135deg, rgba(79, 169, 129,0.15), rgba(62, 155, 114,0.1));
          border-bottom: 1px solid rgba(79, 169, 129,0.2);
          overflow: hidden;
        }
        .demo-banner > * {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          padding: 8px 16px;
          font-size: 13px; color: var(--text-secondary); flex-wrap: wrap;
        }
        .demo-banner-cta {
          color: var(--accent-primary); font-weight: 600; text-decoration: none;
        }
        .demo-banner-cta:hover { text-decoration: underline; }

        .app-topbar {
          display: none;
          align-items: center; justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
        }
        @media (max-width: 768px) { .app-topbar { display: flex; } }

        .topbar-menu-btn {
          width: 36px; height: 36px; border-radius: 8px;
          background: var(--bg-elevated); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .topbar-menu-btn:hover { background: var(--bg-hover); }

        .topbar-brand {
          display: flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 700; color: var(--text-primary);
        }

        .app-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          overflow-x: hidden;
          min-width: 0;
        }
        @media (max-width: 768px) { .app-content { padding: 14px; } }
        @media (max-width: 400px) { .app-content { padding: 10px; } }
      `}</style>
    </div>
  )
}
