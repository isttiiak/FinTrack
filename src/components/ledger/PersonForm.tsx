import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { RELATIONSHIPS } from '@/lib/constants'
import { useCreatePerson, useUpdatePerson } from '@/hooks/useLedger'
import type { Person } from '@/types/ledger.types'

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
    if (editing) {
      await update({ id: editing.id, ...payload })
    } else {
      await create(payload)
    }
    onClose()
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
            <label className="pf-label">Name</label>
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
            <select {...register('relationship')} className="pf-select">
              <option value="">— Select —</option>
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
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

      <style>{`
        .pf-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        @media (max-width: 640px) {
          .pf-overlay { align-items: flex-end; padding: 0; }
          .pf-panel { border-radius: 20px 20px 0 0 !important; }
        }
        .pf-panel {
          width: 100%; max-width: 420px;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px;
          padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .pf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .pf-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .pf-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .pf-close:hover { background: var(--bg-card); color: var(--text-primary); }
        .pf-form { display: flex; flex-direction: column; gap: 14px; }
        .pf-field { display: flex; flex-direction: column; gap: 5px; }
        .pf-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .pf-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .pf-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px; width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pf-input::placeholder { color: var(--text-muted); }
        .pf-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
        .pf-input-error { border-color: var(--accent-red) !important; }
        .pf-textarea { resize: none; font-family: inherit; }
        .pf-select {
          width: 100%; appearance: none;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px; cursor: pointer;
        }
        .pf-select:focus { outline: none; border-color: var(--border-focus); }
        .pf-select option { background: #1E1E38; }
        .pf-error { font-size: 12px; color: #FCA5A5; margin: 0; }
        .pf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
        .pf-submit { min-width: 110px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .lf-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:lf-spin 0.7s linear infinite; }
        @keyframes lf-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
