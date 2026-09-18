import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useDemoStore } from '@/stores/demoStore'
import { fadeUp, scaleIn, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/common/Logo'
import './SignupPage.css'

const signupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type SignupForm = z.infer<typeof signupSchema>

const PASSWORD_RULES = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase',  test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',     test: (p: string) => /[0-9]/.test(p) },
]

const WATERMARK_WORDS = [
  '৳ Track', 'Budgets', 'No-Spend', 'Analytics',
  'Lent', 'Debt', 'Income', 'Expenses',
  'Timeline', 'Reports', 'Savings', 'Balance',
  'Goals', 'Finance', 'Export', 'Insights',
]

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const enterDemo = useDemoStore((s) => s.enterDemo)
  const navigate = useNavigate()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const passwordValue = watch('password', '')

  async function onSubmit(data: SignupForm) {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  if (done) {
    return (
      <div className="auth-shell">
        <div className="auth-orb auth-orb-1" aria-hidden="true" />
        <div className="auth-orb auth-orb-2" aria-hidden="true" />
        <motion.div className="auth-card" variants={scaleIn} initial="initial" animate="animate">
          <motion.div
            className="auth-confirm-screen"
            variants={fadeUp}
            initial="initial"
            animate="animate"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
              className="auth-confirm-icon"
            >
              <CheckCircle2 size={48} color="#4FA981" />
            </motion.div>
            <h2 className="signuppage-auth-title" style={{ marginTop: 16 }}>Check your inbox</h2>
            <p className="auth-subtitle" style={{ maxWidth: 300, margin: '8px auto 0' }}>
              We sent a confirmation link to your email. Click it to activate your FinTrack account.
            </p>
            <Link to="/login" className="auth-submit-btn" style={{ display: 'inline-flex', marginTop: 24, textDecoration: 'none', justifyContent: 'center' }}>
              Back to sign in
            </Link>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      {/* Watermark */}
      <div className="auth-watermark" aria-hidden="true">
        {WATERMARK_WORDS.map((word, i) => (
          <motion.span
            key={word}
            className="auth-watermark-word"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.07, 0.04, 0.07] }}
            transition={{
              duration: 3.5 + (i % 4),
              delay: i * 0.25,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{ gridColumn: `${(i % 4) + 1}`, gridRow: `${Math.floor(i / 4) + 1}` }}
          >
            {word}
          </motion.span>
        ))}
      </div>

      <div className="auth-orb auth-orb-1" aria-hidden="true" />
      <div className="auth-orb auth-orb-2" aria-hidden="true" />
      <div className="auth-orb auth-orb-3" aria-hidden="true" />

      <motion.div className="auth-card" variants={scaleIn} initial="initial" animate="animate">
        {/* Header */}
        <motion.div className="signuppage-auth-header" variants={fadeUp} initial="initial" animate="animate">
          <div className="auth-logo-wrap">
            <Logo size={40} withWordmark />
          </div>
          <h1 className="signuppage-auth-title">Create your account</h1>
          <p className="auth-subtitle">Free forever. Your data, your control.</p>
        </motion.div>

        {/* Google */}
        <motion.button
          className="auth-google-btn"
          onClick={handleGoogle}
          disabled={googleLoading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          {googleLoading ? (
            <span className="signuppage-auth-spinner" />
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

        <div className="signuppage-auth-divider"><span>or create with email</span></div>

        <AnimatePresence>
          {error && (
            <motion.div className="signuppage-auth-error" variants={fadeUp} initial="initial" animate="animate" exit="exit">
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
          {/* Name */}
          <motion.div className="auth-field" variants={staggerItem}>
            <label className="auth-label">Full name</label>
            <div className="auth-input-wrapper">
              <User className="auth-input-icon" size={16} />
              <input
                {...register('full_name')}
                type="text"
                placeholder="Istiak Islam"
                className={cn('auth-input', errors.full_name && 'auth-input-error')}
                autoComplete="name"
              />
            </div>
            {errors.full_name && <p className="auth-field-error">{errors.full_name.message}</p>}
          </motion.div>

          {/* Email */}
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

          {/* Password */}
          <motion.div className="auth-field" variants={staggerItem}>
            <label className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" size={16} />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                className={cn('auth-input auth-input-padded-right', errors.password && 'auth-input-error')}
                autoComplete="new-password"
              />
              <button type="button" className="auth-toggle-password" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Password strength indicators */}
            {passwordValue && (
              <motion.div className="auth-pw-rules" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                {PASSWORD_RULES.map((rule) => (
                  <span key={rule.label} className={cn('auth-pw-rule', rule.test(passwordValue) && 'auth-pw-rule-ok')}>
                    {rule.test(passwordValue) ? '✓' : '○'} {rule.label}
                  </span>
                ))}
              </motion.div>
            )}
            {errors.password && <p className="auth-field-error">{errors.password.message}</p>}
          </motion.div>

          {/* Confirm password */}
          <motion.div className="auth-field" variants={staggerItem}>
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
          </motion.div>

          <motion.button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
            variants={staggerItem}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.span key="loading" className="signuppage-auth-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              ) : (
                <motion.span key="label" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Create account <ArrowRight size={15} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.form>

        <p className="auth-switch" style={{ marginTop: 14 }}>
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">Sign in</Link>
        </p>

        <div className="signuppage-auth-demo-separator" />
        <motion.button
          className="auth-demo-btn"
          onClick={() => { enterDemo(); navigate({ to: '/dashboard' }) }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
        >
          <Sparkles size={15} />
          <span>Explore demo first — no signup needed</span>
        </motion.button>

        <p className="auth-terms">
          By creating an account you agree to our{' '}
          <span className="auth-terms-link">Terms of Service</span>
          {' '}and{' '}
          <span className="auth-terms-link">Privacy Policy</span>.
        </p>
      </motion.div>

    </div>
  )
}

