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
                  {loading ? <span className="auth-spinner" /> : 'Update password'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        .auth-shell {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: var(--bg-page); position: relative; overflow: hidden; padding: 24px 16px;
        }
        .auth-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
        .auth-orb-1 { width: 380px; height: 380px; background: rgba(79, 169, 129,0.12); top: -80px; left: -80px; }
        .auth-orb-2 { width: 300px; height: 300px; background: rgba(62, 155, 114,0.09); bottom: -60px; right: -60px; }
        .auth-card {
          position: relative; z-index: 1; width: 100%; max-width: 400px;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px;
          padding: 36px 32px 28px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(79, 169, 129,0.08);
        }
        .auth-header { text-align: center; margin-bottom: 24px; }
        .auth-logo-wrap { display: flex; justify-content: center; margin: 0 auto 16px; }
        .auth-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
        .auth-subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }
        .auth-error {
          background: rgba(194, 91, 85,0.1); border: 1px solid rgba(194, 91, 85,0.3); border-radius: 8px;
          padding: 10px 14px; color: #FCA5A5; font-size: 13px; margin-bottom: 14px;
        }
        .auth-form { display: flex; flex-direction: column; gap: 14px; }
        .auth-field { display: flex; flex-direction: column; gap: 5px; }
        .auth-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .auth-input-wrapper { position: relative; }
        .auth-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .auth-input {
          width: 100%; padding: 10px 14px 10px 36px;
          background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 14px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-input::placeholder { color: var(--text-muted); }
        .auth-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(79, 169, 129,0.15); }
        .auth-input-error { border-color: var(--accent-red) !important; }
        .auth-input-padded-right { padding-right: 40px; }
        .auth-toggle-password {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;
        }
        .auth-toggle-password:hover { color: var(--text-secondary); }
        .auth-pw-rules { display: flex; gap: 10px; flex-wrap: wrap; padding: 4px 0; }
        .auth-pw-rule { font-size: 11px; color: var(--text-muted); transition: color 0.15s; }
        .auth-pw-rule-ok { color: var(--accent-teal); }
        .auth-field-error { font-size: 12px; color: #FCA5A5; margin: 0; }
        .auth-submit-btn {
          width: 100%; padding: 12px;
          background: linear-gradient(135deg, #3E9B72, #4FA981 60%, #C2A24E);
          border: none; border-radius: 10px;
          color: #fff; font-size: 14px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          min-height: 44px;
          box-shadow: 0 4px 16px rgba(79, 169, 129,0.3);
          transition: box-shadow 0.15s, opacity 0.15s;
        }
        .auth-submit-btn:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(79, 169, 129,0.45); }
        .auth-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-confirm-screen { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 16px 0 8px; }
        .auth-spinner {
          display: inline-block; width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
