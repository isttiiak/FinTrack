import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Calculator, LayoutDashboard, Receipt, Users, TrendingUp, BarChart3, Repeat,
  Database, Settings, User, ArrowUpRight, ArrowDownLeft, Home,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useExpenses } from '@/hooks/useExpenses'
import { usePersons } from '@/hooks/useLedger'
import { useInvestments } from '@/hooks/useInvestments'
import { searchEntities } from '@/lib/commandSearch'
import { formatCurrency, formatDate, toISODateString } from '@/lib/utils'
import './CommandPalette.css'

type StaticRoute =
  | '/dashboard' | '/expenses' | '/ledger' | '/ledger/people' | '/investments' | '/analytics' | '/household'
  | '/settings/recurring' | '/settings/data' | '/settings' | '/profile'

interface PaletteItem {
  id: string
  group: 'Actions' | 'Transactions' | 'People' | 'Investments'
  label: string
  hint?: string
  icon: ReactNode
  run: () => void
}

// Mounted once in AppShell. Owns the Ctrl/Cmd+K shortcut; the heavy data
// hooks live in <PaletteDialog> so they only run while the palette is open.
export default function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen)
  const setOpen = useUIStore((s) => s.setPaletteOpen)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!useUIStore.getState().paletteOpen)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setOpen])

  return <AnimatePresence>{open && <PaletteDialog onClose={() => setOpen(false)} />}</AnimatePresence>
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const setQuickAddOpen = useUIStore((s) => s.setQuickAddOpen)
  const setCalculatorOpen = useUIStore((s) => s.setCalculatorOpen)
  const setExpenseJump = useUIStore((s) => s.setExpenseJump)

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Same key as the other pages' all-time fetch, so this is normally a cache hit.
  const { data: transactions = [] } = useExpenses({ from: '2000-01-01', to: toISODateString(new Date()) })
  const { data: persons = [] } = usePersons()
  const { data: investments = [] } = useInvestments()

  const items = useMemo<PaletteItem[]>(() => {
    const go = (to: StaticRoute) => () => { navigate({ to }); onClose() }

    const actions: PaletteItem[] = [
      { id: 'a-add', group: 'Actions', label: 'Add expense', hint: 'New transaction', icon: <Plus size={15} />,
        run: () => { setQuickAddOpen(true); navigate({ to: '/expenses' }); onClose() } },
      { id: 'a-calc', group: 'Actions', label: 'Open calculator', icon: <Calculator size={15} />,
        run: () => { setCalculatorOpen(true); onClose() } },
      { id: 'g-dash', group: 'Actions', label: 'Go to Dashboard', icon: <LayoutDashboard size={15} />, run: go('/dashboard') },
      { id: 'g-exp', group: 'Actions', label: 'Go to Expenses', icon: <Receipt size={15} />, run: go('/expenses') },
      { id: 'g-ledger', group: 'Actions', label: 'Go to Lent & Debt', icon: <Users size={15} />, run: go('/ledger') },
      { id: 'g-people', group: 'Actions', label: 'Go to People', icon: <Users size={15} />, run: go('/ledger/people') },
      { id: 'g-inv', group: 'Actions', label: 'Go to Investments', icon: <TrendingUp size={15} />, run: go('/investments') },
      { id: 'g-ana', group: 'Actions', label: 'Go to Analytics', icon: <BarChart3 size={15} />, run: go('/analytics') },
      { id: 'g-house', group: 'Actions', label: 'Go to Household', icon: <Home size={15} />, run: go('/household') },
      { id: 'g-rec', group: 'Actions', label: 'Go to Recurring rules', icon: <Repeat size={15} />, run: go('/settings/recurring') },
      { id: 'g-data', group: 'Actions', label: 'Go to Data preferences', icon: <Database size={15} />, run: go('/settings/data') },
      { id: 'g-set', group: 'Actions', label: 'Go to Settings', icon: <Settings size={15} />, run: go('/settings') },
      { id: 'g-prof', group: 'Actions', label: 'Go to Profile', icon: <User size={15} />, run: go('/profile') },
    ]

    const q = query.trim().toLowerCase()
    if (!q) return actions

    const found = searchEntities(query, { transactions, persons, investments })
    const tokens = q.split(/\s+/)

    const out: PaletteItem[] = []
    for (const t of found.transactions) {
      const isExpense = t.type === 'Expense'
      const label = t.description || t.category?.name || 'Transaction'
      out.push({
        id: `t-${t.id}`, group: 'Transactions', label,
        hint: `${formatDate(t.txn_date)} · ${isExpense ? '−' : '+'}${formatCurrency(t.amount)}`,
        icon: isExpense ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />,
        run: () => {
          setExpenseJump({ month: t.txn_date.slice(0, 7), search: t.description ?? '' })
          navigate({ to: '/expenses' })
          onClose()
        },
      })
    }
    for (const p of found.persons) {
      out.push({
        id: `p-${p.id}`, group: 'People', label: p.name, hint: p.relationship ?? undefined, icon: <Users size={15} />,
        run: () => { navigate({ to: '/ledger/$personId', params: { personId: p.id } }); onClose() },
      })
    }
    for (const i of found.investments) {
      out.push({
        id: `i-${i.id}`, group: 'Investments', label: i.name, hint: i.category ?? i.company_name ?? undefined,
        icon: <TrendingUp size={15} />,
        run: () => { navigate({ to: '/investments/$investmentId', params: { investmentId: i.id } }); onClose() },
      })
    }
    return [...out, ...actions.filter((a) => tokens.every((t) => a.label.toLowerCase().includes(t)))]
  }, [query, transactions, persons, investments, navigate, onClose, setQuickAddOpen, setCalculatorOpen, setExpenseJump])

  // Keep the highlighted row valid as the result list changes under it.
  useEffect(() => { setActive(0) }, [query])
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); items[active]?.run() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  // Group headers appear where the group changes; items stay in one flat,
  // arrow-navigable order.
  const rows: ReactNode[] = []
  let lastGroup = ''
  items.forEach((item, idx) => {
    if (item.group !== lastGroup) {
      rows.push(<div key={`h-${item.group}`} className="cp-group" role="presentation">{item.group}</div>)
      lastGroup = item.group
    }
    rows.push(
      <div
        key={item.id}
        id={`cp-opt-${idx}`}
        role="option"
        aria-selected={idx === active}
        className={`cp-item${idx === active ? ' cp-item-active' : ''}`}
        onMouseMove={() => setActive(idx)}
        onClick={item.run}
      >
        <span className="cp-item-icon">{item.icon}</span>
        <span className="cp-item-label">{item.label}</span>
        {item.hint && <span className="cp-item-hint">{item.hint}</span>}
      </div>,
    )
  })

  return (
    <motion.div
      className="cp-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      onClick={onClose}
    >
      <motion.div
        className="cp-card"
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="cp-input-row">
          <Search size={16} className="cp-input-icon" />
          <input
            autoFocus
            className="cp-input"
            placeholder="Search transactions, people, investments, or run a command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="cp-list"
            aria-activedescendant={items.length ? `cp-opt-${active}` : undefined}
          />
          <kbd className="cp-kbd">Esc</kbd>
        </div>
        <div className="cp-list" id="cp-list" role="listbox" ref={listRef}>
          {items.length === 0 ? <div className="cp-empty">No matches for “{query.trim()}”.</div> : rows}
        </div>
      </motion.div>
    </motion.div>
  )
}
