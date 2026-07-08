import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { fadeUp, scaleIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/common/Logo'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})
type ForgotForm = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: ForgotForm) {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-orb auth-orb-1" aria-hidden="true" />
      <div className="auth-orb auth-orb-2" aria-hidden="true" />

      <motion.div className="auth-card" variants={scaleIn} initial="initial" animate="animate">
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              className="auth-confirm-screen"
              variants={fadeUp}
              initial="initial"
              animate="animate"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
              >
                <CheckCircle2 size={48} color="#4FA981" />
              </motion.div>
              <h2 className="auth-title" style={{ marginTop: 16 }}>Reset link sent</h2>
              <p className="auth-subtitle" style={{ maxWidth: 300, margin: '8px auto 0' }}>
                Check your inbox for the password reset link. It expires in 1 hour.
              </p>
              <Link to="/login" className="auth-submit-btn" style={{ display: 'inline-flex', marginTop: 24, textDecoration: 'none', justifyContent: 'center' }}>
                Back to sign in
              </Link>
            </motion.div>
          ) : (
            <motion.div key="form" variants={fadeUp} initial="initial" animate="animate">
              <div className="auth-header">
                <div className="auth-logo-wrap">
                  <Logo size={40} withWordmark />
                </div>
                <h1 className="auth-title">Forgot your password?</h1>
                <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>
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
                  <label className="auth-label">Email address</label>
                  <div className="auth-input-wrapper">
                    <Mail className="auth-input-icon" size={16} />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="you@example.com"
                      className={cn('auth-input', errors.email && 'auth-input-error')}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
                </div>

                <motion.button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? <span className="auth-spinner" /> : 'Send reset link'}
                </motion.button>
              </form>

              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
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
        .auth-back-link {
          display: flex; align-items: center; gap: 6px; justify-content: center;
          margin-top: 16px; font-size: 13px; color: var(--text-secondary); text-decoration: none;
        }
        .auth-back-link:hover { color: var(--text-primary); }
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
