import { Outlet } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Search } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import CommandPalette from '@/components/common/CommandPalette'
import CalculatorToggleButton from '@/components/common/CalculatorToggleButton'
import FloatingCalculatorPanel from '@/components/common/FloatingCalculatorPanel'
import { Logo } from '@/components/common/Logo'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import './AppShell.css'

export default function AppShell() {
  const isDemo = useDemoStore((s) => s.isDemo)
  const { toggleSidebar, calculatorOpen, setPaletteOpen } = useUIStore()

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
          <div className="topbar-actions">
            <button className="topbar-calc-btn" onClick={() => setPaletteOpen(true)} aria-label="Search" title="Search">
              <Search size={20} />
            </button>
            <CalculatorToggleButton className="topbar-calc-btn" />
          </div>
        </header>

        {/* Page content — each page handles its own entrance animation */}
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <ConfirmDialog />
      <CommandPalette />
      <AnimatePresence>
        {calculatorOpen && <FloatingCalculatorPanel />}
      </AnimatePresence>

    </div>
  )
}
