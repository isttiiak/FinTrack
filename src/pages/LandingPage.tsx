import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Shield, Download, BarChart3, Users, Receipt, Zap } from 'lucide-react'
import { useDemoStore } from '@/stores/demoStore'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'

const FEATURES = [
  { icon: Receipt,  label: 'Expense Tracking',  desc: 'Log daily expenses by category, payment method, and account in seconds.' },
  { icon: Users,    label: 'Lent & Debt',        desc: 'Full timeline per person. Track partial payments, settlements, and doc links.' },
  { icon: BarChart3, label: 'Analytics',          desc: 'Monthly trends, category donut, no-spend calendar, and budget vs actual.' },
  { icon: Download, label: 'Full Data Export',   desc: 'Export everything as Excel or CSV. Your data belongs to you, always.' },
  { icon: Shield,   label: 'Row-Level Security', desc: 'Powered by Supabase. Every row is locked to your account via RLS.' },
  { icon: Zap,      label: 'Self-Hostable',      desc: 'Fork, add your Supabase keys, deploy to Vercel. Under 10 minutes.' },
]

export default function LandingPage() {
  const enterDemo = useDemoStore((s) => s.enterDemo)

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-logo">৳</div>
          <span>FinTrack</span>
        </div>
        <div className="landing-nav-links">
          <Link to="/login"  className="landing-nav-link">Sign in</Link>
          <Link to="/signup" className="btn-primary landing-cta-sm">Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        {/* Background orbs */}
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />

        <motion.div
          className="landing-hero-inner"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div className="landing-badge" variants={staggerItem}>
            <Sparkles size={13} /> Open source · Self-hostable · BDT-first
          </motion.div>

          <motion.h1 className="landing-headline" variants={staggerItem}>
            Personal finance,<br />
            <span className="grad-purple-text">finally under control.</span>
          </motion.h1>

          <motion.p className="landing-subheadline" variants={staggerItem}>
            Track expenses, lent money and debts, analyze your spending habits —
            all in a beautiful dark UI. Your data, your Supabase instance.
          </motion.p>

          <motion.div className="landing-cta-row" variants={staggerItem}>
            <Link to="/signup" className="btn-primary landing-cta-btn">
              Create free account <ArrowRight size={16} />
            </Link>
            <button className="landing-demo-btn" onClick={enterDemo}>
              <Sparkles size={15} /> Try demo
            </button>
          </motion.div>

          <motion.p className="landing-cta-note" variants={staggerItem}>
            No credit card. Free forever for self-hosted use.
          </motion.p>
        </motion.div>
      </section>

      {/* Features */}
      <section className="landing-features-section">
        <motion.div
          className="landing-section-inner"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-60px' }}
        >
          <motion.h2 className="landing-section-title" variants={fadeUp}>
            Everything you need to track your finances
          </motion.h2>
          <motion.p className="landing-section-sub" variants={fadeUp}>
            Phase 1 ships with expenses, lent/debt, and analytics. Investments coming in Phase 2.
          </motion.p>

          <div className="landing-features-grid">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <motion.div key={label} className="landing-feature-card" variants={staggerItem} whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}>
                <div className="landing-feature-icon">
                  <Icon size={20} />
                </div>
                <h3 className="landing-feature-title">{label}</h3>
                <p className="landing-feature-desc">{desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="landing-final-cta">
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="landing-final-inner"
        >
          <h2 className="landing-final-title">Ready to take control?</h2>
          <p className="landing-final-sub">Sign up in 30 seconds. No setup required for the hosted version.</p>
          <div className="landing-cta-row">
            <Link to="/signup" className="btn-primary landing-cta-btn">
              Get started free <ArrowRight size={16} />
            </Link>
            <button className="landing-demo-btn" onClick={enterDemo}>
              <Sparkles size={15} /> Try demo first
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-brand">FinTrack</span>
          <span className="landing-footer-sep">·</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Open source on GitHub</span>
          <span className="landing-footer-sep">·</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Built with ❤ for personal use</span>
        </div>
      </footer>

      <style>{landingStyles}</style>
    </div>
  )
}

