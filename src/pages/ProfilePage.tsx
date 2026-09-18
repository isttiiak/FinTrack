import { useState, useEffect } from 'react'
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
import { CURRENCIES } from '@/lib/constants'
import './ProfilePage.css'

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

  const { register, handleSubmit, watch, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name:  profile?.full_name ?? '',
      avatar_url: profile?.avatar_url ?? '',
      currency:   profile?.currency ?? 'BDT',
      timezone:   profile?.timezone ?? 'Asia/Dhaka',
    },
  })

  // `defaultValues` above is captured once at mount — if `profile` is still
  // loading at that exact instant, the form is silently stuck on blank
  // fallback values forever, even after the real profile arrives (Sidebar
  // doesn't have this problem since it reads `profile` directly on every
  // render instead of through a one-time form snapshot). Re-sync once the
  // real profile lands or changes.
  useEffect(() => {
    if (!profile) return
    reset({
      full_name:  profile.full_name ?? '',
      avatar_url: profile.avatar_url ?? '',
      currency:   profile.currency ?? 'BDT',
      timezone:   profile.timezone ?? 'Asia/Dhaka',
    })
  }, [profile, reset])

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

          <motion.div className="profilepage-pf-field" variants={staggerItem}>
            <label className="pf-label">Full name</label>
            <input
              {...register('full_name')}
              className={cn('pf-input', errors.full_name && 'pf-input-error')}
              placeholder="Your name"
              disabled={isDemo}
            />
            {errors.full_name && <p className="pf-error">{errors.full_name.message}</p>}
          </motion.div>

          <motion.div className="profilepage-pf-field" variants={staggerItem}>
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
            <div className="profilepage-pf-field">
              <label className="pf-label">Currency</label>
              <select {...register('currency')} className="pf-select" disabled={isDemo}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="profilepage-pf-field">
              <label className="pf-label">Timezone</label>
              <select {...register('timezone')} className="pf-select" disabled={isDemo}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </motion.div>

          {!isDemo && (
            <motion.div className="profilepage-pf-actions" variants={staggerItem}>
              <motion.button
                type="submit"
                className="btn-primary pf-save-btn"
                disabled={saving || !isDirty}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
              >
                <AnimatePresence mode="wait">
                  {saving ? (
                    <motion.span key="saving" className="profilepage-auth-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
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

    </motion.div>
  )
}
