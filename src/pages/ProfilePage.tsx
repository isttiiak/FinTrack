import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Save, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'

const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'SGD', 'AED', 'INR'] as const
const TIMEZONES = [
  'Asia/Dhaka',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Dubai',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
] as const

const schema = z.object({
  full_name:  z.string().min(2, 'Name must be at least 2 characters'),
  avatar_url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  currency:   z.string().min(1),
  timezone:   z.string().min(1),
})
type FormValues = z.infer<typeof schema>

export default function ProfilePage() {
  const { profile, setProfile } = useAuthStore()
  const isDemo = useDemoStore((s) => s.isDemo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name:  profile?.full_name ?? '',
      avatar_url: profile?.avatar_url ?? '',
      currency:   profile?.currency ?? 'BDT',
      timezone:   profile?.timezone ?? 'Asia/Dhaka',
    },
  })

  const avatarUrl = watch('avatar_url')
  const displayName = watch('full_name') || (isDemo ? 'Demo User' : 'You')

  async function onSubmit(values: FormValues) {
    if (isDemo) return
    setSaving(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('profiles')
      .update({
        full_name:  values.full_name,
        avatar_url: values.avatar_url || null,
        currency:   values.currency,
        timezone:   values.timezone,
      })
      .eq('id', profile!.id)
      .select()
      .single()

    setSaving(false)

    if (err) {
      setError(err.message)
    } else {
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="profile-page"
    >
      <div className="profile-page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your personal information and preferences</p>
      </div>

      {isDemo && (
        <motion.div className="demo-notice" variants={fadeUp}>
          Profile editing is disabled in demo mode.
        </motion.div>
      )}

      <div className="profile-layout">
        {/* Avatar card */}
        <motion.div className="profile-avatar-card" variants={staggerItem}>
          <div className="profile-avatar-wrap">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="profile-avatar-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : null}
            <div className="profile-avatar-fallback" style={{ display: avatarUrl ? 'none' : 'flex' }}>
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="profile-avatar-overlay">
              <Camera size={20} color="#fff" />
            </div>
          </div>

          <div className="profile-avatar-info">
            <div className="profile-avatar-name">{displayName}</div>
            <div className="profile-avatar-email">{isDemo ? 'demo@fintrack.app' : profile?.email}</div>
          </div>

          {profile?.created_at && !isDemo && (
            <div className="profile-joined">
              Member since {new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </motion.div>

        {/* Edit form */}
        <motion.form
          className="profile-form-card"
          onSubmit={handleSubmit(onSubmit)}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence>
            {error && (
              <motion.div className="profile-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="pf-field" variants={staggerItem}>
            <label className="pf-label">Full name</label>
            <input
              {...register('full_name')}
              className={cn('pf-input', errors.full_name && 'pf-input-error')}
              placeholder="Your name"
              disabled={isDemo}
            />
            {errors.full_name && <p className="pf-error">{errors.full_name.message}</p>}
          </motion.div>

          <motion.div className="pf-field" variants={staggerItem}>
            <label className="pf-label">Avatar URL <span className="pf-optional">(optional — paste any image URL)</span></label>
            <input
              {...register('avatar_url')}
              className={cn('pf-input', errors.avatar_url && 'pf-input-error')}
              placeholder="https://example.com/your-photo.jpg"
              disabled={isDemo}
            />
            {errors.avatar_url && <p className="pf-error">{errors.avatar_url.message}</p>}
          </motion.div>

          <motion.div className="pf-row" variants={staggerItem}>
            <div className="pf-field">
              <label className="pf-label">Currency</label>
              <select {...register('currency')} className="pf-select" disabled={isDemo}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label className="pf-label">Timezone</label>
              <select {...register('timezone')} className="pf-select" disabled={isDemo}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </motion.div>

          {!isDemo && (
            <motion.div className="pf-actions" variants={staggerItem}>
              <motion.button
                type="submit"
                className="btn-primary pf-save-btn"
                disabled={saving || !isDirty}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
              >
                <AnimatePresence mode="wait">
                  {saving ? (
                    <motion.span key="saving" className="auth-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                  ) : saved ? (
                    <motion.span key="saved" className="pf-saved" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check size={15} /> Saved
                    </motion.span>
                  ) : (
                    <motion.span key="label" className="pf-save-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Save size={15} /> Save changes
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          )}
        </motion.form>
      </div>

      <style>{`
        .profile-page { max-width: 820px; }
        .profile-page-header { margin-bottom: 24px; }
        .page-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
        .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }

        .demo-notice {
          margin-bottom: 16px; padding: 10px 16px;
          background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.2); border-radius: 10px;
          font-size: 13px; color: var(--accent-primary);
        }

        .profile-layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 640px) { .profile-layout { grid-template-columns: 1fr; } }

        .profile-avatar-card {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
          padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;
        }
        .profile-avatar-wrap {
          position: relative; width: 80px; height: 80px; border-radius: 50%; overflow: hidden;
          cursor: pointer;
        }
        .profile-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .profile-avatar-fallback {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, #6C63FF, #A855F7);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 700; color: #fff;
        }
        .profile-avatar-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.15s;
        }
        .profile-avatar-wrap:hover .profile-avatar-overlay { opacity: 1; }
        .profile-avatar-info { display: flex; flex-direction: column; gap: 3px; }
        .profile-avatar-name { font-size: 16px; font-weight: 600; color: var(--text-primary); }
        .profile-avatar-email { font-size: 12px; color: var(--text-muted); word-break: break-all; }
        .profile-joined { font-size: 11px; color: var(--text-muted); }

        .profile-form-card {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
          padding: 24px; display: flex; flex-direction: column; gap: 16px;
        }
        .profile-error {
          padding: 10px 14px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
          border-radius: 8px; font-size: 13px; color: #FCA5A5;
        }

        .pf-field { display: flex; flex-direction: column; gap: 6px; }
        .pf-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .pf-optional { font-size: 11px; color: var(--text-muted); font-weight: 400; }
        .pf-input {
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px;
          transition: border-color 0.15s, box-shadow 0.15s; width: 100%;
        }
        .pf-input::placeholder { color: var(--text-muted); }
        .pf-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
        .pf-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .pf-input-error { border-color: var(--accent-red) !important; }
        .pf-error { font-size: 12px; color: #FCA5A5; margin: 0; }
        .pf-select {
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px; padding: 10px 14px;
          width: 100%; cursor: pointer;
        }
        .pf-select:focus { outline: none; border-color: var(--border-focus); }
        .pf-select:disabled { opacity: 0.5; cursor: not-allowed; }
        .pf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .pf-row { grid-template-columns: 1fr; } }

        .pf-actions { display: flex; justify-content: flex-end; }
        .pf-save-btn { min-width: 140px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
        .pf-save-label, .pf-saved { display: flex; align-items: center; gap: 7px; }
        .pf-saved { color: #fff; }
        .auth-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  )
}
