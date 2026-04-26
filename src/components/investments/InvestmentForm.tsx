import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString } from '@/lib/utils'
import { INVESTMENT_CATEGORIES } from '@/types/investment.types'
import { useCreateInvestment, useUpdateInvestment } from '@/hooks/useInvestments'
import type { Investment } from '@/types/investment.types'

const schema = z.object({
  name:             z.string().min(1, 'Name is required'),
  category:         z.enum(INVESTMENT_CATEGORIES).optional(),
  company_name:     z.string().optional(),
  committed_amount: z.number({ error: 'Enter a valid amount' }).positive().optional().or(z.nan().transform(() => undefined)),
  start_date:       z.string().optional(),
  end_date:         z.string().optional(),
  market_value:     z.number().nonnegative().optional().or(z.nan().transform(() => undefined)),
  doc_link:         z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  notes:            z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface InvestmentFormProps {
  editing?: Investment | null
  onClose: () => void
}

const CATEGORY_ICONS: Record<string, string> = {
  'Real Estate': '🏢', 'Shared Business': '🤝', 'Garments': '👕',
  'Farming': '🌾', 'Stocks': '📈', 'Crypto': '₿',
  'Fixed Deposit': '🏦', 'Savings Bond': '📄', 'Other': '💼',
}

export default function InvestmentForm({ editing, onClose }: InvestmentFormProps) {
  const { mutateAsync: create, isPending: creating } = useCreateInvestment()
  const { mutateAsync: update, isPending: updating } = useUpdateInvestment()
  const isPending = creating || updating

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing ? {
      name:             editing.name,
      category:         editing.category ?? undefined,
      company_name:     editing.company_name ?? '',
      committed_amount: editing.committed_amount ?? undefined,
      start_date:       editing.start_date ?? '',
      end_date:         editing.end_date ?? '',
      market_value:     editing.market_value ?? undefined,
      doc_link:         editing.doc_link ?? '',
      notes:            editing.notes ?? '',
    } : {
      start_date: toISODateString(new Date()),
    },
  })

  async function onSubmit(values: FormValues) {
    const payload = {
      name:             values.name,
      category:         values.category ?? null,
      company_name:     values.company_name || null,
      committed_amount: values.committed_amount ?? null,
      start_date:       values.start_date || null,
      end_date:         values.end_date || null,
      market_value:     values.market_value ?? null,
      doc_link:         values.doc_link || null,
      notes:            values.notes || null,
    }
    if (editing) {
      await update({ id: editing.id, ...payload })
    } else {
      await create(payload)
    }
    onClose()
  }

  return (
    <div className="invf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="invf-panel" variants={scaleIn} initial="initial" animate="animate" exit="exit">
        <div className="invf-header">
          <h2 className="invf-title">{editing ? 'Edit investment' : 'Add investment'}</h2>
          <button className="invf-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="invf-form">
          <div className="invf-field">
            <label className="invf-label">Investment name <span className="req">*</span></label>
            <input
              {...register('name')}
              className={cn('invf-input', errors.name && 'invf-input-error')}
              placeholder="e.g. Bay Sand Hotel, Beximco Shares"
              autoFocus
            />
            {errors.name && <p className="invf-error">{errors.name.message}</p>}
          </div>

          <div className="invf-row">
            <div className="invf-field">
              <label className="invf-label">Category</label>
              <select {...register('category')} className="invf-select">
                <option value="">— Select —</option>
                {INVESTMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                ))}
              </select>
            </div>
            <div className="invf-field">
              <label className="invf-label">Company / Entity <span className="invf-optional">(optional)</span></label>
              <input
                {...register('company_name')}
                className="invf-input"
                placeholder="e.g. ABC Ltd."
              />
            </div>
          </div>

          <div className="invf-field">
            <label className="invf-label">Committed amount (৳) <span className="req">*</span></label>
            <input
              {...register('committed_amount', { setValueAs: (v) => (v === '' || v === null || v === undefined) ? undefined : Number(v) })}
              type="number" step="0.01" placeholder="0.00"
              className={cn('invf-input invf-amount-input', errors.committed_amount && 'invf-input-error')}
            />
            <p className="field-hint">Total capital you have agreed to invest in this deal.</p>
            {errors.committed_amount && <p className="invf-error">{errors.committed_amount.message}</p>}
          </div>

          <div className="invf-row">
            <div className="invf-field">
              <label className="invf-label">Start date</label>
              <input {...register('start_date')} type="date" className="invf-input" />
            </div>
            <div className="invf-field">
              <label className="invf-label">Maturity / exit date <span className="invf-optional">(optional)</span></label>
              <input {...register('end_date')} type="date" className="invf-input" />
              <p className="field-hint">When you expect to exit or get capital back — e.g. lease end date, bond maturity, or planned sale date.</p>
            </div>
          </div>

          <div className="invf-field">
            <label className="invf-label">Current market value (৳) <span className="invf-optional">(optional — update any time)</span></label>
            <input
              {...register('market_value', { setValueAs: (v) => (v === '' || v === null || v === undefined) ? undefined : Number(v) })}
              type="number" step="0.01" placeholder="Current value of your investment"
              className="invf-input"
            />
            <p className="field-hint">Leave blank if unknown. You can update this later as value changes.</p>
          </div>

          <div className="invf-field">
            <label className="invf-label">Document link <span className="invf-optional">(optional)</span></label>
            <input
              {...register('doc_link')}
              className={cn('invf-input', errors.doc_link && 'invf-input-error')}
              placeholder="Google Drive, agreement URL…"
              type="url"
            />
            {errors.doc_link && <p className="invf-error">{errors.doc_link.message}</p>}
          </div>

          <div className="invf-field">
            <label className="invf-label">Notes <span className="invf-optional">(optional)</span></label>
            <textarea
              {...register('notes')}
              className="invf-input invf-textarea"
              placeholder="Partners, terms, conditions…"
              rows={2}
            />
          </div>

          <div className="invf-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <motion.button
              type="submit"
              className="btn-primary invf-submit"
              disabled={isPending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span key="spin" className="invf-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                ) : (
                  <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {editing ? 'Save changes' : 'Add investment'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </form>
      </motion.div>

      <style>{`
        .invf-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        @media (max-width: 640px) {
          .invf-overlay { align-items: flex-end; padding: 0; }
          .invf-panel { border-radius: 20px 20px 0 0 !important; max-height: 92vh; overflow-y: auto; }
        }
        .invf-panel {
          width: 100%; max-width: 500px;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px;
          padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .invf-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .invf-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .invf-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: var(--bg-hover); border: 1px solid var(--border);
          color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .invf-close:hover { background: var(--bg-card); color: var(--text-primary); }
        .invf-form { display: flex; flex-direction: column; gap: 14px; }
        .invf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 520px) { .invf-row { grid-template-columns: 1fr; } }
        .invf-field { display: flex; flex-direction: column; gap: 5px; }
        .invf-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .invf-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .invf-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px; width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .invf-input::placeholder { color: var(--text-muted); }
        .invf-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
        .invf-input-error { border-color: var(--accent-red) !important; }
        .invf-amount-input { font-size: 18px; font-weight: 600; }
        .invf-textarea { resize: none; font-family: inherit; }
        .invf-select {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px;
          width: 100%; cursor: pointer; appearance: none;
        }
        .invf-select:focus { outline: none; border-color: var(--border-focus); }
        .invf-select option { background: #1E1E38; }
        .invf-error { font-size: 12px; color: #FCA5A5; margin: 0; }
        .invf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
        .invf-submit { min-width: 140px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .invf-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:invf-spin 0.7s linear infinite; }
        @keyframes invf-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
