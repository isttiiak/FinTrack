import { useState, useMemo } from 'react'
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
import type { Category } from '@/types/expense.types'

type DSTab = 'categories' | 'methods' | 'accounts'

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
  const [newSubType, setNewSubType] = useState<'Expense' | 'Income'>('Expense')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<'Expense' | 'Income'>('Expense')

  const grouped = useMemo(() => {
    const map: Record<string, Category[]> = {}
    for (const c of categories) {
      if (!map[c.main_group]) map[c.main_group] = []
      map[c.main_group].push(c)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [categories])

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
    const ok = await confirm({ title: 'Delete sub-category?', description: 'This sub-category will be removed. Existing transactions are unaffected.', itemName: `${cat.main_group} › ${cat.name}` })
    if (ok) await deleteCat(cat.id)
  }

  async function saveNewSub(group: string) {
    const name = newSubName.trim()
    if (!name) return
    await createCat({ name, main_group: group, type: newSubType, color_hex: null, is_default: false })
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
      {grouped.map(([group, cats]) => {
        const isOpen = expanded.has(group)
        const isEditingGroup = editingGroupName?.old === group
        const isAddingSub = addingSubTo === group

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

                    {/* Add sub-category inline */}
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
                          <select className="dsc-type-select" value={newSubType}
                            onChange={(e) => setNewSubType(e.target.value as 'Expense' | 'Income')}>
                            <option value="Expense">Expense</option>
                            <option value="Income">Income</option>
                          </select>
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

      {/* Add new main group */}
      <AnimatePresence>
        {addingGroup ? (
          <motion.div className="dsc-add-group-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
          <button className="dsc-add-group-btn" onClick={() => setAddingGroup(true)}>
            <Plus size={14} /> Add main category
          </button>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Methods / Accounts shared tag-list card ───────────────────────────────────
function TagListSection({ lsKey, label }: { lsKey: string; label: string }) {
  const [custom, setCustom] = useState<Record<string, string[]>>(() => readCustom(lsKey))
  const [adding, setAdding] = useState<string | null>(null)
  const [newVal, setNewVal] = useState('')

  function add(group: string) {
    const val = newVal.trim(); if (!val) return
    const updated = { ...custom, [group]: [...(custom[group] ?? []), val] }
    setCustom(updated); saveCustom(lsKey, updated); setAdding(null); setNewVal('')
  }
  function remove(group: string, val: string) {
    const updated = { ...custom, [group]: (custom[group] ?? []).filter((v) => v !== val) }
    setCustom(updated); saveCustom(lsKey, updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Object.entries(PAYMENT_METHOD_GROUPS).map(([group, cfg]) => (
        <div key={group} className="dsc-tag-card">
          <div className="dsc-tag-header">{cfg.icon} {cfg.label} {label}</div>
          <div className="dsc-tag-body">
            {(lsKey === LS_CUSTOM_METHODS ? cfg.methods : cfg.accounts).map((item) => (
              <span key={item} className="dsc-tag dsc-tag-default" title="Built-in — cannot be removed">{item}</span>
            ))}
            {(custom[group] ?? []).map((item) => (
              <span key={item} className="dsc-tag dsc-tag-custom">
                {item}
                <button className="dsc-tag-del" onClick={() => remove(group, item)}><X size={10} /></button>
              </span>
            ))}
            {adding === group ? (
              <span className="dsc-tag-input-row">
                <input className="dsc-tag-input" placeholder={`Add ${label.toLowerCase()}…`} value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add(group)} autoFocus />
                <button className="dsc-tag-save" onClick={() => add(group)} disabled={!newVal.trim()}><Check size={11} /></button>
                <button className="dsc-tag-cancel" onClick={() => { setAdding(null); setNewVal('') }}><X size={11} /></button>
              </span>
            ) : (
              <button className="dsc-tag-add" onClick={() => { setAdding(group); setNewVal('') }}>
                <Plus size={11} /> Add
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function DataSettingsPage({ onClose }: { onClose: () => void }) {
  const { data: categories = [] } = useCategories()
  const [tab, setTab] = useState<DSTab>('categories')

  const TABS: { id: DSTab; label: string }[] = [
    { id: 'categories', label: '🏷️ Categories' },
    { id: 'methods',    label: '💳 Payment Methods' },
    { id: 'accounts',   label: '🏦 Accounts' },
  ]

  return (
    <motion.div className="dsp-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}>
      <motion.div className="dsp-panel"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

        <div className="dsp-header">
          <button className="dsp-back-btn" onClick={onClose}><ArrowLeft size={18} /> Back to Settings</button>
          <h1 className="dsp-title">Data Preferences</h1>
          <p className="dsp-sub">Categories, payment methods, and accounts</p>
        </div>

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
              {tab === 'methods'    && <TagListSection lsKey={LS_CUSTOM_METHODS}  label="Methods" />}
              {tab === 'accounts'   && <TagListSection lsKey={LS_CUSTOM_ACCOUNTS} label="Accounts" />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{STYLES}</style>
    </motion.div>
  )
}

const STYLES = `
  .dsp-overlay { position: fixed; inset: 0; z-index: 800; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
  .dsp-panel {
    position: absolute; top: 0; right: 0; bottom: 0; width: 100%; max-width: 640px;
    background: var(--bg-page); overflow: hidden; display: flex; flex-direction: column;
    box-shadow: -24px 0 60px rgba(0,0,0,0.4);
  }
  .dsp-header { padding: 18px 22px 14px; border-bottom: 1px solid var(--border); background: var(--bg-elevated); flex-shrink: 0; }
  .dsp-back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--text-muted); font-size: 13px; cursor: pointer; margin-bottom: 8px; padding: 0; transition: color 0.12s; }
  .dsp-back-btn:hover { color: var(--text-primary); }
  .dsp-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
  .dsp-sub { font-size: 12px; color: var(--text-muted); margin: 0; }
  .dsp-tabs { display: flex; border-bottom: 1px solid var(--border); background: var(--bg-card); flex-shrink: 0; overflow-x: auto; }
  .dsp-tab { padding: 11px 16px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); transition: color 0.15s, border-color 0.15s; }
  .dsp-tab:hover { color: var(--text-primary); }
  .dsp-tab-active { color: var(--accent-primary) !important; border-bottom-color: var(--accent-primary); }
  .dsp-content { flex: 1; overflow-y: auto; padding: 18px 22px 32px; }

  /* Group cards */
  .dsc-group-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .dsc-group-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-elevated); border-bottom: 1px solid transparent; cursor: default; }
  .dsc-group-card:has(.dsc-expand-btn:focus-visible) .dsc-group-header { border-bottom-color: var(--border); }
  .dsc-expand-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; display: flex; align-items: center; flex-shrink: 0; }
  .dsc-expand-btn:hover { color: var(--text-primary); }
  .dsc-group-name { font-size: 14px; font-weight: 600; color: var(--text-primary); flex: 1; }
  .dsc-group-count { font-size: 11px; color: var(--text-muted); background: var(--bg-card); padding: 1px 7px; border-radius: 20px; border: 1px solid var(--border); flex-shrink: 0; }
  .dsc-group-input { flex: 1; }
  .dsc-group-actions { display: flex; gap: 4px; flex-shrink: 0; }

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

  /* Tag cards (methods/accounts) */
  .dsc-tag-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .dsc-tag-header { padding: 9px 14px; background: var(--bg-elevated); font-size: 13px; font-weight: 600; color: var(--text-primary); border-bottom: 1px solid var(--border); }
  .dsc-tag-body { display: flex; flex-wrap: wrap; gap: 7px; padding: 12px 14px; align-items: center; }
  .dsc-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  .dsc-tag-default { background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-secondary); }
  .dsc-tag-custom { background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.25); color: var(--accent-primary); }
  .dsc-tag-del { display: flex; align-items: center; background: none; border: none; color: inherit; cursor: pointer; opacity: 0.7; padding: 0; }
  .dsc-tag-del:hover { opacity: 1; }
  .dsc-tag-add { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; cursor: pointer; background: none; border: 1px dashed var(--border); color: var(--accent-primary); transition: background 0.12s; }
  .dsc-tag-add:hover { background: rgba(108,99,255,0.06); }
  .dsc-tag-input-row { display: inline-flex; align-items: center; gap: 4px; }
  .dsc-tag-input { background: var(--bg-elevated); border: 1px solid var(--border-focus); border-radius: 6px; color: var(--text-primary); font-size: 12px; padding: 3px 8px; width: 130px; }
  .dsc-tag-input:focus { outline: none; }
  .dsc-tag-save { width: 22px; height: 22px; border-radius: 5px; display: flex; align-items: center; justify-content: center; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: var(--accent-teal); cursor: pointer; }
  .dsc-tag-save:disabled { opacity: 0.4; cursor: not-allowed; }
  .dsc-tag-cancel { width: 22px; height: 22px; border-radius: 5px; display: flex; align-items: center; justify-content: center; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; }
`
