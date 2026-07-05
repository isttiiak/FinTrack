import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Edit2, Check, X, Trash2, ChevronDown, ChevronUp, ChevronRight,
} from 'lucide-react'
import {
  useCategories, useCreateCategory, useUpdateCategory,
  useDeleteCategory, useRenameMainGroup, useDeleteMainGroup,
} from '@/hooks/useCategories'
import { useConfirmStore } from '@/stores/confirmStore'
import {
  getMfsProviders, setMfsProviders, resetMfsProviders,
  getBankAccounts, setBankAccounts, resetBankAccounts,
} from '@/lib/paymentMethodPrefs'
import { supabase } from '@/lib/supabase'
import ErrorBanner from '@/components/common/ErrorBanner'
import type { Category } from '@/types/expense.types'

type DSTab = 'categories' | 'methods'
type TypeFilter = 'All' | 'Expense' | 'Income'

// ── Categories tab — unified tree view ───────────────────────────────────────
function CategoriesTab({ categories }: { categories: Category[] }) {
  const { mutateAsync: updateCat }  = useUpdateCategory()
  const { mutateAsync: deleteCat }  = useDeleteCategory()
  const { mutateAsync: createCat }  = useCreateCategory()
  const { mutateAsync: renameGroup }= useRenameMainGroup()
  const { mutateAsync: deleteGroup }= useDeleteMainGroup()
  const confirm = useConfirmStore((s) => s.confirm)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingGroupName, setEditingGroupName] = useState<{ old: string; val: string } | null>(null)
  const [editingSubcat, setEditingSubcat] = useState<{ id: string; name: string; group: string } | null>(null)
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<'Expense' | 'Income'>('Expense')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')

  const grouped = useMemo(() => {
    const map: Record<string, Category[]> = {}
    for (const c of categories) {
      if (!map[c.main_group]) map[c.main_group] = []
      map[c.main_group].push(c)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [categories])

  const visibleGrouped = useMemo(() => {
    if (typeFilter === 'All') return grouped
    return grouped.filter(([, cats]) => cats[0]?.type === typeFilter)
  }, [grouped, typeFilter])

  function toggleExpand(group: string) {
    setExpanded((prev) => {
      const n = new Set(prev)
      n.has(group) ? n.delete(group) : n.add(group)
      return n
    })
  }

  async function saveGroupRename() {
    if (!editingGroupName) return
    const name = editingGroupName.val.trim()
    if (name && name !== editingGroupName.old) await renameGroup({ oldName: editingGroupName.old, newName: name })
    setEditingGroupName(null)
  }

  async function handleDeleteGroup(group: string, count: number) {
    const ok = await confirm({ title: `Delete "${group}"?`, description: `All ${count} sub-categories will be permanently deleted.`, itemName: group })
    if (ok) await deleteGroup(group)
  }

  async function saveSubEdit() {
    if (!editingSubcat) return
    await updateCat({ id: editingSubcat.id, name: editingSubcat.name.trim(), main_group: editingSubcat.group.trim() })
    setEditingSubcat(null)
  }

  async function handleDeleteSubcat(cat: Category) {
    // category_id is ON DELETE SET NULL — transactions aren't deleted, but they
    // do lose their category, so the confirm copy must say so accurately.
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', cat.id)
    const affected = count ?? 0
    const description = affected > 0
      ? `${affected} transaction${affected !== 1 ? 's' : ''} using this category will become Uncategorized.`
      : 'No transactions currently use this category.'
    const ok = await confirm({ title: 'Delete sub-category?', description, itemName: `${cat.main_group} › ${cat.name}` })
    if (ok) await deleteCat(cat.id)
  }

  async function saveNewSub(group: string) {
    const name = newSubName.trim()
    if (!name) return
    // Type is always inherited from the parent group — a sub-category can't
    // be a different type than the group it lives under.
    const groupCats = grouped.find(([g]) => g === group)?.[1] ?? []
    const type = groupCats[0]?.type ?? 'Expense'
    await createCat({ name, main_group: group, type, color_hex: null, is_default: false })
    setAddingSubTo(null); setNewSubName('')
  }

  async function saveNewGroup() {
    const name = newGroupName.trim()
    if (!name) return
    // Create a placeholder sub-category to establish the group
    await createCat({ name: `${name} (general)`, main_group: name, type: newGroupType, color_hex: null, is_default: false })
    setAddingGroup(false); setNewGroupName('')
    setExpanded((prev) => new Set([...prev, name]))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Add new main group + type filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <AnimatePresence>
          {addingGroup ? (
            <motion.div className="dsc-add-group-form" style={{ flex: 1 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Plus size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <input
                className="dsc-inline-input" style={{ flex: 1 }}
                placeholder="New main category name…" value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveNewGroup()} autoFocus
              />
              <select className="dsc-type-select" value={newGroupType}
                onChange={(e) => setNewGroupType(e.target.value as 'Expense' | 'Income')}>
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
              </select>
              <button className="dsc-icon-btn dsc-ok" onClick={saveNewGroup} disabled={!newGroupName.trim()}><Check size={13} /></button>
              <button className="dsc-icon-btn" onClick={() => setAddingGroup(false)}><X size={13} /></button>
            </motion.div>
          ) : (
            <button className="dsc-add-group-btn" style={{ flex: 1 }} onClick={() => setAddingGroup(true)}>
              <Plus size={14} /> Add main category
            </button>
          )}
        </AnimatePresence>

        <div className="dsc-type-filter-wrap">
          <select className="dsc-type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="All">All types</option>
            <option value="Expense">Expense only</option>
            <option value="Income">Income only</option>
          </select>
          <ChevronDown size={13} className="dsc-type-filter-icon" />
        </div>
      </div>

      {visibleGrouped.map(([group, cats]) => {
        const isOpen = expanded.has(group)
        const isEditingGroup = editingGroupName?.old === group
        const isAddingSub = addingSubTo === group
        const groupType = cats[0]?.type ?? 'Expense'

        return (
          <div key={group} className="dsc-group-card">
            {/* Group header */}
            <div className="dsc-group-header">
              <button type="button" className="dsc-expand-btn" onClick={() => toggleExpand(group)}>
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>

              {isEditingGroup ? (
                <input
                  className="dsc-inline-input dsc-group-input"
                  value={editingGroupName.val}
                  onChange={(e) => setEditingGroupName({ old: group, val: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && saveGroupRename()}
                  autoFocus
                />
              ) : (
                <span className="dsc-group-name">{group}</span>
              )}

              <span className={`dsc-group-type-tag dsc-type-tag-${groupType.toLowerCase()}`}>{groupType}</span>
              <span className="dsc-group-count">{cats.length}</span>

              <div className="dsc-group-actions">
                {isEditingGroup ? (
                  <>
                    <button className="dsc-icon-btn dsc-ok" onClick={saveGroupRename}><Check size={13} /></button>
                    <button className="dsc-icon-btn" onClick={() => setEditingGroupName(null)}><X size={13} /></button>
                  </>
                ) : (
                  <>
                    <button className="dsc-icon-btn" title="Rename group"
                      onClick={() => { setEditingGroupName({ old: group, val: group }); setExpanded((p) => new Set([...p, group])) }}>
                      <Edit2 size={13} />
                    </button>
                    <button className="dsc-icon-btn dsc-add-sub" title="Add sub-category"
                      onClick={() => { setAddingSubTo(isAddingSub ? null : group); setNewSubName(''); setExpanded((p) => new Set([...p, group])) }}>
                      <Plus size={13} />
                    </button>
                    <button className="dsc-icon-btn dsc-del" title="Delete entire group"
                      onClick={() => handleDeleteGroup(group, cats.length)}>
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sub-categories */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="dsc-sub-list">
                    {cats.map((cat) => {
                      const isEditingSub = editingSubcat?.id === cat.id
                      return (
                        <div key={cat.id} className="dsc-sub-row">
                          <span className={`dsc-type-dot dsc-type-${cat.type.toLowerCase()}`} title={cat.type} />

                          {isEditingSub ? (
                            <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <input
                                className="dsc-inline-input"
                                style={{ flex: 1, minWidth: 100 }}
                                value={editingSubcat.name}
                                onChange={(e) => setEditingSubcat({ ...editingSubcat, name: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && saveSubEdit()}
                                placeholder="Name" autoFocus
                              />
                              <input
                                className="dsc-inline-input"
                                style={{ flex: 1, minWidth: 100 }}
                                value={editingSubcat.group}
                                onChange={(e) => setEditingSubcat({ ...editingSubcat, group: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && saveSubEdit()}
                                placeholder="Group"
                              />
                            </div>
                          ) : (
                            <span className="dsc-sub-name">{cat.name}</span>
                          )}

                          <div className="dsc-sub-actions">
                            {isEditingSub ? (
                              <>
                                <button className="dsc-icon-btn dsc-ok" onClick={saveSubEdit}><Check size={12} /></button>
                                <button className="dsc-icon-btn" onClick={() => setEditingSubcat(null)}><X size={12} /></button>
                              </>
                            ) : (
                              <>
                                <button className="dsc-icon-btn" onClick={() => setEditingSubcat({ id: cat.id, name: cat.name, group: cat.main_group })} title="Edit">
                                  <Edit2 size={12} />
                                </button>
                                <button className="dsc-icon-btn dsc-del" onClick={() => handleDeleteSubcat(cat)} title="Delete">
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Add sub-category inline — type is inherited from the group, no selector needed */}
                    <AnimatePresence>
                      {isAddingSub && (
                        <motion.div
                          className="dsc-add-sub-form"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <input
                            className="dsc-inline-input" style={{ flex: 1 }}
                            placeholder="Sub-category name…" value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveNewSub(group)} autoFocus
                          />
                          <span className={`dsc-group-type-tag dsc-type-tag-${groupType.toLowerCase()}`}>{groupType}</span>
                          <button className="dsc-icon-btn dsc-ok" onClick={() => saveNewSub(group)}
                            disabled={!newSubName.trim()}><Check size={12} /></button>
                          <button className="dsc-icon-btn" onClick={() => setAddingSubTo(null)}><X size={12} /></button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

    </div>
  )
}

// ── Payment Methods tab ──────────────────────────────────────────────────────
// Cash is fixed (the picker never lets it vary). MFS providers and bank
// accounts are both fully user-customizable: reorder, rename, remove, add,
// or reset to defaults — built-ins aren't a protected subset, they're just
// the starting list. Card and Bank Transfer share ONE bank-accounts list
// (see lib/paymentMethodPrefs.ts) since they were previously two separate
// but identical account lists — merging removes duplicate upkeep without
// losing the Card-vs-Bank-Transfer distinction itself (that's a different
// field, `payment_method`, unaffected by this).

interface EditableListProps {
  items: string[]
  onChange: (items: string[]) => void
  onReset: () => void
  placeholder: string
  toDisplay?: (raw: string) => string
  toStored?: (display: string) => string
}

function EditableList({ items, onChange, onReset, placeholder, toDisplay = (v) => v, toStored = (v) => v }: EditableListProps) {
  const [adding, setAdding] = useState(false)
  const [newVal, setNewVal] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  function removeAt(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }
  function startEdit(i: number) {
    setEditingIdx(i); setEditVal(toDisplay(items[i]))
  }
  function saveEdit() {
    if (editingIdx == null) return
    const val = editVal.trim()
    if (!val) { setEditingIdx(null); return }
    const next = [...items]
    next[editingIdx] = toStored(val)
    onChange(next); setEditingIdx(null)
  }
  function addItem() {
    const val = newVal.trim(); if (!val) return
    onChange([...items, toStored(val)])
    setAdding(false); setNewVal('')
  }

  return (
    <>
      <div className="dsc-pm-list">
        {items.map((item, i) => {
          const isEditingThis = editingIdx === i
          return (
            <div key={`${item}-${i}`} className="dsc-sub-row">
              <div className="dsc-reorder-btns">
                <button className="dsc-reorder-btn" disabled={i === 0} onClick={() => move(i, -1)} title="Move up"><ChevronUp size={12} /></button>
                <button className="dsc-reorder-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} title="Move down"><ChevronDown size={12} /></button>
              </div>
              {isEditingThis ? (
                <input
                  className="dsc-inline-input" style={{ flex: 1 }}
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
              ) : (
                <span className="dsc-sub-name">{toDisplay(item)}</span>
              )}
              <div className="dsc-sub-actions">
                {isEditingThis ? (
                  <>
                    <button className="dsc-icon-btn dsc-ok" onClick={saveEdit}><Check size={12} /></button>
                    <button className="dsc-icon-btn" onClick={() => setEditingIdx(null)}><X size={12} /></button>
                  </>
                ) : (
                  <>
                    <button className="dsc-icon-btn" title="Edit" onClick={() => startEdit(i)}><Edit2 size={12} /></button>
                    <button className="dsc-icon-btn dsc-del" title="Remove" onClick={() => removeAt(i)}><Trash2 size={12} /></button>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {items.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 12px', margin: 0 }}>
            Nothing here — add one below, or reset to defaults.
          </p>
        )}
        <AnimatePresence>
          {adding && (
            <motion.div className="dsc-add-sub-form" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <input
                className="dsc-inline-input" style={{ flex: 1 }}
                placeholder={placeholder}
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()} autoFocus
              />
              <button className="dsc-icon-btn dsc-ok" onClick={addItem} disabled={!newVal.trim()}><Check size={12} /></button>
              <button className="dsc-icon-btn" onClick={() => setAdding(false)}><X size={12} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="dsc-pm-footer">
        <button className="dsc-tag-add" onClick={() => { setAdding((v) => !v); setNewVal('') }}><Plus size={11} /> Add</button>
        <button className="dsc-reset-link" onClick={onReset}>Reset to defaults</button>
      </div>
    </>
  )
}

function PaymentMethodsTab() {
  const [mfsProviders, setMfsProvidersState] = useState<string[]>(getMfsProviders)
  const [bankAccounts, setBankAccountsState] = useState<string[]>(getBankAccounts)

  function updateMfs(list: string[]) { setMfsProvidersState(list); setMfsProviders(list) }
  function updateBank(list: string[]) { setBankAccountsState(list); setBankAccounts(list) }
  function handleResetMfs() { resetMfsProviders(); setMfsProvidersState(getMfsProviders()) }
  function handleResetBank() { resetBankAccounts(); setBankAccountsState(getBankAccounts()) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cash — fixed */}
      <div className="dsc-tag-card">
        <div className="dsc-pm-header">
          <div className="dsc-pm-icon" style={{ background: '#10B9811c', color: '#10B981' }}>💵</div>
          <div style={{ flex: 1 }}>
            <div className="dsc-pm-title">Cash</div>
            <div className="dsc-pm-sub">Fixed</div>
          </div>
        </div>
        <div className="dsc-pm-list">
          <div className="dsc-sub-row"><span className="dsc-sub-name">Cash</span></div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 12px 10px', margin: 0 }}>
          Cash is always a single fixed entry — there's nothing to customize here.
        </p>
      </div>

      {/* MFS providers */}
      <div className="dsc-tag-card">
        <div className="dsc-pm-header">
          <div className="dsc-pm-icon" style={{ background: '#6C63FF1c', color: '#6C63FF' }}>📱</div>
          <div style={{ flex: 1 }}>
            <div className="dsc-pm-title">MFS</div>
            <div className="dsc-pm-sub">Providers — reorder, rename, or remove any of them</div>
          </div>
        </div>
        <EditableList
          items={mfsProviders}
          onChange={updateMfs}
          onReset={handleResetMfs}
          placeholder="Provider name…"
          toDisplay={(v) => v.replace('MFS - ', '')}
          toStored={(v) => (v.startsWith('MFS - ') ? v : `MFS - ${v}`)}
        />
      </div>

      {/* Bank accounts — shared by Card + Bank Transfer */}
      <div className="dsc-tag-card">
        <div className="dsc-pm-header">
          <div className="dsc-pm-icon" style={{ background: '#F59E0B1c', color: '#F59E0B' }}>🏦</div>
          <div style={{ flex: 1 }}>
            <div className="dsc-pm-title">Bank Accounts</div>
            <div className="dsc-pm-sub">Shared by both Card and Bank Transfer payments</div>
          </div>
        </div>
        <EditableList
          items={bankAccounts}
          onChange={updateBank}
          onReset={handleResetBank}
          placeholder="Account name…"
        />
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function DataSettingsPage() {
  const navigate = useNavigate()
  const categoriesQ = useCategories()
  const { data: categories = [] } = categoriesQ
  const [tab, setTab] = useState<DSTab>('categories')

  const TABS: { id: DSTab; label: string }[] = [
    { id: 'categories', label: '🏷️ Categories' },
    { id: 'methods',    label: '💳 Payment Methods' },
  ]

  return (
    <motion.div className="dsp-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
      <button className="dsp-back-btn" onClick={() => navigate({ to: '/settings' })}>
        <ArrowLeft size={16} /> Back to Settings
      </button>
      <h1 className="dsp-title">Data Preferences</h1>
      <p className="dsp-sub">Categories and payment methods</p>

      {categoriesQ.isError && <ErrorBanner onRetry={() => categoriesQ.refetch()} />}

      <div className="dsp-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`dsp-tab ${tab === t.id ? 'dsp-tab-active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="dsp-content">
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}>
            {tab === 'categories' && <CategoriesTab categories={categories} />}
            {tab === 'methods'    && <PaymentMethodsTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{STYLES}</style>
    </motion.div>
  )
}

const STYLES = `
  .dsp-page { max-width: 720px; }
  .dsp-back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--text-muted); font-size: 13px; cursor: pointer; margin-bottom: 16px; padding: 0; transition: color 0.12s; }
  .dsp-back-btn:hover { color: var(--text-primary); }
  .dsp-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .dsp-sub { font-size: 14px; color: var(--text-secondary); margin: 0 0 20px; }
  .dsp-tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--border); margin-bottom: 20px; overflow-x: auto; }
  .dsp-tab { padding: 11px 16px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); transition: color 0.15s, border-color 0.15s; }
  .dsp-tab:hover { color: var(--text-primary); }
  .dsp-tab-active { color: var(--accent-primary) !important; border-bottom-color: var(--accent-primary); }
  .dsp-content { padding-bottom: 48px; }

  /* Group cards */
  .dsc-group-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .dsc-group-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-elevated); border-bottom: 1px solid transparent; cursor: default; }
  .dsc-group-card:has(.dsc-expand-btn:focus-visible) .dsc-group-header { border-bottom-color: var(--border); }
  .dsc-expand-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; display: flex; align-items: center; flex-shrink: 0; }
  .dsc-expand-btn:hover { color: var(--text-primary); }
  .dsc-group-name { font-size: 14px; font-weight: 600; color: var(--text-primary); flex: 1; }
  .dsc-group-type-tag { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; }
  .dsc-type-tag-expense { background: rgba(249,115,22,0.14); color: var(--accent-coral); }
  .dsc-type-tag-income  { background: rgba(16,185,129,0.14); color: var(--accent-teal); }
  .dsc-group-count { font-size: 11px; color: var(--text-muted); background: var(--bg-card); padding: 1px 7px; border-radius: 20px; border: 1px solid var(--border); flex-shrink: 0; }
  .dsc-group-input { flex: 1; }
  .dsc-group-actions { display: flex; gap: 4px; flex-shrink: 0; }

  /* Type filter */
  .dsc-type-filter-wrap { position: relative; flex-shrink: 0; }
  .dsc-type-filter {
    appearance: none; cursor: pointer; padding: 9px 30px 9px 14px; border-radius: 10px; height: 100%;
    background: var(--bg-card); border: 2px dashed var(--border); color: var(--text-secondary);
    font-size: 13px; font-weight: 500;
  }
  .dsc-type-filter:focus { outline: none; border-color: var(--border-focus); }
  .dsc-type-filter-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

  /* Sub-category rows */
  .dsc-sub-list { display: flex; flex-direction: column; }
  .dsc-sub-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid rgba(42,42,74,0.4); }
  .dsc-sub-row:last-child { border-bottom: none; }
  .dsc-type-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dsc-type-expense { background: var(--accent-coral); }
  .dsc-type-income  { background: var(--accent-teal); }
  .dsc-sub-name { flex: 1; font-size: 13px; color: var(--text-secondary); }
  .dsc-sub-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .dsc-add-sub-form { display: flex; align-items: center; gap: 6px; padding: 8px 12px; flex-wrap: wrap; background: rgba(108,99,255,0.04); border-top: 1px dashed rgba(108,99,255,0.2); }
  .dsc-type-select { background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 11px; padding: 4px 6px; cursor: pointer; }
  .dsc-type-select:focus { outline: none; }
  .dsc-builtin-tag { font-size: 10px; color: var(--text-muted); background: var(--bg-elevated); border: 1px solid var(--border); padding: 1px 7px; border-radius: 20px; flex-shrink: 0; }

  /* Add group */
  .dsc-add-group-btn { display: flex; align-items: center; gap: 7px; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; background: none; border: 2px dashed var(--border); color: var(--accent-primary); transition: background 0.12s, border-color 0.12s; width: 100%; }
  .dsc-add-group-btn:hover { background: rgba(108,99,255,0.06); border-color: rgba(108,99,255,0.3); }
  .dsc-add-group-form { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: var(--bg-card); border: 1px solid rgba(108,99,255,0.25); flex-wrap: wrap; }

  /* Shared inline controls */
  .dsc-inline-input { background: var(--bg-elevated); border: 1px solid var(--border-focus); border-radius: 7px; color: var(--text-primary); font-size: 13px; padding: 5px 9px; min-width: 80px; }
  .dsc-inline-input:focus { outline: none; }
  .dsc-icon-btn { width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: none; border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: background 0.1s, color 0.1s; }
  .dsc-icon-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .dsc-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .dsc-icon-btn.dsc-ok { color: var(--accent-teal); border-color: rgba(16,185,129,0.3); }
  .dsc-icon-btn.dsc-ok:hover { background: rgba(16,185,129,0.1); }
  .dsc-icon-btn.dsc-add-sub { color: var(--accent-primary); border-color: rgba(108,99,255,0.25); }
  .dsc-icon-btn.dsc-add-sub:hover { background: rgba(108,99,255,0.1); }
  .dsc-icon-btn.dsc-del:hover { background: rgba(239,68,68,0.1); color: var(--accent-red); border-color: rgba(239,68,68,0.3); }

  /* Payment method group cards */
  .dsc-tag-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .dsc-pm-header { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--bg-elevated); border-bottom: 1px solid var(--border); }
  .dsc-pm-icon {
    width: 44px; height: 44px; border-radius: 12px; font-size: 22px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .dsc-tag-card:hover .dsc-pm-icon { transform: scale(1.08); box-shadow: 0 0 0 4px rgba(108,99,255,0.08); }
  .dsc-pm-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
  .dsc-pm-sub { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .dsc-pm-list { display: flex; flex-direction: column; }
  .dsc-tag-add { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; background: none; border: 1px dashed var(--border); color: var(--accent-primary); transition: background 0.12s; flex-shrink: 0; }
  .dsc-tag-add:hover { background: rgba(108,99,255,0.06); }
  .dsc-pm-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-top: 1px solid var(--border); }
  .dsc-reset-link { background: none; border: none; color: var(--text-muted); font-size: 11px; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 2px; }
  .dsc-reset-link:hover { color: var(--text-secondary); }
  .dsc-reorder-btns { display: flex; flex-direction: column; gap: 1px; flex-shrink: 0; }
  .dsc-reorder-btn { width: 18px; height: 14px; display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; transition: color 0.1s; }
  .dsc-reorder-btn:hover:not(:disabled) { color: var(--accent-primary); }
  .dsc-reorder-btn:disabled { opacity: 0.25; cursor: not-allowed; }
`
