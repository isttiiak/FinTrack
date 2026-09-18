import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, TrendingUp, Wallet, BarChart3, ArrowRight, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useDemoStore } from '@/stores/demoStore'
import { fadeUp, scaleIn, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/common/Logo'
import './LoginPage.css'

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
  const navigate = useNavigate()

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
      options: { redirectTo: window.location.origin },
    })
  }

  function handleDemo() {
    enterDemo()
    navigate({ to: '/dashboard' })
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
          <div className="auth-logo-wrap">
            <Logo size={40} withWordmark />
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

    </div>
  )
}

