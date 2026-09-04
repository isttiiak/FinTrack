import { Outlet } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import CalculatorToggleButton from '@/components/common/CalculatorToggleButton'
import FloatingCalculatorPanel from '@/components/common/FloatingCalculatorPanel'
import { Logo } from '@/components/common/Logo'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'

export default function AppShell() {
  const isDemo = useDemoStore((s) => s.isDemo)
  const { toggleSidebar, calculatorOpen } = useUIStore()

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
          <CalculatorToggleButton className="topbar-calc-btn" />
        </header>

        {/* Page content — each page handles its own entrance animation */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <ConfirmDialog />
      <AnimatePresence>
        {calculatorOpen && <FloatingCalculatorPanel />}
      </AnimatePresence>

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
          padding-top: max(12px, env(safe-area-inset-top));
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

        .topbar-calc-btn {
          width: 36px; height: 36px; border-radius: 8px;
          background: var(--bg-elevated); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .topbar-calc-btn:hover { background: var(--bg-hover); }
        .topbar-calc-btn.calc-toggle-btn-active {
          color: var(--accent-primary); border-color: rgba(79, 169, 129,0.4); background: rgba(79, 169, 129,0.12);
        }

        .topbar-brand {
          display: flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 700; color: var(--text-primary);
        }

        .app-content {
          flex: 1;
          padding: 24px;
          /* Extra clearance at the bottom so scrolling to the end of
             Expenses never leaves the last row sitting under the fixed
             Quick Add FAB (bottom:32px desktop / bottom:88px mobile, see
             .fab in globals.css). The calculator used to float here too
             and covered content mid-scroll, not just at the end — moved
             into the topbar/sidebar instead (CalculatorToggleButton),
             which is the real fix for that; this padding only handles the
             one FAB that's still genuinely fixed-over-content. */
          padding-bottom: 90px;
          overflow-y: auto;
          overflow-x: hidden;
          min-width: 0;
        }
        @media (max-width: 768px) { .app-content { padding: 14px; padding-bottom: 110px; } }
        @media (max-width: 400px) { .app-content { padding: 10px; padding-bottom: 110px; } }
      `}</style>
    </div>
  )
}
