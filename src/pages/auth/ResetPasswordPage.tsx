import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Lock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { fadeUp, scaleIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/common/Logo'
import './ResetPasswordPage.css'

const schema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type ResetForm = z.infer<typeof schema>

const PASSWORD_RULES = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',    test: (p: string) => /[0-9]/.test(p) },
]

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(schema),
  })

  const passwordValue = watch('password', '')

  async function onSubmit(data: ResetForm) {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password: data.password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  // No recovery session found — link is invalid, already used, or expired
  const invalidLink = !session && !done

  return (
    <div className="auth-shell">
      <div className="auth-orb auth-orb-1" aria-hidden="true" />
      <div className="auth-orb auth-orb-2" aria-hidden="true" />

      <motion.div className="auth-card" variants={scaleIn} initial="initial" animate="animate">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" className="auth-confirm-screen" variants={fadeUp} initial="initial" animate="animate">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
              >
                <CheckCircle2 size={48} color="#4FA981" />
              </motion.div>
              <h2 className="auth-title" style={{ marginTop: 16 }}>Password updated</h2>
              <p className="auth-subtitle" style={{ maxWidth: 300, margin: '8px auto 0' }}>
                Your password has been changed. Sign in with your new password.
              </p>
              <button
                className="auth-submit-btn"
                style={{ marginTop: 24 }}
                onClick={() => navigate({ to: '/login' })}
              >
                Back to sign in
              </button>
            </motion.div>
          ) : invalidLink ? (
            <motion.div key="invalid" className="auth-confirm-screen" variants={fadeUp} initial="initial" animate="animate">
              <AlertTriangle size={48} color="#C9736E" />
              <h2 className="auth-title" style={{ marginTop: 16 }}>Link expired or invalid</h2>
              <p className="auth-subtitle" style={{ maxWidth: 300, margin: '8px auto 0' }}>
                This password reset link is no longer valid. Request a new one to continue.
              </p>
              <Link to="/forgot-password" className="auth-submit-btn" style={{ display: 'inline-flex', marginTop: 24, textDecoration: 'none', justifyContent: 'center' }}>
                Request new link
              </Link>
            </motion.div>
          ) : (
            <motion.div key="form" variants={fadeUp} initial="initial" animate="animate">
              <div className="auth-header">
                <div className="auth-logo-wrap">
                  <Logo size={40} withWordmark />
                </div>
                <h1 className="auth-title">Set a new password</h1>
                <p className="auth-subtitle">Choose a new password for your account.</p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div className="auth-error" variants={fadeUp} initial="initial" animate="animate" exit="exit">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
                <div className="auth-field">
                  <label className="auth-label">New password</label>
                  <div className="auth-input-wrapper">
                    <Lock className="auth-input-icon" size={16} />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      className={cn('auth-input auth-input-padded-right', errors.password && 'auth-input-error')}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button type="button" className="auth-toggle-password" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordValue && (
                    <div className="auth-pw-rules">
                      {PASSWORD_RULES.map((rule) => (
                        <span key={rule.label} className={cn('auth-pw-rule', rule.test(passwordValue) && 'auth-pw-rule-ok')}>
                          {rule.test(passwordValue) ? '✓' : '○'} {rule.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {errors.password && <p className="auth-field-error">{errors.password.message}</p>}
                </div>

                <div className="auth-field">
                  <label className="auth-label">Confirm password</label>
                  <div className="auth-input-wrapper">
                    <Lock className="auth-input-icon" size={16} />
                    <input
                      {...register('confirm_password')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      className={cn('auth-input auth-input-padded-right', errors.confirm_password && 'auth-input-error')}
                      autoComplete="new-password"
                    />
                    <button type="button" className="auth-toggle-password" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirm_password && <p className="auth-field-error">{errors.confirm_password.message}</p>}
                </div>

                <motion.button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? <span className="resetpasswordpage-auth-spinner" /> : 'Update password'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  )
}
