import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight, Sparkles, Shield, Download, BarChart3, Users,
  Receipt, TrendingUp, Brain, MessageSquare, Target, ChevronRight,
} from 'lucide-react'
import { useDemoStore } from '@/stores/demoStore'
import { useAuthStore } from '@/stores/authStore'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { Logo } from '@/components/common/Logo'
import './LandingPage.css'

// ── Feature data ──────────────────────────────────────────────────────────────
const CORE_FEATURES = [
  {
    icon: Receipt, color: '#4FA981',
    label: 'Expense Tracking',
    desc: 'Log income and expenses by category. Smart payment method picker — Cash, MFS (bKash/Nagad), Card, Bank Transfer — auto-fills the account.',
  },
  {
    icon: Users, color: '#4FA981',
    label: 'Lent & Debt Ledger',
    desc: 'Full timeline per person. Track payments, partial settlements, net position, and status — all in one place.',
  },
  {
    icon: TrendingUp, color: '#C2A24E',
    label: 'Investment Tracker',
    desc: 'Track committed capital, installment payments, and returns. ROI %, P&L, and portfolio summary computed live.',
  },
  {
    icon: BarChart3, color: '#3E9B72',
    label: 'Analytics',
    desc: 'Monthly trend, category donut, daily bars, budget vs actual, no-spend calendar, and 6 live KPI cards.',
  },
  {
    icon: Download, color: '#3E9B72',
    label: 'Data Export & Import',
    desc: 'Export to Excel (multi-sheet) or CSV. Import expenses from any CSV with a live preview. Your data, always yours.',
  },
  {
    icon: Shield, color: '#C25B55',
    label: 'Privacy by Design',
    desc: 'Supabase Row-Level Security on every table. Self-host in 10 minutes with your own Supabase project.',
  },
]

const AI_FEATURES = [
  { icon: '✨', label: 'Smart Categorization',    desc: 'AI suggests the category as you type the description — one click to accept.' },
  { icon: '🚨', label: 'Anomaly Detection',        desc: 'Flags spending spikes vs your 3-month average before they become a problem.' },
  { icon: '📋', label: 'Weekly Digest',            desc: 'A friendly 7-day summary with highlights, concerns, and a motivational tip.' },
  { icon: '⚖️', label: 'Budget Analysis',          desc: 'Explains WHY you\'re over budget and exactly what to cut.' },
  { icon: '💬', label: 'Ask Anything',             desc: '"How much did I spend on food?" — chat in plain language about your data.' },
  { icon: '🎯', label: 'Goal-Based Planning',      desc: 'Enter a savings goal, get a month-by-month spending plan with specific cuts.' },
  { icon: '🔄', label: 'Spending Patterns',        desc: 'Identifies expensive habits and recurring costs across your 6-month history.' },
  { icon: '💡', label: 'Budget Recommendations',   desc: 'Suggests realistic budgets based on your actual spending averages.' },
  { icon: '📊', label: 'Benchmarking',             desc: 'Compares your spending vs typical Bangladesh household averages.' },
  { icon: '🏦', label: 'Debt Payoff Strategy',     desc: 'Snowball vs Avalanche analysis directly from your lent & debt records.' },
]

