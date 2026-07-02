import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Edit2, Check, X, Trash2, ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  useCategories, useCreateCategory, useUpdateCategory,
  useDeleteCategory, useRenameMainGroup, useDeleteMainGroup,
} from '@/hooks/useCategories'
import { useConfirmStore } from '@/stores/confirmStore'
import { PAYMENT_METHOD_GROUPS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/expense.types'
import type { PaymentMethodGroup } from '@/lib/constants'

type DSTab = 'categories' | 'methods'
type TypeFilter = 'All' | 'Expense' | 'Income'

const LS_CUSTOM_METHODS  = 'fintrack_custom_methods'
const LS_CUSTOM_ACCOUNTS = 'fintrack_custom_accounts'
function readCustom(key: string): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') } catch { return {} }
}
function saveCustom(key: string, val: Record<string, string[]>) {
  localStorage.setItem(key, JSON.stringify(val))
}

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

// ── Payment Methods tab — one list per group, scoped to what the picker actually uses ──
// MFS uses the "methods" entity (provider chips); Card/Bank Transfer use "accounts"
// (only that list is ever read by PaymentMethodPicker for those groups); Cash is fixed.
const GROUP_ICON_COLOR: Record<PaymentMethodGroup, string> = {
  Cash: '#10B981',
  MFS: '#6C63FF',
  Card: '#F59E0B',
  'Bank Transfer': '#06B6D4',
}
const GROUP_ORDER: PaymentMethodGroup[] = ['Cash', 'MFS', 'Card', 'Bank Transfer']

function PaymentMethodsTab() {
  const [customMethods, setCustomMethods]   = useState<Record<string, string[]>>(() => readCustom(LS_CUSTOM_METHODS))
  const [customAccounts, setCustomAccounts] = useState<Record<string, string[]>>(() => readCustom(LS_CUSTOM_ACCOUNTS))
  const [addingTo, setAddingTo] = useState<PaymentMethodGroup | null>(null)
  const [newVal, setNewVal] = useState('')
  const [editing, setEditing] = useState<{ group: PaymentMethodGroup; original: string; val: string } | null>(null)

  function entityFor(group: PaymentMethodGroup) {
    return group === 'MFS' ? 'methods' : 'accounts'
  }
  function storageFor(group: PaymentMethodGroup) {
    return entityFor(group) === 'methods'
      ? { key: LS_CUSTOM_METHODS, state: customMethods, setState: setCustomMethods }
      : { key: LS_CUSTOM_ACCOUNTS, state: customAccounts, setState: setCustomAccounts }
  }
  function defaultItemsFor(group: PaymentMethodGroup): string[] {
    return entityFor(group) === 'methods'
      ? PAYMENT_METHOD_GROUPS[group].methods as unknown as string[]
      : PAYMENT_METHOD_GROUPS[group].accounts as unknown as string[]
  }

  function add(group: PaymentMethodGroup) {
    const val = newVal.trim(); if (!val) return
    const { key, state, setState } = storageFor(group)
    // Match PaymentMethodPicker's own convention: custom MFS providers are
    // stored with the "MFS - " prefix, same as the built-in ones.
    const stored = group === 'MFS' ? `MFS - ${val}` : val
    const updated = { ...state, [group]: [...(state[group] ?? []), stored] }
    setState(updated); saveCustom(key, updated); setAddingTo(null); setNewVal('')
  }
  function remove(group: PaymentMethodGroup, val: string) {
    const { key, state, setState } = storageFor(group)
    const updated = { ...state, [group]: (state[group] ?? []).filter((v) => v !== val) }
    setState(updated); saveCustom(key, updated)
  }
  function saveEdit() {
    if (!editing) return
    const val = editing.val.trim(); if (!val) { setEditing(null); return }
    const { key, state, setState } = storageFor(editing.group)
    const stored = editing.group === 'MFS' && !val.startsWith('MFS - ') ? `MFS - ${val}` : val
    const updated = {
      ...state,
      [editing.group]: (state[editing.group] ?? []).map((v) => (v === editing.original ? stored : v)),
    }
    setState(updated); saveCustom(key, updated); setEditing(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {GROUP_ORDER.map((group) => {
        const cfg = PAYMENT_METHOD_GROUPS[group]
        const color = GROUP_ICON_COLOR[group]
        const isFixed = group === 'Cash'
        const defaults = defaultItemsFor(group)
        const customs = storageFor(group).state[group] ?? []
        const isAdding = addingTo === group

        return (
          <div key={group} className="dsc-tag-card">
            <div className="dsc-pm-header">
              <div className="dsc-pm-icon" style={{ background: `${color}1c`, color }}>{cfg.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="dsc-pm-title">{cfg.label}</div>
                <div className="dsc-pm-sub">{entityFor(group) === 'methods' ? 'Providers' : 'Accounts'}</div>
              </div>
              {!isFixed && (
                <button className="dsc-tag-add" onClick={() => { setAddingTo(isAdding ? null : group); setNewVal('') }}>
                  <Plus size={11} /> Add
                </button>
              )}
            </div>

            <div className="dsc-pm-list">
              {defaults.map((item) => (
                <div key={item} className="dsc-sub-row" title="Built-in — cannot be edited or removed">
                  <span className="dsc-sub-name">{group === 'MFS' ? item.replace('MFS - ', '') : item}</span>
                  <span className="dsc-builtin-tag">Built-in</span>
                </div>
              ))}
              {customs.map((item) => {
                const isEditingThis = editing?.group === group && editing.original === item
                return (
                  <div key={item} className="dsc-sub-row">
                    {isEditingThis ? (
                      <input
                        className="dsc-inline-input" style={{ flex: 1 }}
                        value={editing.val}
                        onChange={(e) => setEditing({ ...editing, val: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        autoFocus
                      />
                    ) : (
                      <span className="dsc-sub-name">{group === 'MFS' ? item.replace('MFS - ', '') : item}</span>
                    )}
                    <div className="dsc-sub-actions">
                      {isEditingThis ? (
                        <>
                          <button className="dsc-icon-btn dsc-ok" onClick={saveEdit}><Check size={12} /></button>
                          <button className="dsc-icon-btn" onClick={() => setEditing(null)}><X size={12} /></button>
                        </>
                      ) : (
                        <>
                          <button className="dsc-icon-btn" title="Edit"
                            onClick={() => setEditing({ group, original: item, val: group === 'MFS' ? item.replace('MFS - ', '') : item })}>
                            <Edit2 size={12} />
                          </button>
                          <button className="dsc-icon-btn dsc-del" title="Delete" onClick={() => remove(group, item)}>
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              <AnimatePresence>
                {isAdding && (
                  <motion.div className="dsc-add-sub-form" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <input
                      className="dsc-inline-input" style={{ flex: 1 }}
                      placeholder={entityFor(group) === 'methods' ? 'Provider name…' : 'Account name…'}
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && add(group)} autoFocus
                    />
                    <button className="dsc-icon-btn dsc-ok" onClick={() => add(group)} disabled={!newVal.trim()}><Check size={12} /></button>
                    <button className="dsc-icon-btn" onClick={() => setAddingTo(null)}><X size={12} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {isFixed && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 12px 2px', margin: 0 }}>
                  Cash is always a single fixed entry.
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function DataSettingsPage() {
  const navigate = useNavigate()
  const { data: categories = [] } = useCategories()
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
`
