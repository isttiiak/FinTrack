import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Plus } from 'lucide-react'
import ErrorBanner from '@/components/common/ErrorBanner'
import { SkeletonList } from '@/components/common/SkeletonCard'
import BalanceSummary from '@/components/household/BalanceSummary'
import { SharedExpenseList, SettlementList } from '@/components/household/SharedExpenseList'
import MembersPanel from '@/components/household/MembersPanel'
import SharedExpenseForm from '@/components/household/SharedExpenseForm'
import SettleForm from '@/components/household/SettleForm'
import HouseholdSetup from '@/components/household/HouseholdSetup'
import {
  useHouseholds, useHouseholdDetail, useMyMemberId, isHouseholdSchemaMissing,
  useDeleteSharedExpense, useDeleteSettlement, useRemoveMember, useDeleteHousehold,
} from '@/hooks/useHousehold'
import { computeBalances, suggestSettlements, formatMoney } from '@/lib/household'
import { useConfirmStore } from '@/stores/confirmStore'
import { fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { HouseholdMember, HouseholdSettlement, SharedExpense } from '@/types/household.types'
import '@/components/household/Household.css'

type Tab = 'expenses' | 'payments' | 'members'

export default function HouseholdPage() {
  const householdsQ = useHouseholds()
  const { data: households = [] } = householdsQ

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [tab, setTab] = useState<Tab>('expenses')
  const [expenseForm, setExpenseForm] = useState<{ editing: SharedExpense | null } | null>(null)
  const [settleForm, setSettleForm] = useState<{ initial?: { from: string; to: string; amount: number } } | null>(null)

  const activeId = households.some((h) => h.id === selectedId) ? selectedId : households[0]?.id ?? null
  const detailQ = useHouseholdDetail(activeId)
  const detail = detailQ.data
  const meId = useMyMemberId(detail?.members)
  const isOwner = !!detail && detail.members.find((m) => m.id === meId)?.role === 'owner'

  const { mutateAsync: deleteExpense } = useDeleteSharedExpense()
  const { mutateAsync: deleteSettlement } = useDeleteSettlement()
  const { mutateAsync: removeMember } = useRemoveMember()
  const { mutateAsync: deleteHousehold } = useDeleteHousehold()
  const confirm = useConfirmStore((s) => s.confirm)

  const { balances, suggestions } = useMemo(() => {
    if (!detail) return { balances: new Map<string, number>(), suggestions: [] }
    const b = computeBalances(detail.members.map((m) => m.id), detail.expenses, detail.settlements)
    return { balances: b, suggestions: suggestSettlements(b) }
  }, [detail])

  const schemaMissing = isHouseholdSchemaMissing(householdsQ.error)

  async function handleDeleteExpense(e: SharedExpense) {
    if (!detail) return
    const ok = await confirm({
      title: 'Delete this expense?',
      description: 'It will be removed for everyone in the household and balances will update.',
      itemName: `${e.description} — ${formatMoney(e.amount, detail.household.currency)}`,
      confirmLabel: 'Delete expense',
    })
    if (!ok) return
    try { await deleteExpense({ id: e.id, household_id: e.household_id }) } catch { /* toast from hook */ }
  }

  async function handleDeleteSettlement(s: HouseholdSettlement) {
    if (!detail) return
    const ok = await confirm({
      title: 'Delete this payment?',
      description: 'Balances will go back to what they were before it was recorded.',
      itemName: formatMoney(s.amount, detail.household.currency),
      confirmLabel: 'Delete payment',
    })
    if (!ok) return
    try { await deleteSettlement({ id: s.id, household_id: s.household_id }) } catch { /* toast from hook */ }
  }

  async function handleLeave(m: HouseholdMember) {
    if (!detail) return
    const ok = await confirm({
      title: 'Leave this household?',
      description: 'You will lose access to its expenses. Your name stays on past expenses.',
      itemName: detail.household.name,
      confirmLabel: 'Leave household',
    })
    if (!ok) return
    try {
      await removeMember({ id: m.id, household_id: m.household_id })
      setSelectedId(null)
    } catch { /* toast from hook */ }
  }

  async function handleDeleteHousehold() {
    if (!detail) return
    const ok = await confirm({
      title: 'Delete this household?',
      description: 'Every shared expense, payment and member is permanently deleted for everyone in it.',
      itemName: detail.household.name,
      confirmLabel: 'Delete household',
    })
    if (!ok) return
    try {
      await deleteHousehold({ household_id: detail.household.id })
      setSelectedId(null)
    } catch { /* toast from hook */ }
  }

  return (
    <motion.div className="hh-page" variants={fadeUp} initial="initial" animate="animate">
      <div className="hh-header">
        <div>
          <h1 className="page-title">Household</h1>
          <p className="page-subtitle">Split shared costs with family or flatmates</p>
        </div>
        {detail && !showSetup && (
          <div className="hh-header-actions">
            {households.length > 1 && (
              <select className="hh-switch" value={activeId ?? ''} onChange={(e) => setSelectedId(e.target.value)} aria-label="Household">
                {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
            <button className="hh-ghost-btn" onClick={() => setShowSetup(true)}>New / join</button>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setExpenseForm({ editing: null })}>
              <Plus size={15} /> Add expense
            </button>
          </div>
        )}
      </div>

      {schemaMissing && (
        <div className="hh-panel">
          <h3 className="hh-panel-title">Household mode isn’t set up on this database yet</h3>
          <p className="hh-note">Run <code>supabase/migrations/012_households.sql</code> in the Supabase SQL Editor, then reload.</p>
        </div>
      )}
      {householdsQ.isError && !schemaMissing && <ErrorBanner onRetry={() => householdsQ.refetch()} />}
      {detailQ.isError && <ErrorBanner onRetry={() => detailQ.refetch()} />}

      {!schemaMissing && householdsQ.isLoading && <SkeletonList count={3} />}

      {!schemaMissing && !householdsQ.isLoading && !householdsQ.isError && (households.length === 0 || showSetup) && (
        <>
          {households.length === 0 && (
            <div className="hh-empty" style={{ padding: '8px 0 0' }}>
              <Home size={36} style={{ opacity: 0.6, marginBottom: 8 }} />
              <div>You’re not in a household yet.</div>
            </div>
          )}
          <HouseholdSetup onDone={(id) => { if (id) setSelectedId(id); setShowSetup(false) }} />
          {showSetup && households.length > 0 && <button className="hh-ghost-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setShowSetup(false)}>Cancel</button>}
        </>
      )}

      {detailQ.isLoading && activeId && !showSetup && <SkeletonList count={4} />}

      {detail && !showSetup && (
        <>
          <BalanceSummary
            household={detail.household}
            members={detail.members}
            balances={balances}
            meId={meId}
            suggestions={suggestions}
            expenseCount={detail.expenses.length}
            onRecord={(initial) => setSettleForm({ initial })}
          />
          {detail.members.length === 1 && (
            <p className="hh-note">You’re the only member so far. Add a family member or flatmate under <strong>Members</strong> to start splitting.</p>
          )}

          <div className="hh-tabs" role="tablist">
            {([['expenses', 'Expenses'], ['payments', 'Payments'], ['members', `Members (${detail.members.length})`]] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={cn('hh-tab', tab === key && 'hh-tab-active')} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
            {tab === 'payments' && (
              <button className="hh-ghost-btn" style={{ marginLeft: 'auto' }} onClick={() => setSettleForm({})}>Record payment</button>
            )}
          </div>

          {tab === 'expenses' && (
            <SharedExpenseList
              expenses={detail.expenses}
              members={detail.members}
              meId={meId}
              currency={detail.household.currency}
              onEdit={(e) => setExpenseForm({ editing: e })}
              onDelete={handleDeleteExpense}
            />
          )}
          {tab === 'payments' && (
            <SettlementList
              settlements={detail.settlements}
              members={detail.members}
              meId={meId}
              currency={detail.household.currency}
              onDelete={handleDeleteSettlement}
            />
          )}
          {tab === 'members' && (
            <MembersPanel
              household={detail.household}
              members={detail.members}
              meId={meId}
              isOwner={isOwner}
              onLeave={handleLeave}
              onDeleteHousehold={handleDeleteHousehold}
            />
          )}
        </>
      )}

      <AnimatePresence>
        {detail && expenseForm && (
          <SharedExpenseForm
            key={expenseForm.editing?.id ?? 'new'}
            household={detail.household}
            members={detail.members}
            meId={meId}
            editing={expenseForm.editing}
            onClose={() => setExpenseForm(null)}
          />
        )}
        {detail && settleForm && (
          <SettleForm
            household={detail.household}
            members={detail.members}
            meId={meId}
            initial={settleForm.initial}
            onClose={() => setSettleForm(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
