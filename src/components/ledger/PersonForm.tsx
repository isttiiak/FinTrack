import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { RELATIONSHIPS } from '@/lib/constants'
import { useCreatePerson, useUpdatePerson } from '@/hooks/useLedger'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import type { Person } from '@/types/ledger.types'
import './PersonForm.css'

const schema = z.object({
  name:         z.string().min(1, 'Name is required'),
  relationship: z.string().optional(),
  phone:        z.string().optional(),
  notes:        z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface PersonFormProps {
  editing?: Person | null
  onClose: () => void
}

export default function PersonForm({ editing, onClose }: PersonFormProps) {
  const { mutateAsync: create, isPending: creating } = useCreatePerson()
  const { mutateAsync: update, isPending: updating } = useUpdatePerson()
  const isPending = creating || updating
  const [customRelation, setCustomRelation] = useState(
    editing?.relationship != null && !RELATIONSHIPS.includes(editing.relationship as never),
  )

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:         editing?.name ?? '',
      relationship: editing?.relationship ?? '',
      phone:        editing?.phone ?? '',
      notes:        editing?.notes ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    const payload = {
      name:         values.name,
      relationship: (values.relationship || null) as Person['relationship'],
      phone:        values.phone || null,
      notes:        values.notes || null,
    }
    try {
      if (editing) {
        await update({ id: editing.id, ...payload })
      } else {
        await create(payload)
      }
      onClose()
    } catch (err) {
      if (err instanceof DemoBlockedError) onClose()
    }
  }

  return (
    <div className="pf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="pf-panel" variants={scaleIn} initial="initial" animate="animate" exit="exit">
        <div className="pf-header">
          <h2 className="pf-title">{editing ? 'Edit person' : 'Add person'}</h2>
          <button className="pf-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="pf-form">
          <div className="pf-field">
            <label className="pf-label">Name <span className="req">*</span></label>
            <input
              {...register('name')}
              className={cn('pf-input', errors.name && 'pf-input-error')}
              placeholder="e.g. Rafiq Bhai"
              autoFocus
            />
            {errors.name && <p className="pf-error">{errors.name.message}</p>}
          </div>

          <div className="pf-field">
            <label className="pf-label">Relationship <span className="pf-optional">(optional)</span></label>
            {customRelation ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  {...register('relationship')}
                  className="pf-input"
                  placeholder="e.g. Cousin, Mentor, Neighbour…"
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button type="button" className="pf-custom-back" onClick={() => setCustomRelation(false)}>
                  ↩ List
                </button>
              </div>
            ) : (
              <select
                {...register('relationship')}
                className="pf-select"
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    e.preventDefault()
                    setCustomRelation(true)
                  }
                }}
              >
                <option value="">— Select —</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                <option value="__custom__">✏️ Add custom…</option>
              </select>
            )}
          </div>

          <div className="pf-field">
            <label className="pf-label">Phone <span className="pf-optional">(optional)</span></label>
            <input
              {...register('phone')}
              className="pf-input"
              placeholder="+880 17xx xxxxxx"
              type="tel"
            />
          </div>

          <div className="pf-field">
            <label className="pf-label">Notes <span className="pf-optional">(optional)</span></label>
            <textarea
              {...register('notes')}
              className="pf-input pf-textarea"
              placeholder="Any extra context..."
              rows={2}
            />
          </div>

          <div className="pf-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <motion.button
              type="submit"
              className="btn-primary pf-submit"
              disabled={isPending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span key="spin" className="lf-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                ) : (
                  <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {editing ? 'Save changes' : 'Add person'}
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
