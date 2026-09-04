import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, AlertCircle } from 'lucide-react'
import { aiVisionChat, isOcrConfigured } from '@/lib/aiProvider'
import { RECEIPT_OCR_SYSTEM_PROMPT, buildReceiptUserPrompt, parseReceiptExtraction } from '@/lib/receiptOcr'
import { toISODateString } from '@/lib/utils'
import type { Category } from '@/types/expense.types'

// Keeps the base64 payload (roughly 1.33x the file size) well under typical
// vision-endpoint request-body limits.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export interface ReceiptScanResult {
  amount?: number
  description?: string
  txn_date?: string
  category_id?: string
}

interface ReceiptScannerProps {
  categories: Category[]
  onExtracted: (result: ReceiptScanResult) => void
}

// Never persisted anywhere — the image lives in this component's state only
// long enough to base64-encode it and send it straight to OpenRouter; there
// is no doc_link column on transactions to attach it to (that's a separate,
// not-yet-built feature, TODO.md §5.11), and the extracted fields always
// need the user's review before Save, never an auto-inserted transaction.
export default function ReceiptScanner({ categories, onExtracted }: ReceiptScannerProps) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setOpen(false)
    setPreview(null)
    setLoading(false)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFile(file: File) {
    setError(null)
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    if (file.size > MAX_IMAGE_BYTES) { setError('Image is too large — try a smaller photo (under 5MB).'); return }
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.onerror = () => setError("Couldn't read that image — try again.")
    reader.readAsDataURL(file)
  }

  async function handleExtract() {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const raw = await aiVisionChat(
        RECEIPT_OCR_SYSTEM_PROMPT,
        buildReceiptUserPrompt(toISODateString(new Date())),
        preview,
      )
      const extraction = parseReceiptExtraction(raw)
      const guess = extraction.categoryGuess?.toLowerCase()
      const matchedCategory = guess
        ? categories.find((c) => c.name.toLowerCase() === guess || c.main_group.toLowerCase() === guess)
        : undefined
      onExtracted({
        amount: extraction.amount ?? undefined,
        txn_date: extraction.date ?? undefined,
        description: extraction.merchant ?? extraction.lineItems[0] ?? undefined,
        category_id: matchedCategory?.id,
      })
      reset()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not read that receipt — try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <>
        <button type="button" className="ef-scan-trigger" onClick={() => setOpen(true)}>
          <Camera size={14} /> Scan receipt
        </button>
        <style>{`
          .ef-scan-trigger {
            display: inline-flex; align-items: center; gap: 6px;
            background: none; border: 1px dashed var(--border); border-radius: 8px;
            color: var(--text-secondary); font-size: 12px; font-weight: 600;
            padding: 7px 12px; cursor: pointer; transition: all 0.15s;
          }
          .ef-scan-trigger:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
        `}</style>
      </>
    )
  }

  return (
    <motion.div
      className="ef-scan-panel"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="ef-scan-header">
        <span className="ef-scan-title"><Camera size={13} /> Scan receipt</span>
        <button type="button" className="ef-scan-close" onClick={reset}><X size={14} /></button>
      </div>

      {!isOcrConfigured() ? (
        <p className="ef-scan-hint">Add an OpenRouter key in Settings → AI Insights to use receipt scanning.</p>
      ) : !preview ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <button type="button" className="ef-scan-pick" onClick={() => fileRef.current?.click()}>
            Choose or take a photo
          </button>
        </>
      ) : (
        <>
          <img src={preview} alt="Receipt preview" className="ef-scan-preview" />
          <div className="ef-scan-actions">
            <button type="button" className="ef-scan-retake" onClick={() => setPreview(null)} disabled={loading}>
              Retake
            </button>
            <button type="button" className="ef-scan-extract" onClick={handleExtract} disabled={loading}>
              {loading ? <span className="ef-scan-spinner" /> : 'Extract'}
            </button>
          </div>
        </>
      )}

      <AnimatePresence>
        {error && (
          <motion.p className="ef-scan-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AlertCircle size={12} /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      {preview && <p className="ef-scan-disclaimer">AI-read from the photo — review every field before saving.</p>}

      <style>{`
        .ef-scan-panel {
          display: flex; flex-direction: column; gap: 8px;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          padding: 12px; overflow: hidden;
        }
        .ef-scan-header { display: flex; align-items: center; justify-content: space-between; }
        .ef-scan-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-primary); }
        .ef-scan-close { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; padding: 2px; }
        .ef-scan-hint { font-size: 12px; color: var(--text-muted); margin: 0; }
        .ef-scan-pick {
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text-primary); font-size: 13px; font-weight: 600; padding: 10px; cursor: pointer;
        }
        .ef-scan-pick:hover { border-color: var(--accent-primary); }
        .ef-scan-preview { width: 100%; max-height: 160px; object-fit: contain; border-radius: 8px; background: var(--bg-elevated); }
        .ef-scan-actions { display: flex; gap: 8px; }
        .ef-scan-retake, .ef-scan-extract {
          flex: 1; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .ef-scan-retake { background: none; border: 1px solid var(--border); color: var(--text-secondary); }
        .ef-scan-extract { background: var(--grad-brand); border: none; color: #fff; }
        .ef-scan-extract:disabled, .ef-scan-retake:disabled { opacity: 0.6; cursor: default; }
        .ef-scan-spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%;
          animation: ef-scan-spin 0.7s linear infinite;
        }
        @keyframes ef-scan-spin { to { transform: rotate(360deg); } }
        .ef-scan-error { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--accent-red); margin: 0; }
        .ef-scan-disclaimer { font-size: 11px; color: var(--text-muted); margin: 0; }
      `}</style>
    </motion.div>
  )
}
