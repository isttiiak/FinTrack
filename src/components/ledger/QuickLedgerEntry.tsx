import { useState, useRef, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, Search, UserPlus } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString } from '@/lib/utils'
import { LEDGER_TYPES, RELATIONSHIPS } from '@/lib/constants'
import type { PaymentMethod, Account } from '@/lib/constants'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import { usePersons, useCreatePerson, useCreateLedgerEntry } from '@/hooks/useLedger'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import type { Person } from '@/types/ledger.types'

const schema = z.object({
  ledger_type:         z.enum(LEDGER_TYPES),
  person_id:           z.string().optional(),
  new_person_name:     z.string().optional(),
  new_person_relation: z.string().optional(),   // for new person
  new_person_phone:    z.string().optional(),   // for new person
  total_amount:        z.number({ error: 'Enter a valid amount' }).positive(),
  start_date:          z.string().min(1, 'Select a date'),
  reason:              z.string().optional(),
  payment_method:      z.string().min(1, 'Required'),
  account:             z.string().min(1, 'Required'),
  doc_link:            z.string().url('Enter a valid URL').or(z.literal('')).optional(),
}).refine(
  (d) => !!(d.person_id || (d.new_person_name && d.new_person_name.trim().length >= 1)),
  { message: 'Select a person or enter a new name', path: ['new_person_name'] },
)
type FormValues = z.infer<typeof schema>

interface QuickLedgerEntryProps {
  onClose: () => void
}

