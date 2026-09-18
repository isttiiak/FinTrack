import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { cn, toISODateString, getActiveCurrencySymbol } from '@/lib/utils'
import { INVESTMENT_CATEGORIES } from '@/types/investment.types'
import { useCreateInvestment, useUpdateInvestment } from '@/hooks/useInvestments'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import type { Investment } from '@/types/investment.types'
import './InvestmentForm.css'

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
            <label className="invf-label">Committed amount ({getActiveCurrencySymbol()}) <span className="req">*</span></label>
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
            <label className="invf-label">Current market value ({getActiveCurrencySymbol()}) <span className="invf-optional">(optional — update any time)</span></label>
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

    </div>
  )
}
