import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight, Sparkles, Shield, Download, BarChart3, Users,
  Receipt, TrendingUp, Brain, MessageSquare, Target, ChevronRight,
} from 'lucide-react'
import { useDemoStore } from '@/stores/demoStore'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'

// ── Feature data ──────────────────────────────────────────────────────────────
const CORE_FEATURES = [
  {
    icon: Receipt, color: '#6C63FF',
    label: 'Expense Tracking',
    desc: 'Log income and expenses by category. Smart payment method picker — Cash, MFS (bKash/Nagad), Card, Bank Transfer — auto-fills the account.',
  },
  {
    icon: Users, color: '#10B981',
    label: 'Lent & Debt Ledger',
    desc: 'Full timeline per person. Track payments, partial settlements, net position, and status — all in one place.',
  },
  {
    icon: TrendingUp, color: '#F59E0B',
    label: 'Investment Tracker',
    desc: 'Track committed capital, installment payments, and returns. ROI %, P&L, and portfolio summary computed live.',
  },
  {
    icon: BarChart3, color: '#06B6D4',
    label: 'Analytics',
    desc: 'Monthly trend, category donut, daily bars, budget vs actual, no-spend calendar, and 6 live KPI cards.',
  },
  {
    icon: Download, color: '#A855F7',
    label: 'Data Export & Import',
    desc: 'Export to Excel (multi-sheet) or CSV. Import expenses from any CSV with a live preview. Your data, always yours.',
  },
  {
    icon: Shield, color: '#EF4444',
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
  const navigate  = useNavigate()

  function handleDemo() {
    enterDemo()
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="lp">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <div className="lp-logo">৳</div>
          <span className="lp-brand-name">FinTrack</span>
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
          <Link to="/login"  className="lp-nav-link">Sign in</Link>
          <Link to="/signup" className="lp-cta-sm">Get started free</Link>
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
            <Link to="/signup" className="lp-cta-primary">
              Create free account <ArrowRight size={16} />
            </Link>
            <button className="lp-cta-secondary" onClick={handleDemo}>
              <Sparkles size={15} /> Try demo
            </button>
          </motion.div>

          <motion.p className="lp-cta-note" variants={staggerItem}>
            No credit card. No setup for the hosted version.
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
              <Brain size={14} /> Powered by Groq · llama-3.1-8b-instant · Free
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
        <motion.div className="lp-final-card" variants={fadeUp} initial="initial" whileInView="animate" viewport={{ once: true }}>
          <div className="lp-final-orb" />
          <Target size={28} style={{ color: 'var(--accent-primary)', marginBottom: 16 }} />
          <h2 className="lp-final-title">Ready to take control of your finances?</h2>
          <p className="lp-final-sub">
            Free to use. Free to self-host. Free AI with your own Groq key.
            Your data stays in your own database.
          </p>
          <div className="lp-cta-row">
            <Link to="/signup" className="lp-cta-primary">
              Create free account <ArrowRight size={16} />
            </Link>
            <button className="lp-cta-secondary" onClick={handleDemo}>
              <Sparkles size={15} /> Try demo first
            </button>
          </div>
          <div className="lp-final-links">
            <a href="https://github.com/isttiiak/FinTrack" target="_blank" rel="noopener noreferrer" className="lp-final-link">
              ⭐ View on GitHub <ChevronRight size={12} />
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-logo" style={{ width: 26, height: 26, fontSize: 13, borderRadius: 7 }}>৳</div>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>FinTrack</span>
          </div>
          <div className="lp-footer-links">
            <a href="https://github.com/isttiiak/FinTrack" target="_blank" rel="noopener noreferrer" className="lp-footer-link">
              ⭐ GitHub
            </a>
            <Link to="/login"  className="lp-footer-link">Sign in</Link>
            <Link to="/signup" className="lp-footer-link">Sign up</Link>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>MIT License · Built with ❤ in Bangladesh</span>
        </div>
      </footer>

      <style>{STYLES}</style>
    </div>
  )
}

const STYLES = `
  .lp { min-height: 100vh; background: var(--bg-page); color: var(--text-primary); }

  /* ── Nav ── */
  .lp-nav {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 40px;
    background: rgba(15,15,26,0.88); backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(42,42,74,0.6);
  }
  @media (max-width: 600px) { .lp-nav { padding: 12px 16px; } }
  .lp-nav-brand { display: flex; align-items: center; gap: 10px; }
  .lp-brand-name { font-size: 17px; font-weight: 700; color: var(--text-primary); }
  .lp-logo {
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, #6C63FF, #A855F7);
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; font-weight: 700; color: #fff;
    box-shadow: 0 4px 12px rgba(108,99,255,0.35);
  }
  .lp-nav-right { display: flex; align-items: center; gap: 14px; }
  .lp-nav-link {
    font-size: 13px; color: var(--text-secondary); text-decoration: none;
    font-weight: 500; display: flex; align-items: center; gap: 5px;
    transition: color 0.12s;
  }
  .lp-nav-link:hover { color: var(--text-primary); }
  .lp-gh-link { padding: 5px 10px; border-radius: 7px; border: 1px solid var(--border); }
  .lp-gh-link:hover { background: var(--bg-elevated); }
  .lp-cta-sm {
    padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
    background: linear-gradient(135deg, #6C63FF, #A855F7); color: #fff;
    text-decoration: none; border: none; cursor: pointer;
  }

  /* ── Hero ── */
  .lp-hero {
    position: relative; overflow: hidden;
    padding: 100px 32px 84px;
    display: flex; justify-content: center;
  }
  @media (max-width: 640px) { .lp-hero { padding: 64px 16px 56px; } }
  .lp-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
  .lp-orb-1 { width: 600px; height: 600px; background: rgba(108,99,255,0.09); top: -160px; left: -160px; }
  .lp-orb-2 { width: 400px; height: 400px; background: rgba(168,85,247,0.07); bottom: -100px; right: -100px; }
  .lp-orb-3 { width: 300px; height: 300px; background: rgba(16,185,129,0.05); top: 50%; left: 50%; transform: translate(-50%,-50%); }

  .lp-hero-inner { position: relative; z-index: 1; max-width: 700px; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; }

  .lp-badge {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 5px 14px; margin-bottom: 24px;
    background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.25);
    border-radius: 20px; font-size: 12px; font-weight: 500; color: var(--accent-primary);
  }

  .lp-headline {
    font-size: clamp(36px, 6vw, 62px); font-weight: 800; line-height: 1.13;
    color: var(--text-primary); margin: 0 0 20px; letter-spacing: -0.025em;
  }
  .lp-headline-accent {
    background: linear-gradient(135deg, #6C63FF, #A855F7);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .lp-sub {
    font-size: clamp(15px, 2.2vw, 18px); color: var(--text-secondary);
    line-height: 1.65; max-width: 540px; margin: 0 auto 32px;
  }

  .lp-cta-row { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
  .lp-cta-primary {
    display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
    padding: 13px 26px; font-size: 15px; font-weight: 600; border-radius: 11px;
    background: linear-gradient(135deg, #6C63FF, #A855F7); color: #fff; border: none; cursor: pointer;
    box-shadow: 0 8px 24px rgba(108,99,255,0.35); transition: opacity 0.15s, transform 0.15s;
  }
  .lp-cta-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .lp-cta-secondary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 22px; background: rgba(108,99,255,0.08);
    border: 1px solid rgba(108,99,255,0.3); border-radius: 11px;
    color: var(--accent-primary); font-size: 14px; font-weight: 500;
    cursor: pointer; transition: background 0.15s, border-color 0.15s;
  }
  .lp-cta-secondary:hover { background: rgba(108,99,255,0.16); border-color: rgba(108,99,255,0.55); }
  .lp-cta-note { font-size: 12px; color: var(--text-muted); margin: 14px 0 0; }

  /* Stats */
  .lp-stats {
    display: flex; gap: 0; margin-top: 44px; flex-wrap: wrap; justify-content: center;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
    overflow: hidden;
  }
  .lp-stat {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 16px 28px; border-right: 1px solid var(--border);
    flex: 1; min-width: 100px;
  }
  .lp-stat:last-child { border-right: none; }
  .lp-stat-val { font-size: 18px; font-weight: 800; color: var(--accent-primary); }
  .lp-stat-label { font-size: 11px; color: var(--text-muted); font-weight: 500; white-space: nowrap; }

  /* ── Sections ── */
  .lp-section { padding: 80px 32px; }
  @media (max-width: 640px) { .lp-section { padding: 56px 16px; } }
  .lp-section-inner { max-width: 1040px; margin: 0 auto; }
  .lp-section-title { font-size: clamp(24px, 3.5vw, 36px); font-weight: 700; text-align: center; color: var(--text-primary); margin: 0 0 12px; }
  .lp-section-sub { font-size: 15px; color: var(--text-secondary); text-align: center; margin: 0 0 48px; }

  /* Core features grid */
  .lp-features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
  .lp-feature-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 22px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .lp-feature-card:hover { border-color: rgba(108,99,255,0.3); box-shadow: 0 6px 24px rgba(0,0,0,0.2); }
  .lp-feature-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
  .lp-feature-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 7px; }
  .lp-feature-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.55; margin: 0; }

  /* ── AI section ── */
  .lp-ai-section {
    position: relative; overflow: hidden;
    padding: 80px 32px;
    background: linear-gradient(180deg, transparent, rgba(108,99,255,0.04), transparent);
    border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
  }
  @media (max-width: 640px) { .lp-ai-section { padding: 56px 16px; } }
  .lp-ai-orb { position: absolute; width: 500px; height: 500px; border-radius: 50%; filter: blur(120px); background: rgba(168,85,247,0.07); top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; }
  .lp-ai-header { text-align: center; margin-bottom: 40px; position: relative; z-index: 1; }
  .lp-ai-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px; border-radius: 20px; margin-bottom: 16px;
    background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
    font-size: 12px; font-weight: 500; color: var(--accent-teal);
  }

  .lp-ai-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px; position: relative; z-index: 1;
  }
  .lp-ai-card {
    display: flex; gap: 12px; align-items: flex-start;
    padding: 14px 16px; border-radius: 12px;
    background: var(--bg-card); border: 1px solid var(--border);
    transition: border-color 0.15s, background 0.15s;
  }
  .lp-ai-card:hover { border-color: rgba(168,85,247,0.3); background: rgba(168,85,247,0.03); }
  .lp-ai-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
  .lp-ai-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 3px; }
  .lp-ai-desc { font-size: 12px; color: var(--text-muted); line-height: 1.45; }
  .lp-ai-cta-note {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-muted); padding: 6px 14px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px;
  }

  /* ── How it works ── */
  .lp-steps { display: flex; flex-direction: column; gap: 0; max-width: 640px; margin: 0 auto; }
  .lp-step {
    display: flex; gap: 20px; align-items: flex-start; padding: 24px 0;
    border-bottom: 1px solid var(--border);
  }
  .lp-step:last-child { border-bottom: none; }
  .lp-step-num {
    font-size: 28px; font-weight: 800; color: transparent;
    background: linear-gradient(135deg,#6C63FF,#A855F7); -webkit-background-clip: text;
    background-clip: text; -webkit-text-fill-color: transparent;
    flex-shrink: 0; width: 48px; line-height: 1;
  }
  .lp-step-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 5px; }
  .lp-step-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.55; }

  /* ── Final CTA ── */
  .lp-final-section { background: none; }
  .lp-final-card {
    position: relative; overflow: hidden;
    max-width: 600px; margin: 0 auto; text-align: center;
    padding: 52px 40px;
    background: linear-gradient(135deg, rgba(108,99,255,0.08), rgba(168,85,247,0.05));
    border: 1px solid rgba(108,99,255,0.2); border-radius: 24px;
    display: flex; flex-direction: column; align-items: center; gap: 0;
  }
  @media (max-width: 480px) { .lp-final-card { padding: 36px 20px; } }
  .lp-final-orb { position: absolute; width: 300px; height: 300px; border-radius: 50%; filter: blur(80px); background: rgba(108,99,255,0.1); top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; }
  .lp-final-title { font-size: clamp(20px, 4vw, 28px); font-weight: 700; color: var(--text-primary); margin: 0 0 10px; position: relative; z-index: 1; }
  .lp-final-sub { font-size: 14px; color: var(--text-secondary); margin: 0 0 28px; line-height: 1.6; position: relative; z-index: 1; }
  .lp-final-links { margin-top: 20px; position: relative; z-index: 1; }
  .lp-final-link {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 13px; color: var(--text-muted); text-decoration: none;
    transition: color 0.12s;
  }
  .lp-final-link:hover { color: var(--accent-primary); }

  /* ── Footer ── */
  .lp-footer { border-top: 1px solid var(--border); padding: 22px 32px; }
  .lp-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; max-width: 1040px; margin: 0 auto; }
  .lp-footer-brand { display: flex; align-items: center; gap: 8px; }
  .lp-footer-links { display: flex; align-items: center; gap: 16px; }
  .lp-footer-link { display: flex; align-items: center; gap: 5px; font-size: 13px; color: var(--text-muted); text-decoration: none; font-weight: 500; transition: color 0.12s; }
  .lp-footer-link:hover { color: var(--text-primary); }

  /* Gradient text helper */
  .grad-purple-text {
    background: linear-gradient(135deg, #6C63FF, #A855F7);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
`