const STEPS = [
  { num: '01', title: 'Create your account', desc: 'Sign up with email or Google. Your categories, budgets, and defaults are created automatically.' },
  { num: '02', title: 'Log your first transaction', desc: 'Enter an amount, pick a category — or let AI suggest one from your description. Done in 5 seconds.' },
  { num: '03', title: 'Let AI do the heavy lifting', desc: 'Add your free Groq key in Settings and get anomaly alerts, spending digests, and a chat assistant.' },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const enterDemo = useDemoStore((s) => s.enterDemo)
  const isDemo = useDemoStore((s) => s.isDemo)
  const { session, profile } = useAuthStore()
  const navigate  = useNavigate()

  // A real signed-in session OR an active demo session both mean "this
  // visitor already has an app to go back to" — the signup/sign-in CTAs
  // stop making sense and should point at the dashboard instead.
  const isLoggedIn = !!session || isDemo

  function handleDemo() {
    enterDemo()
    navigate({ to: '/dashboard' })
  }

  return (
    <motion.div className="lp" variants={fadeUp} initial="initial" animate="animate">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <Logo size={32} withWordmark />
        </div>
        <div className="lp-nav-right">
          <a
            href="https://github.com/isttiiak/FinTrack"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-nav-link lp-gh-link"
          >
            ⭐ GitHub
          </a>
          {isLoggedIn ? (
            <Link to="/dashboard" className="lp-nav-account">
              <span className="lp-nav-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name ?? 'Account'} />
                ) : (
                  <span>{(isDemo ? 'D' : profile?.full_name?.[0] ?? '?').toUpperCase()}</span>
                )}
              </span>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login"  className="lp-nav-link">Sign in</Link>
              <Link to="/signup" className="lp-cta-sm">Get started free</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />

        <motion.div className="lp-hero-inner" variants={staggerContainer} initial="initial" animate="animate">

          <motion.div className="lp-badge" variants={staggerItem}>
            <Sparkles size={13} /> AI-powered · Open source · Free forever for self-hosted use
          </motion.div>

          <motion.h1 className="lp-headline" variants={staggerItem}>
            Personal finance,<br />
            <span className="lp-headline-accent">finally under control.</span>
          </motion.h1>

          <motion.p className="lp-sub" variants={staggerItem}>
            Track expenses, lent money, investments, and debts — all in a beautiful dark UI.
            Powered by AI. Your data lives in your own Supabase project.
          </motion.p>

          <motion.div className="lp-cta-row" variants={staggerItem}>
            {isLoggedIn ? (
              <Link to="/dashboard" className="lp-cta-primary">
                Go to Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/signup" className="lp-cta-primary">
                  Create free account <ArrowRight size={16} />
                </Link>
                <button className="lp-cta-secondary" onClick={handleDemo}>
                  <Sparkles size={15} /> Try demo
                </button>
              </>
            )}
          </motion.div>

          <motion.p className="lp-cta-note" variants={staggerItem}>
            {isLoggedIn ? "You're already signed in — pick up where you left off." : 'No credit card. No setup for the hosted version.'}
          </motion.p>

          {/* Stats strip */}
          <motion.div className="lp-stats" variants={staggerItem}>
            {[
              { val: '10+', label: 'AI features' },
              { val: '100%', label: 'Free & open source' },
              { val: '<10min', label: 'Self-host setup' },
              { val: 'BDT-first', label: 'Built for Bangladesh' },
            ].map((s) => (
              <div key={s.label} className="lp-stat">
                <span className="lp-stat-val">{s.val}</span>
                <span className="lp-stat-label">{s.label}</span>
              </div>
            ))}
          </motion.div>

        </motion.div>
      </section>

      {/* ── Core Features ── */}
      <section className="lp-section">
        <motion.div className="lp-section-inner" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-80px' }}>
          <motion.h2 className="lp-section-title" variants={fadeUp}>
            Everything you need to manage money
          </motion.h2>
          <motion.p className="lp-section-sub" variants={fadeUp}>
            Four modules, fully built and deployed. No "coming soon."
          </motion.p>

          <div className="lp-features-grid">
            {CORE_FEATURES.map(({ icon: Icon, color, label, desc }) => (
              <motion.div key={label} className="lp-feature-card" variants={staggerItem}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}>
                <div className="lp-feature-icon" style={{ background: `${color}18`, color }}>
                  <Icon size={20} />
                </div>
                <h3 className="lp-feature-title">{label}</h3>
                <p className="lp-feature-desc">{desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── AI Features highlight ── */}
      <section className="lp-ai-section">
        <div className="lp-ai-orb" />
        <motion.div className="lp-section-inner" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-80px' }}>

          <motion.div className="lp-ai-header" variants={fadeUp}>
            <div className="lp-ai-badge">
              <Brain size={14} /> Powered by Groq · Free
            </div>
            <h2 className="lp-section-title" style={{ marginBottom: 12 }}>
              Your AI finance analyst
            </h2>
            <p className="lp-section-sub" style={{ marginBottom: 0 }}>
              Add your free Groq API key (console.groq.com, no credit card) and unlock 10 AI features across the app.
            </p>
          </motion.div>

          <div className="lp-ai-grid">
            {AI_FEATURES.map(({ icon, label, desc }) => (
              <motion.div key={label} className="lp-ai-card" variants={staggerItem}>
                <span className="lp-ai-icon">{icon}</span>
                <div>
                  <div className="lp-ai-title">{label}</div>
                  <div className="lp-ai-desc">{desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginTop: 32 }}>
            <span className="lp-ai-cta-note">
              <MessageSquare size={13} /> All AI runs directly from your browser to Groq — no server, no data shared with us.
            </span>
          </motion.div>

        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section">
        <motion.div className="lp-section-inner" variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-80px' }}>
          <motion.h2 className="lp-section-title" variants={fadeUp}>Get started in 3 steps</motion.h2>

          <div className="lp-steps">
            {STEPS.map((s) => (
              <motion.div key={s.num} className="lp-step" variants={staggerItem}>
                <div className="lp-step-num">{s.num}</div>
                <div>
                  <div className="lp-step-title">{s.title}</div>
                  <div className="lp-step-desc">{s.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-section lp-final-section">
        <motion.div className="lp-final-card-outer" variants={fadeUp} initial="initial" whileInView="animate" viewport={{ once: true }}>
          <div className="lp-final-card">
            <div className="lp-final-orb" />
            <Target size={28} style={{ color: 'var(--accent-primary)', marginBottom: 16 }} />
            <h2 className="lp-final-title">
              {isLoggedIn ? 'Welcome back!' : 'Ready to take control of your finances?'}
            </h2>
            <p className="lp-final-sub">
              {isLoggedIn
                ? "You're all set — jump back into your dashboard."
                : 'Free to use. Free to self-host. Free AI with your own Groq key. Your data stays in your own database.'}
            </p>
            <div className="lp-cta-row">
              {isLoggedIn ? (
                <Link to="/dashboard" className="lp-cta-primary">
                  Go to Dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="lp-cta-primary">
                    Create free account <ArrowRight size={16} />
                  </Link>
                  <button className="lp-cta-secondary" onClick={handleDemo}>
                    <Sparkles size={15} /> Try demo first
                  </button>
                </>
              )}
            </div>
            <div className="lp-final-links">
              <a href="https://github.com/isttiiak/FinTrack" target="_blank" rel="noopener noreferrer" className="lp-final-link">
                ⭐ View on GitHub <ChevronRight size={12} />
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <Logo size={22} />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>FinTrack</span>
          </div>
          <div className="lp-footer-links">
            <a href="https://github.com/isttiiak/FinTrack" target="_blank" rel="noopener noreferrer" className="lp-footer-link">
              ⭐ GitHub
            </a>
            {isLoggedIn ? (
              <Link to="/dashboard" className="lp-footer-link">Dashboard</Link>
            ) : (
              <>
                <Link to="/login"  className="lp-footer-link">Sign in</Link>
                <Link to="/signup" className="lp-footer-link">Sign up</Link>
              </>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>MIT License · Built with ❤ in Bangladesh</span>
        </div>
      </footer>

    </motion.div>
  )
}