export default function QuickLedgerEntry({ onClose }: QuickLedgerEntryProps) {
  const { data: persons = [] } = usePersons()
  const { mutateAsync: createPerson, isPending: creatingPerson } = useCreatePerson()
  const { mutateAsync: createEntry, isPending: creatingEntry } = useCreateLedgerEntry()
  const isDemo = useDemoStore((s) => s.isDemo)
  const addToast = useUIStore((s) => s.addToast)

  const isPending = creatingPerson || creatingEntry

  // Combobox state
  const [personQuery, setPersonQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [isNewPerson, setIsNewPerson] = useState(false)
  const [customRelation, setCustomRelation] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredPersons = persons.filter((p) =>
    p.name.toLowerCase().includes(personQuery.toLowerCase()),
  )
  const showCreateOption = personQuery.trim().length > 0
    && !filteredPersons.some((p) => p.name.toLowerCase() === personQuery.trim().toLowerCase())

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ledger_type:    'Lent',
      start_date:     toISODateString(new Date()),
      payment_method: 'Cash',
      account:        'Cash',
    },
  })

  const selectedType   = watch('ledger_type')
  const paymentMethod  = watch('payment_method')
  const accountValue   = watch('account')

  function selectPerson(person: Person) {
    setSelectedPerson(person)
    setIsNewPerson(false)
    setPersonQuery(person.name)
    setValue('person_id', person.id)
    setValue('new_person_name', undefined)
    setShowDropdown(false)
  }

  function selectNewPerson(name: string) {
    setSelectedPerson(null)
    setIsNewPerson(true)
    setPersonQuery(name)
    setValue('person_id', undefined)
    setValue('new_person_name', name)
    setShowDropdown(false)
  }

  function clearPerson() {
    setSelectedPerson(null)
    setIsNewPerson(false)
    setPersonQuery('')
    setValue('person_id', undefined)
    setValue('new_person_name', undefined)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function onSubmit(values: FormValues) {
    if (isDemo) {
      addToast({ type: 'info', message: 'Demo mode — changes are not saved' })
      onClose()
      return
    }

    let personId = values.person_id

    // Create new person if needed
    if (!personId && values.new_person_name) {
      const newPerson = await createPerson({
        name:         values.new_person_name.trim(),
        relationship: (values.new_person_relation || null) as Person['relationship'],
        phone:        values.new_person_phone || null,
        notes:        null,
      })
      personId = newPerson.id
    }

    if (!personId) return

    await createEntry({
      person_id:      personId,
      ledger_type:    values.ledger_type,
      total_amount:   values.total_amount,
      start_date:     values.start_date,
      reason:         values.reason || null,
      payment_method: (values.payment_method ?? null) as PaymentMethod | null,
      account:        (values.account ?? null) as Account | null,
      doc_link:       values.doc_link || null,
      notes:          null,
      settled_date:   null,
    })

    onClose()
  }

  return (
    <div className="qle-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="qle-panel" variants={scaleIn} initial="initial" animate="animate" exit="exit">

        {/* Header */}
        <div className="qle-header">
          <h2 className="qle-title">Add entry</h2>
          <button className="qle-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="qle-form">

          {/* Lent / Debt toggle */}
          <div className="qle-type-toggle">
            {LEDGER_TYPES.map((t) => (
              <Controller
                key={t}
                control={control}
                name="ledger_type"
                render={({ field }) => (
                  <button
                    type="button"
                    className={cn('qle-type-btn', field.value === t && 'qle-type-btn-active')}
                    onClick={() => field.onChange(t)}
                    style={field.value === t ? {
                      background: t === 'Lent'
                        ? 'linear-gradient(135deg, #10B981, #06B6D4)'
                        : 'linear-gradient(135deg, #F97316, #EF4444)',
                    } : undefined}
                  >
                    {t === 'Lent' ? '💸 Lent' : '🏦 Debt'}
                  </button>
                )}
              />
            ))}
          </div>
          <p className="qle-type-hint">
            {selectedType === 'Lent'
              ? 'You gave money — they owe you back'
              : 'You received money — you owe them back'}
          </p>

          {/* Person combobox */}
          <div className="qle-field">
            <label className="qle-label">Person</label>
            <div className="qle-person-wrap" style={{ position: 'relative' }}>
              <Search size={14} className="qle-person-search-icon" />
              <input
                ref={inputRef}
                type="text"
                className={cn('qle-input qle-person-input', errors.new_person_name && 'qle-input-error')}
                placeholder="Search or type a new name…"
                value={personQuery}
                autoFocus
                autoComplete="off"
                onChange={(e) => {
                  setPersonQuery(e.target.value)
                  setSelectedPerson(null)
                  setIsNewPerson(false)
                  setValue('person_id', undefined)
                  setValue('new_person_name', e.target.value || undefined)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {personQuery && (
                <button type="button" className="qle-person-clear" onClick={clearPerson}>
                  <X size={13} />
                </button>
              )}

              {/* Selected badge */}
              {(selectedPerson || isNewPerson) && (
                <div className={`qle-person-badge ${isNewPerson ? 'qle-person-badge-new' : 'qle-person-badge-existing'}`}>
                  {isNewPerson ? (
                    <><UserPlus size={11} /> New: {personQuery}</>
                  ) : (
                    <>{selectedPerson?.name}</>
                  )}
                </div>
              )}

              {/* Dropdown */}
              <AnimatePresence>
                {showDropdown && (filteredPersons.length > 0 || showCreateOption) && (
                  <motion.div
                    ref={dropdownRef}
                    className="qle-person-dropdown"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                  >
                    {filteredPersons.length > 0 && (
                      <>
                        <div className="qle-dropdown-section-label">Existing people</div>
                        {filteredPersons.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="qle-dropdown-item"
                            onMouseDown={(e) => { e.preventDefault(); selectPerson(p) }}
                          >
                            <div className="qle-dropdown-avatar">{p.name[0]?.toUpperCase()}</div>
                            <div className="qle-dropdown-info">
                              <span className="qle-dropdown-name">{p.name}</span>
                              {p.relationship && <span className="qle-dropdown-rel">{p.relationship}</span>}
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {showCreateOption && (
                      <>
                        {filteredPersons.length > 0 && <div className="qle-dropdown-divider" />}
                        <button
                          type="button"
                          className="qle-dropdown-item qle-dropdown-create"
                          onMouseDown={(e) => { e.preventDefault(); selectNewPerson(personQuery.trim()) }}
                        >
                          <div className="qle-dropdown-avatar qle-avatar-new"><UserPlus size={13} /></div>
                          <div className="qle-dropdown-info">
                            <span className="qle-dropdown-name">Create "{personQuery.trim()}"</span>
                            <span className="qle-dropdown-rel">Add as new person</span>
                          </div>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {errors.new_person_name && (
              <p className="qle-error">{errors.new_person_name.message}</p>
            )}
          </div>

          {/* New person extra fields — directly after person picker */}
          <AnimatePresence>
            {isNewPerson && (
              <motion.div
                className="qle-new-person-fields"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <div className="qle-new-person-heading">
                  <UserPlus size={13} />
                  <span>New person details <span className="qle-optional">(optional)</span></span>
                </div>
                <div className="qle-row">
                  <div className="qle-field">
                    <label className="qle-label">Relationship</label>
                    {customRelation ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          {...register('new_person_relation')}
                          className="qle-input"
                          placeholder="e.g. Cousin, Mentor…"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="qle-custom-back"
                          onClick={() => { setCustomRelation(false) }}
                          data-tooltip="Pick from list"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="qle-select-wrap">
                        <select
                          {...register('new_person_relation')}
                          className="qle-select"
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              e.preventDefault()
                              setCustomRelation(true)
                            }
                          }}
                        >
                          <option value="">— Select —</option>
                          {RELATIONSHIPS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                          <option value="__custom__">✏️ Add custom…</option>
                        </select>
                        <ChevronDown className="qle-select-icon" size={14} />
                      </div>
                    )}
                  </div>
                  <div className="qle-field">
                    <label className="qle-label">Phone</label>
                    <input
                      {...register('new_person_phone')}
                      className="qle-input"
                      placeholder="+880 17xx xxxxxx"
                      type="tel"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Amount */}
          <div className="qle-field">
            <label className="qle-label">Amount (৳)</label>
            <input
              {...register('total_amount', { valueAsNumber: true })}
              type="number" step="0.01" placeholder="0.00"
              className={cn('qle-input qle-amount-input', errors.total_amount && 'qle-input-error')}
            />
            {errors.total_amount && <p className="qle-error">{errors.total_amount.message}</p>}
          </div>

          {/* Date */}
          <div className="qle-field">
            <label className="qle-label">Date</label>
            <input
              {...register('start_date')}
              type="date"
              className={cn('qle-input', errors.start_date && 'qle-input-error')}
            />
          </div>

          {/* Reason */}
          <div className="qle-field">
            <label className="qle-label">Reason <span className="qle-optional">(optional)</span></label>
            <input
              {...register('reason')}
              className="qle-input"
              placeholder="e.g. Medical emergency, Lunch split"
            />
          </div>

          {/* Method + Account */}
          <div className="qle-field">
            <label className="qle-label">Payment</label>
            <PaymentMethodPicker
              method={paymentMethod}
              account={accountValue}
              onMethodChange={(m) => setValue('payment_method', m ?? 'Cash')}
              onAccountChange={(a) => setValue('account', a ?? 'Cash')}
            />
          </div>

          {/* Doc link */}
          <div className="qle-field">
            <label className="qle-label">Document link <span className="qle-optional">(optional)</span></label>
            <input
              {...register('doc_link')}
              className={cn('qle-input', errors.doc_link && 'qle-input-error')}
              placeholder="Google Drive, receipt URL…"
              type="url"
            />
            {errors.doc_link && <p className="qle-error">{errors.doc_link.message}</p>}
          </div>

          <div className="qle-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <motion.button
              type="submit"
              className="btn-primary qle-submit"
              disabled={isPending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span key="spin" className="qle-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                ) : (
                  <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {isNewPerson ? 'Add person & save' : 'Save entry'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </form>
      </motion.div>

      <style>{`
        .qle-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        @media (max-width: 640px) {
          .qle-overlay { align-items: flex-end; padding: 0; }
          .qle-panel { border-radius: 20px 20px 0 0 !important; max-height: 92vh !important; }
        }
        .qle-panel {
          width: 100%; max-width: 480px;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          display: flex; flex-direction: column;
          max-height: min(90vh, 760px);
          overflow: hidden;
        }
        .qle-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 24px 0; flex-shrink: 0; margin-bottom: 20px;
        }
        .qle-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .qle-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .qle-close:hover { background: var(--bg-card); color: var(--text-primary); }
        .qle-form {
          display: flex; flex-direction: column; gap: 14px;
          overflow-y: auto; flex: 1;
          padding: 0 24px 4px;
          scrollbar-width: thin; scrollbar-color: var(--border) transparent;
        }
        .qle-form::-webkit-scrollbar { width: 4px; }
        .qle-form::-webkit-scrollbar-track { background: transparent; }
        .qle-form::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        /* Type toggle */
        .qle-type-toggle { display: flex; gap: 8px; }
        .qle-type-btn {
          flex: 1; padding: 9px 12px; border-radius: 10px; text-align: center;
          font-size: 13px; font-weight: 600; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-secondary); transition: background 0.15s, color 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .qle-type-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .qle-type-btn-active { color: #fff !important; border-color: transparent !important; }
        .qle-type-hint { font-size: 12px; color: var(--text-muted); margin: -8px 0 0; }

        /* Fields */
        .qle-field { display: flex; flex-direction: column; gap: 5px; }
        .qle-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .qle-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .qle-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px; width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .qle-input::placeholder { color: var(--text-muted); }
        .qle-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
        .qle-input-error { border-color: var(--accent-red) !important; }
        .qle-amount-input { font-size: 22px; font-weight: 700; padding: 12px 14px; }
        .qle-error { font-size: 12px; color: #FCA5A5; margin: 0; }

        /* Person combobox */
        .qle-person-wrap { position: relative; }
        .qle-person-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: var(--text-muted); pointer-events: none; z-index: 1;
        }
        .qle-person-input { padding-left: 34px !important; padding-right: 32px !important; }
        .qle-person-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          width: 20px; height: 20px; border-radius: 5px;
          background: none; border: none; color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .qle-person-clear:hover { color: var(--text-primary); }

        .qle-person-badge {
          position: absolute; right: 34px; top: 50%; transform: translateY(-50%);
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
          pointer-events: none;
        }
        .qle-person-badge-existing { background: rgba(108,99,255,0.15); color: var(--accent-primary); }
        .qle-person-badge-new { background: rgba(16,185,129,0.15); color: var(--accent-teal); }

        /* Dropdown */
        .qle-person-dropdown {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 100;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 12px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.4); overflow: hidden;
          max-height: 220px; overflow-y: auto;
        }
        .qle-dropdown-section-label {
          font-size: 10px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.08em;
          padding: 8px 12px 4px;
        }
        .qle-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; width: 100%; background: none; border: none;
          text-align: left; cursor: pointer; transition: background 0.1s;
        }
        .qle-dropdown-item:hover { background: var(--bg-hover); }
        .qle-dropdown-avatar {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: rgba(108,99,255,0.15); color: var(--accent-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700;
        }
        .qle-avatar-new { background: rgba(16,185,129,0.15); color: var(--accent-teal); }
        .qle-dropdown-create .qle-dropdown-name { color: var(--accent-teal); }
        .qle-dropdown-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .qle-dropdown-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .qle-dropdown-rel { font-size: 11px; color: var(--text-muted); }
        .qle-dropdown-divider { height: 1px; background: var(--border); margin: 4px 0; }

        .qle-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* New person fields */
        .qle-new-person-fields {
          background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.15); border-radius: 12px;
          padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;
        }
        .qle-new-person-heading {
          display: flex; align-items: center; gap: 7px;
          font-size: 12px; font-weight: 600; color: var(--accent-teal);
        }
        .qle-custom-back {
          width: 38px; height: 38px; border-radius: 8px; flex-shrink: 0;
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .qle-custom-back:hover { background: var(--bg-hover); color: var(--text-primary); }

        /* Actions — sticky footer inside scroll container */
        .qle-actions {
          display: flex; justify-content: flex-end; gap: 10px;
          position: sticky; bottom: 0;
          background: var(--bg-elevated);
          border-top: 1px solid var(--border);
          padding: 14px 0 24px;
          margin-top: 4px; flex-shrink: 0;
        }
        .qle-submit { min-width: 140px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .qle-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:qle-spin 0.7s linear infinite; }
        @keyframes qle-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