const landingStyles = `
.landing {
  min-height: 100vh;
  background: var(--bg-page);
  color: var(--text-primary);
}

/* Nav */
.landing-nav {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 32px;
  background: rgba(15,15,26,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(42,42,74,0.6);
}
@media (max-width: 480px) { .landing-nav { padding: 12px 16px; } }
.landing-nav-brand {
  display: flex; align-items: center; gap: 10px;
  font-size: 18px; font-weight: 700; color: var(--text-primary);
}
.landing-logo {
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, #6C63FF, #A855F7);
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 700; color: #fff;
  box-shadow: 0 4px 12px rgba(108,99,255,0.35);
}
.landing-nav-links { display: flex; align-items: center; gap: 16px; }
.landing-nav-link { font-size: 14px; color: var(--text-secondary); text-decoration: none; font-weight: 500; }
.landing-nav-link:hover { color: var(--text-primary); }
.landing-cta-sm { padding: 8px 18px; font-size: 13px; }

/* Hero */
.landing-hero {
  position: relative; overflow: hidden;
  padding: 96px 32px 80px;
  display: flex; justify-content: center;
}
@media (max-width: 640px) { .landing-hero { padding: 64px 16px 56px; } }

.landing-orb { position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none; }
.landing-orb-1 { width: 500px; height: 500px; background: rgba(108,99,255,0.1); top: -100px; left: -100px; }
.landing-orb-2 { width: 400px; height: 400px; background: rgba(168,85,247,0.08); bottom: -80px; right: -80px; }

.landing-hero-inner {
  position: relative; z-index: 1; max-width: 680px; width: 100%; text-align: center;
}

.landing-badge {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 14px;
  background: rgba(108,99,255,0.1);
  border: 1px solid rgba(108,99,255,0.25);
  border-radius: 20px;
  font-size: 12px; font-weight: 500; color: var(--accent-primary);
  margin-bottom: 24px;
}

.landing-headline {
  font-size: clamp(36px, 6vw, 60px);
  font-weight: 800; line-height: 1.15;
  color: var(--text-primary); margin: 0 0 20px;
  letter-spacing: -0.02em;
}

.landing-subheadline {
  font-size: clamp(16px, 2.5vw, 18px);
  color: var(--text-secondary); line-height: 1.6;
  max-width: 520px; margin: 0 auto 32px;
}

.landing-cta-row {
  display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;
}
.landing-cta-btn {
  display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
  padding: 13px 28px; font-size: 15px;
}
.landing-demo-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 24px;
  background: rgba(108,99,255,0.08);
  border: 1px solid rgba(108,99,255,0.3);
  border-radius: 10px;
  color: var(--accent-primary); font-size: 14px; font-weight: 500;
  cursor: pointer; transition: background 0.15s, border-color 0.15s;
}
.landing-demo-btn:hover { background: rgba(108,99,255,0.16); border-color: rgba(108,99,255,0.55); }
.landing-cta-note { font-size: 12px; color: var(--text-muted); margin: 16px 0 0; }

/* Features */
.landing-features-section { padding: 80px 32px; }
@media (max-width: 640px) { .landing-features-section { padding: 56px 16px; } }
.landing-section-inner { max-width: 1000px; margin: 0 auto; }
.landing-section-title { font-size: clamp(24px, 4vw, 36px); font-weight: 700; text-align: center; color: var(--text-primary); margin: 0 0 12px; }
.landing-section-sub { font-size: 14px; color: var(--text-secondary); text-align: center; margin: 0 0 48px; }

.landing-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.landing-feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px; padding: 24px;
  cursor: default;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.landing-feature-card:hover { border-color: rgba(108,99,255,0.3); box-shadow: 0 4px 20px rgba(108,99,255,0.1); }
.landing-feature-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: rgba(108,99,255,0.1); color: var(--accent-primary);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
}
.landing-feature-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px; }
.landing-feature-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.55; margin: 0; }

/* Final CTA */
.landing-final-cta { padding: 80px 32px; }
@media (max-width: 640px) { .landing-final-cta { padding: 56px 16px; } }
.landing-final-inner {
  max-width: 560px; margin: 0 auto; text-align: center;
  padding: 48px 40px;
  background: linear-gradient(135deg, rgba(108,99,255,0.08), rgba(168,85,247,0.05));
  border: 1px solid rgba(108,99,255,0.15);
  border-radius: 24px;
}
.landing-final-title { font-size: clamp(22px, 4vw, 32px); font-weight: 700; color: var(--text-primary); margin: 0 0 10px; }
.landing-final-sub { font-size: 14px; color: var(--text-secondary); margin: 0 0 28px; }

/* Footer */
.landing-footer { border-top: 1px solid var(--border); padding: 20px 32px; }
.landing-footer-inner { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
.landing-footer-brand { font-size: 14px; font-weight: 600; color: var(--text-secondary); }
.landing-footer-sep { color: var(--text-muted); }
`
