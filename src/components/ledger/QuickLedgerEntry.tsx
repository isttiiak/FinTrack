import { useState, useRef, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, Search, UserPlus } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, getActiveCurrencySymbol } from '@/lib/utils'
import { LEDGER_TYPES, RELATIONSHIPS } from '@/lib/constants'
import type { PaymentMethod, Account } from '@/lib/constants'
import PaymentMethodPicker from '@/components/common/PaymentMethodPicker'
import { usePersons, useCreatePerson, useCreateLedgerEntry } from '@/hooks/useLedger'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import type { Person } from '@/types/ledger.types'
import './QuickLedgerEntry.css'

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
                        ? 'linear-gradient(135deg, #4FA981, #3E9B72)'
                        : 'linear-gradient(135deg, #C9736E, #C25B55)',
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
            <label className="qle-label">Amount ({getActiveCurrencySymbol()})</label>
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

    </div>
  )
}
