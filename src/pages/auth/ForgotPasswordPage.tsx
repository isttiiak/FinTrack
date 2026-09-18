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
import './ForgotPasswordPage.css'

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
                  {loading ? <span className="forgotpasswordpage-auth-spinner" /> : 'Send reset link'}
                </motion.button>
              </form>

              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  )
}
