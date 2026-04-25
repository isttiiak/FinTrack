import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, TrendingUp, Wallet, BarChart3, ArrowRight, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useDemoStore } from '@/stores/demoStore'
import { fadeUp, scaleIn, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type LoginForm = z.infer<typeof loginSchema>

const WATERMARK_WORDS = [
  '৳ Expenses', 'Lent & Debt', 'Analytics', 'Budgets',
  'No-Spend', 'Income', 'Payments', 'Export',
  'Categories', 'Timeline', 'Insights', 'Balance',
  '৳ Track', 'Finance', 'Savings', 'Goals',
]

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const enterDemo = useDemoStore((s) => s.enterDemo)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSuccess(true)
      // router navigation is handled by the auth listener in App.tsx
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  function handleDemo() {
    enterDemo()
  }

  return (
    <div className="auth-shell">
      {/* ── Animated background watermarks ── */}
      <div className="auth-watermark" aria-hidden="true">
        {WATERMARK_WORDS.map((word, i) => (
          <motion.span
            key={word}
            className="auth-watermark-word"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.07, 0.04, 0.07] }}
            transition={{
              duration: 4 + (i % 5),
              delay: i * 0.3,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              gridColumn: `${(i % 4) + 1}`,
              gridRow: `${Math.floor(i / 4) + 1}`,
            }}
          >
            {word}
          </motion.span>
        ))}
      </div>

      {/* ── Floating decorative orbs ── */}
      <div className="auth-orb auth-orb-1" aria-hidden="true" />
      <div className="auth-orb auth-orb-2" aria-hidden="true" />
      <div className="auth-orb auth-orb-3" aria-hidden="true" />

      {/* ── Card ── */}
      <motion.div
        className="auth-card"
        variants={scaleIn}
        initial="initial"
        animate="animate"
      >
        {/* Logo + headline */}
        <motion.div className="auth-header" variants={fadeUp} initial="initial" animate="animate">
          <div className="auth-logo">
            <span className="auth-logo-symbol">৳</span>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to FinTrack and pick up where you left off</p>
        </motion.div>

        {/* Google OAuth */}
        <motion.button
          className="auth-google-btn"
          onClick={handleGoogle}
          disabled={googleLoading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          {googleLoading ? (
            <span className="auth-spinner" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          )}
          <span>Continue with Google</span>
        </motion.button>

        <div className="auth-divider">
          <span>or sign in with email</span>
        </div>

        {/* Email form */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="auth-error"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          className="auth-form"
          onSubmit={handleSubmit(onSubmit)}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div className="auth-field" variants={staggerItem}>
            <label className="auth-label">Email</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" size={16} />
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className={cn('auth-input', errors.email && 'auth-input-error')}
                autoComplete="email"
              />
            </div>
            {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
          </motion.div>

          <motion.div className="auth-field" variants={staggerItem}>
            <div className="auth-label-row">
              <label className="auth-label">Password</label>
              <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
            </div>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" size={16} />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={cn('auth-input auth-input-padded-right', errors.password && 'auth-input-error')}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="auth-field-error">{errors.password.message}</p>}
          </motion.div>

          <motion.button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || success}
            variants={staggerItem}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.span key="loading" className="auth-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              ) : success ? (
                <motion.span key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} className="auth-success-icon">✓</motion.span>
              ) : (
                <motion.span key="label" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Sign in <ArrowRight size={15} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.form>

        {/* Sign up link */}
        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-switch-link">Create one free</Link>
        </p>

        {/* Demo mode */}
        <div className="auth-demo-separator" />
        <motion.button
          className="auth-demo-btn"
          onClick={handleDemo}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
        >
          <Sparkles size={15} />
          <span>Try demo — no signup needed</span>
        </motion.button>

        {/* Feature pills */}
        <motion.div
          className="auth-features"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {[
            { icon: <Wallet size={13} />, label: 'Expense tracking' },
            { icon: <TrendingUp size={13} />, label: 'Lent & Debt' },
            { icon: <BarChart3 size={13} />, label: 'Analytics' },
          ].map((f) => (
            <motion.span key={f.label} className="auth-feature-pill" variants={staggerItem}>
              {f.icon} {f.label}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>

      <style>{authStyles}</style>
    </div>
  )
}

const authStyles = `
.auth-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
  position: relative;
  overflow: hidden;
  padding: 24px 16px;
}

/* Watermark grid */
.auth-watermark {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  pointer-events: none;
  z-index: 0;
}
.auth-watermark-word {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-primary);
  letter-spacing: 0.02em;
  user-select: none;
  white-space: nowrap;
}

/* Decorative orbs */
.auth-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}
.auth-orb-1 { width: 380px; height: 380px; background: rgba(108,99,255,0.12); top: -80px; left: -80px; }
.auth-orb-2 { width: 300px; height: 300px; background: rgba(168,85,247,0.09); bottom: -60px; right: -60px; }
.auth-orb-3 { width: 200px; height: 200px; background: rgba(16,185,129,0.06); top: 50%; left: 50%; transform: translate(-50%,-50%); }

/* Card */
.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 36px 32px 28px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(108,99,255,0.08);
}
@media (max-width: 480px) {
  .auth-card { padding: 28px 20px 22px; }
}

/* Header */
.auth-header { text-align: center; margin-bottom: 24px; }
.auth-logo {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #6C63FF, #A855F7);
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 8px 24px rgba(108,99,255,0.35);
}
.auth-logo-symbol { font-size: 26px; font-weight: 700; color: #fff; line-height: 1; }
.auth-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
.auth-subtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }

/* Google button */
.auth-google-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 11px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px; font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.auth-google-btn:hover { background: var(--bg-hover); border-color: var(--text-muted); }

/* Divider */
.auth-divider {
  display: flex; align-items: center; gap: 12px;
  margin: 16px 0;
  color: var(--text-muted); font-size: 12px;
}
.auth-divider::before, .auth-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

/* Error banner */
.auth-error {
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: #FCA5A5;
  font-size: 13px;
  margin-bottom: 14px;
}

/* Form */
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.auth-field { display: flex; flex-direction: column; gap: 5px; }
.auth-label-row { display: flex; align-items: center; justify-content: space-between; }
.auth-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.auth-forgot-link { font-size: 12px; color: var(--accent-primary); text-decoration: none; }
.auth-forgot-link:hover { text-decoration: underline; }

.auth-input-wrapper { position: relative; }
.auth-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.auth-input {
  width: 100%; padding: 10px 14px 10px 36px;
  background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px;
  color: var(--text-primary); font-size: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.auth-input::placeholder { color: var(--text-muted); }
.auth-input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }
.auth-input-error { border-color: var(--accent-red) !important; }
.auth-input-padded-right { padding-right: 40px; }
.auth-field-error { font-size: 12px; color: #FCA5A5; margin: 0; }

.auth-toggle-password {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;
}
.auth-toggle-password:hover { color: var(--text-secondary); }

.auth-submit-btn {
  width: 100%; padding: 12px;
  background: linear-gradient(135deg, #6C63FF, #A855F7);
  border: none; border-radius: 10px;
  color: #fff; font-size: 14px; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px;
  box-shadow: 0 4px 16px rgba(108,99,255,0.3);
  transition: box-shadow 0.15s, opacity 0.15s;
}
.auth-submit-btn:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(108,99,255,0.45); }
.auth-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-success-icon { font-size: 18px; }

/* Switch line */
.auth-switch { font-size: 13px; color: var(--text-secondary); text-align: center; margin: 16px 0 0; }
.auth-switch-link { color: var(--accent-primary); font-weight: 500; text-decoration: none; }
.auth-switch-link:hover { text-decoration: underline; }

/* Demo */
.auth-demo-separator { height: 1px; background: var(--border); margin: 18px 0 14px; }
.auth-demo-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px;
  background: rgba(108,99,255,0.08);
  border: 1px dashed rgba(108,99,255,0.35);
  border-radius: 10px;
  color: var(--accent-primary); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 0.15s, border-color 0.15s;
}
.auth-demo-btn:hover { background: rgba(108,99,255,0.14); border-color: rgba(108,99,255,0.6); }

/* Feature pills */
.auth-features { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 16px; }
.auth-feature-pill {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px;
  font-size: 11px; color: var(--text-muted);
}

/* Spinner */
.auth-spinner {
  display: inline-block; width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
`
