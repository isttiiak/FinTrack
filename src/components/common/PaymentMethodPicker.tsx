import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Check, X } from 'lucide-react'
import { getMethodGroup } from '@/lib/constants'
import type { PaymentMethod, Account, PaymentMethodGroup } from '@/lib/constants'
import { getMfsProviders, setMfsProviders, getBankAccounts, setBankAccounts } from '@/lib/paymentMethodPrefs'

interface PaymentMethodPickerProps {
  method: PaymentMethod | string | undefined
  account: Account | string | undefined
  onMethodChange: (m: string | undefined) => void
  onAccountChange: (a: string | undefined) => void
}

const GROUP_ORDER: PaymentMethodGroup[] = ['Cash', 'MFS', 'Card', 'Bank Transfer']
const GROUP_META: Record<PaymentMethodGroup, { icon: string; label: string }> = {
  Cash: { icon: '💵', label: 'Cash' },
  MFS: { icon: '📱', label: 'MFS' },
  Card: { icon: '💳', label: 'Card' },
  'Bank Transfer': { icon: '🏦', label: 'Bank Transfer' },
}

export default function PaymentMethodPicker({
  method, account, onMethodChange, onAccountChange,
}: PaymentMethodPickerProps) {
  const [selectedGroup, setSelectedGroup] = useState<PaymentMethodGroup | null>(
    () => getMethodGroup(method ?? null),
  )
  // Custom MFS provider addition — Card/Bank Transfer never use a "methods"
  // list (only Cash/MFS do; Card & Bank Transfer are the method itself, the
  // picker below just needs which bank *account* it went through).
  const [addingMethod, setAddingMethod] = useState(false)
  const [newMethodName, setNewMethodName] = useState('')
  // Custom bank account (shared by Card + Bank Transfer)
  const [customAccountMode, setCustomAccountMode] = useState(false)
  const [customAccountVal, setCustomAccountVal] = useState('')

  const [mfsProviders, setMfsProvidersState] = useState<string[]>(getMfsProviders)
  const [bankAccounts, setBankAccountsState] = useState<string[]>(getBankAccounts)

  const isMFS     = selectedGroup === 'MFS'
  const isCash    = selectedGroup === 'Cash'
  const needsDropdownAccount = selectedGroup && !isCash && !isMFS

  function selectGroup(group: PaymentMethodGroup) {
    if (selectedGroup === group) {
      setSelectedGroup(null); onMethodChange(undefined); onAccountChange(undefined); return
    }
    setSelectedGroup(group)
    setCustomAccountMode(false)
    if (group === 'Cash') {
      onMethodChange('Cash'); onAccountChange('Cash')
    } else if (group === 'MFS') {
      onMethodChange(undefined); onAccountChange(undefined)
    } else {
      onMethodChange(group); onAccountChange(undefined)
    }
  }

  function selectMFSSub(m: string) {
    onMethodChange(m)
    // auto-map MFS - bKash → bKash, MFS - Nagad → Nagad, etc.
    const label = m.startsWith('MFS - ') ? m.replace('MFS - ', '') : m
    onAccountChange(label)
  }

  function saveCustomMethod() {
    const name = newMethodName.trim()
    if (!name) return
    const fullName = `MFS - ${name}`
    const updated = [...mfsProviders, fullName]
    setMfsProvidersState(updated); setMfsProviders(updated)
    setAddingMethod(false); setNewMethodName('')
  }

  function saveCustomAccount() {
    const val = customAccountVal.trim()
    if (!val || !selectedGroup) return
    const updated = [...bankAccounts, val]
    setBankAccountsState(updated); setBankAccounts(updated)
    onAccountChange(val)
    setCustomAccountMode(false); setCustomAccountVal('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Group chips */}
      <div>
        <label className="pmp-label">Payment method</label>
        <div className="pmp-group-row">
          <button type="button"
            className={`pmp-group-chip ${!selectedGroup ? 'pmp-group-none-active' : 'pmp-group-none'}`}
            onClick={() => { setSelectedGroup(null); onMethodChange(undefined); onAccountChange(undefined) }}>
            None
          </button>
          {GROUP_ORDER.map((g) => (
            <button key={g} type="button"
              className={`pmp-group-chip ${selectedGroup === g ? 'pmp-group-active' : ''}`}
              onClick={() => selectGroup(g)}>
              {GROUP_META[g].icon} {GROUP_META[g].label}
            </button>
          ))}
        </div>
      </div>

      {/* MFS sub-chips (default + custom) */}
      <AnimatePresence>
        {isMFS && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <label className="pmp-label" style={{ margin: 0 }}>
                MFS provider <span style={{ color: 'var(--accent-red)', fontSize: 11 }}>*</span>
              </label>
              <button type="button" className="pmp-add-trigger" onClick={() => setAddingMethod((v) => !v)}
                title="Add a custom MFS provider">
                <Plus size={12} /> Add provider
              </button>
            </div>
            {/* Inline add-provider form */}
            <AnimatePresence>
              {addingMethod && (
                <motion.div className="pmp-add-form"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 0 10px' }}>
                    <input className="pmp-add-input" placeholder="MFS provider name…" value={newMethodName}
                      onChange={(e) => setNewMethodName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveCustomMethod()} autoFocus />
                    <button type="button" className="pmp-add-save" onClick={saveCustomMethod}
                      disabled={!newMethodName.trim()}>
                      <Check size={13} /> Save
                    </button>
                    <button type="button" className="pmp-add-cancel"
                      onClick={() => { setAddingMethod(false); setNewMethodName('') }}>
                      <X size={13} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="pmp-group-row">
              {mfsProviders.map((m) => (
                <button key={m} type="button"
                  className={`pmp-sub-chip ${method === m ? 'pmp-sub-active' : ''}`}
                  onClick={() => selectMFSSub(m)}>
                  {m.replace('MFS - ', '')}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card / Bank Transfer — account dropdown + custom */}
      <AnimatePresence>
        {needsDropdownAccount && selectedGroup && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden' }}>
            <label className="pmp-label">Account / Bank</label>
            {customAccountMode ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="pmp-add-input" style={{ flex: 1 }}
                  placeholder="Enter account name…" value={customAccountVal}
                  onChange={(e) => setCustomAccountVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveCustomAccount()} autoFocus />
                <button type="button" className="pmp-add-save" onClick={saveCustomAccount}
                  disabled={!customAccountVal.trim()}><Check size={13} /></button>
                <button type="button" className="pmp-add-cancel"
                  onClick={() => { setCustomAccountMode(false); setCustomAccountVal('') }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="pmp-select-wrap" style={{ flex: 1 }}>
                  <select className="pmp-select" value={account ?? ''}
                    onChange={(e) => onAccountChange(e.target.value || undefined)}>
                    <option value="">— Select bank —</option>
                    {bankAccounts.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pmp-select-icon" />
                </div>
                <button type="button" className="pmp-add-trigger pmp-custom-account-btn"
                  onClick={() => setCustomAccountMode(true)} title="Type a custom account name">
                  <Plus size={12} /> Custom
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MFS account auto-badge */}
      <AnimatePresence>
        {isMFS && method && account && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden' }}>
            <label className="pmp-label">Account</label>
            <div className="pmp-auto-account">{account} <span className="pmp-auto-badge">auto</span></div>
          </motion.div>
        )}
        {isCash && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden' }}>
            <label className="pmp-label">Account</label>
            <div className="pmp-auto-account">Cash <span className="pmp-auto-badge">auto</span></div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .pmp-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 7px; }
        .pmp-add-trigger {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; cursor: pointer;
          background: rgba(79, 169, 129,0.08); border: 1px solid rgba(79, 169, 129,0.2); color: var(--accent-primary);
          transition: background 0.12s;
        }
        .pmp-add-trigger:hover { background: rgba(79, 169, 129,0.15); }
        .pmp-custom-account-btn { border-radius: 8px; padding: 0 12px; height: 40px; }

        .pmp-group-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .pmp-group-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 13px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer;
          background: var(--bg-elevated); border: 2px solid var(--border); color: var(--text-secondary);
          transition: all 0.12s;
        }
        .pmp-group-chip:hover { border-color: rgba(79, 169, 129,0.3); color: var(--text-primary); }
        .pmp-group-active { background: rgba(79, 169, 129,0.12) !important; border-color: rgba(79, 169, 129,0.5) !important; color: var(--accent-primary) !important; font-weight: 600; }
        .pmp-group-none { font-size: 12px; color: var(--text-muted); }
        .pmp-group-none-active { font-size: 12px; color: var(--text-muted); border-color: var(--border) !important; }

        .pmp-sub-chip {
          padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer;
          background: var(--bg-elevated); border: 2px solid var(--border); color: var(--text-secondary); transition: all 0.12s;
        }
        .pmp-sub-chip:hover { border-color: rgba(79, 169, 129,0.35); color: var(--text-primary); }
        .pmp-sub-active { background: rgba(79, 169, 129,0.12) !important; border-color: rgba(79, 169, 129,0.5) !important; color: var(--accent-teal) !important; font-weight: 600; }

        .pmp-add-form { }
        .pmp-add-input {
          flex: 1; background: var(--bg-card); border: 1px solid var(--border-focus); border-radius: 8px;
          color: var(--text-primary); font-size: 13px; padding: 7px 10px; min-width: 120px;
        }
        .pmp-add-input:focus { outline: none; }
        .pmp-add-save {
          display: flex; align-items: center; gap: 4px; padding: 7px 12px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          background: rgba(79, 169, 129,0.15); border: 1px solid rgba(79, 169, 129,0.3); color: var(--accent-teal);
          transition: background 0.1s; white-space: nowrap;
        }
        .pmp-add-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .pmp-add-save:not(:disabled):hover { background: rgba(79, 169, 129,0.25); }
        .pmp-add-cancel {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px; cursor: pointer;
          background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-muted);
        }
        .pmp-add-cancel:hover { color: var(--text-primary); }

        .pmp-select-wrap { position: relative; }
        .pmp-select {
          width: 100%; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 36px 10px 14px;
          appearance: none; cursor: pointer; transition: border-color 0.15s;
        }
        .pmp-select-sm { font-size: 13px; padding: 7px 28px 7px 10px; }
        .pmp-select:focus { outline: none; border-color: var(--border-focus); }
        .pmp-select-icon { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

        .pmp-auto-account {
          display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 10px;
          font-size: 14px; background: var(--bg-elevated); border: 1px solid var(--border);
          color: var(--text-primary); font-weight: 500;
        }
        .pmp-auto-badge { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 20px; background: rgba(79, 169, 129,0.1); color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.05em; }
      `}</style>
    </div>
  )
}
