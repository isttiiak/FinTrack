import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, AlertCircle, RefreshCw, Settings } from 'lucide-react'
import { groqChat, isGroqConfigured } from '@/lib/groq'
import { buildMonthlyContext, buildDebtContext, catBreakdown, monthlyAgg } from '@/lib/aiContext'
import { useExpenses } from '@/hooks/useExpenses'
import { useBudgets } from '@/hooks/useBudgets'
import { usePersons } from '@/hooks/useLedger'
import { formatCurrency, toISODateString } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatResult(text: string) {
  return text.split('\n').filter(Boolean).map((line, i) => {
    const clean = line.replace(/^[•\-\*]\s*/, '')
    const isBullet = /^[•\-\*]/.test(line) || /^\d+\./.test(line)
    const isHeader = /^#{1,3}\s/.test(line) || (line.endsWith(':') && line.length < 60 && !line.startsWith(' '))
    if (isHeader) return <p key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '10px 0 4px', fontSize: 13 }}>{clean.replace(/^#+\s*/, '')}</p>
    if (isBullet) return (
      <div key={i} style={{ display: 'flex', gap: 8, margin: '3px 0' }}>
        <span style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 1 }}>•</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{clean}</span>
      </div>
    )
    return <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0', lineHeight: 1.55 }}>{line}</p>
  })
}

// ── Individual feature card ───────────────────────────────────────────────────
interface FeatureCardProps {
  icon: string
  title: string
  desc: string
  onRun: () => Promise<string>
  children?: React.ReactNode  // optional extra inputs shown before result
  accent?: string
}
function FeatureCard({ icon, title, desc, onRun, children, accent = '#6C63FF' }: FeatureCardProps) {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function run() {
    setLoading(true); setError(null); setResult(null)
    try { setResult(await onRun()) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Unknown error') }
    finally { setLoading(false) }
  }

  return (
    <div className="aih-card">
      <div className="aih-card-header">
        <div className="aih-card-icon" style={{ background: `${accent}18`, color: accent }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="aih-card-title">{title}</div>
          <div className="aih-card-desc">{desc}</div>
        </div>
        <button className="aih-run-btn" onClick={run} disabled={loading}
          style={{ borderColor: `${accent}44`, color: accent }}>
          {loading ? <span className="aih-spinner" /> : <><RefreshCw size={12} /> Run</>}
        </button>
      </div>

      {children}

      <AnimatePresence>
        {error && (
          <motion.div className="aih-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AlertCircle size={13} /> {error}
          </motion.div>
        )}
        {result && !loading && (
          <motion.div className="aih-result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {formatResult(result)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Chat message type ─────────────────────────────────────────────────────────
interface Msg { role: 'user' | 'ai'; text: string }

// ── Main hub ──────────────────────────────────────────────────────────────────
export default function AIHub({ selectedMonth }: { selectedMonth: string }) {
  const configured = isGroqConfigured()

  // Data
  const twelveAgo = (() => { const d = new Date(); d.setMonth(d.getMonth() - 11); d.setDate(1); return toISODateString(d) })()
  const { data: allTxns   = [] } = useExpenses({ from: twelveAgo, to: toISODateString(new Date()) })
  const { data: thisTxns  = [] } = useExpenses({ from: `${selectedMonth}-01`, to: (() => { const [y,m] = selectedMonth.split('-'); return toISODateString(new Date(Number(y), Number(m), 0)) })() })
  const { data: budgets   = [] } = useBudgets()
  const { data: persons   = [] } = usePersons()

  const ctx = buildMonthlyContext(thisTxns, allTxns, budgets, selectedMonth)

  // Chat state
  const [msgs, setMsgs]   = useState<Msg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  // Goal planner
  const [goalAmount, setGoalAmount]  = useState('')
  const [goalMonths, setGoalMonths]  = useState('6')
  const [goalResult, setGoalResult]  = useState<string | null>(null)
  const [goalLoading, setGoalLoading]= useState(false)
  const [goalError, setGoalError]    = useState<string | null>(null)

  if (!configured) {
    return (
      <motion.div className="aih-setup" variants={fadeUp} initial="initial" animate="animate">
        <div className="aih-setup-icon">✨</div>
        <h3 className="aih-setup-title">Set up AI Insights</h3>
        <p className="aih-setup-desc">
          Get smart spending analysis powered by Groq (free, no credit card needed).
          <br />Add your free API key in <strong>Settings → AI Insights</strong>.
        </p>
        <a href="/settings" className="aih-setup-link">
          <Settings size={14} /> Go to Settings
        </a>
      </motion.div>
    )
  }

  // ── Feature prompt builders ─────────────────────────────────────────────────

  async function runAnomalyDetection() {
    const monthly = monthlyAgg(allTxns)
    const months  = Object.keys(monthly).sort()
    const prevMonths = months.slice(-4, -1)
    const avgMap: Record<string, number> = {}
    for (const m of prevMonths) {
      const cats = catBreakdown(allTxns.filter((t) => t.txn_date.startsWith(m)))
      for (const [k, v] of Object.entries(cats)) avgMap[k] = (avgMap[k] ?? 0) + v / prevMonths.length
    }
    const currentCats = catBreakdown(thisTxns)
    const anomalyLines = Object.entries(currentCats)
      .map(([cat, val]) => {
        const avg = avgMap[cat] ?? 0
        const pct = avg > 0 ? Math.round(((val - avg) / avg) * 100) : 0
        return `  ${cat}: ${formatCurrency(val)} (avg: ${formatCurrency(Math.round(avg))}, ${pct >= 0 ? '+' : ''}${pct}%)`
      })
      .join('\n')
    return groqChat(
      'You are a financial anomaly detector. Identify unusual spending spikes (>40% above average). Be concise and specific. Use bullet points. Flag top 3 anomalies only.',
      `Category spending vs 3-month average:\n${anomalyLines}\n\nFull context:\n${ctx}`,
      { maxTokens: 350 },
    )
  }

  async function runWeeklyDigest() {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekTxns = allTxns.filter((t) => t.txn_date >= toISODateString(weekAgo))
    const weekMap  = catBreakdown(weekTxns)
    const weekTotal = Object.values(weekMap).reduce((s, v) => s + v, 0)
    const top = Object.entries(weekMap).sort(([,a],[,b]) => b-a).slice(0,5)
      .map(([k,v]) => `  ${k}: ${formatCurrency(v)}`).join('\n')
    return groqChat(
      'Generate a brief, friendly weekly spending digest. Include 2-3 highlights, 1 concern, and 1 motivational tip. Use emojis. Keep under 180 words. Use bullet points.',
      `Week summary:\nTotal spent: ${formatCurrency(weekTotal)}\nTransaction count: ${weekTxns.length}\nTop categories:\n${top}\n\nMonth context:\n${ctx}`,
      { maxTokens: 350 },
    )
  }

  async function runBudgetAnalysis() {
    if (budgets.length === 0) return 'No budget limits set. Add budgets in Settings → Budget Limits to use this feature.'
    const catMap = catBreakdown(thisTxns)
    const lines  = budgets.filter((b) => b.category).map((b) => {
      const spent = catMap[b.category!.name] ?? 0
      const pct   = Math.round((spent / b.monthly_limit) * 100)
      const status = pct > 100 ? '🔴 OVER' : pct > 80 ? '🟡 NEAR' : '🟢 OK'
      return `  ${b.category!.name}: budget ${formatCurrency(b.monthly_limit)}, spent ${formatCurrency(spent)} (${pct}%) ${status}`
    }).join('\n')
    return groqChat(
      'Analyze budget vs actual spending. Explain WHY over-budget categories are high, suggest specific actions to bring them in line. Be concise and use bullet points.',
      `Budget performance for ${selectedMonth}:\n${lines}\n\nContext:\n${ctx}`,
      { maxTokens: 400 },
    )
  }

  async function runSpendingPatterns() {
    const catMap = catBreakdown(allTxns)
    const monthly = monthlyAgg(allTxns)
    const months  = Object.keys(monthly).sort()
    const trendLines = months.slice(-6).map((m) =>
      `  ${m}: ${formatCurrency(monthly[m].expense)}`
    ).join('\n')
    const topAll = Object.entries(catMap).sort(([,a],[,b]) => b-a).slice(0,8)
      .map(([k,v]) => `  ${k}: ${formatCurrency(v)} total`).join('\n')
    return groqChat(
      'Identify recurring spending patterns and habits. Look for expensive habits, daily/weekly patterns, and optimization opportunities. Suggest 3-5 concrete ways to save money. Use bullet points.',
      `6-month spending trend:\n${trendLines}\n\nCumulative top categories:\n${topAll}\n\nCurrent month:\n${ctx}`,
      { maxTokens: 450 },
    )
  }

  async function runBudgetRecommendations() {
    const monthly = monthlyAgg(allTxns)
    const months  = Object.keys(monthly).sort().slice(-3)
    const catAvgs: Record<string, number[]> = {}
    for (const m of months) {
      const cats = catBreakdown(allTxns.filter((t) => t.txn_date.startsWith(m)))
      for (const [k, v] of Object.entries(cats)) {
        if (!catAvgs[k]) catAvgs[k] = []
        catAvgs[k].push(v)
      }
    }
    const avgLines = Object.entries(catAvgs).sort(([,a],[,b]) =>
      (b.reduce((s,v)=>s+v,0)/b.length) - (a.reduce((s,v)=>s+v,0)/a.length)
    ).slice(0,8).map(([k,vs]) => {
      const avg = Math.round(vs.reduce((s,v)=>s+v,0)/vs.length)
      return `  ${k}: avg ${formatCurrency(avg)}/month`
    }).join('\n')
    return groqChat(
      'Based on the user\'s actual spending patterns, suggest realistic monthly budget targets for each category. Aim for 10-20% reductions where possible. Show the recommended budget amount and expected savings. Use a clean format.',
      `3-month average spending:\n${avgLines}\n\nContext:\n${ctx}`,
      { maxTokens: 450 },
    )
  }

  async function runGoalPlan() {
    const amount = Number(goalAmount)
    const months = Number(goalMonths)
    if (!amount || !months) { setGoalError('Enter a savings goal amount and timeframe first.'); return '' }
    const totalIncome  = thisTxns.filter((t) => t.type === 'Income').reduce((s,t)=>s+t.amount, 0)
    const totalExpense = thisTxns.filter((t) => t.type === 'Expense').reduce((s,t)=>s+t.amount, 0)
    const neededPerMonth = Math.ceil(amount / months)
    const catMap = catBreakdown(thisTxns)
    const spendingList = Object.entries(catMap).sort(([,a],[,b])=>b-a).slice(0,8)
      .map(([k,v]) => `  ${k}: ${formatCurrency(v)}`).join('\n')
    return groqChat(
      'Create a specific, achievable monthly savings plan to meet the user\'s financial goal. Show exactly which categories to cut and by how much. Be realistic and encouraging. Use bullet points and show before/after amounts.',
      `Goal: Save ${formatCurrency(amount)} in ${months} months (${formatCurrency(neededPerMonth)}/month needed)\nCurrent income: ${formatCurrency(totalIncome)}/month\nCurrent spending: ${formatCurrency(totalExpense)}/month\nCurrent savings: ${formatCurrency(totalIncome - totalExpense)}/month\n\nSpending breakdown:\n${spendingList}`,
      { maxTokens: 500 },
    )
  }

  async function runBenchmarking() {
    const catMap = catBreakdown(thisTxns)
    const spendingList = Object.entries(catMap).sort(([,a],[,b])=>b-a).slice(0,8)
      .map(([k,v]) => `  ${k}: ${formatCurrency(v)}`).join('\n')
    return groqChat(
      'Compare the user\'s spending to typical Bangladesh middle-class household benchmarks. Note where they are above/below average. Be encouraging for good areas and specific about areas needing attention. Use a simple table or bullet format.',
      `User monthly spending:\n${spendingList}\n\nTotal: ${formatCurrency(Object.values(catMap).reduce((s,v)=>s+v,0))}\n\nContext:\n${ctx}`,
      { maxTokens: 450 },
    )
  }

  async function runDebtStrategy() {
    const debtCtx = buildDebtContext(persons)
    if (debtCtx.includes('No outstanding')) return 'No outstanding debts or lent amounts found in your Lent & Debt records.'
    return groqChat(
      'Analyze the debts/loans and recommend optimal payoff strategies. Compare Snowball vs Avalanche approaches. Estimate time to payoff. Be specific with monthly payment recommendations. Use bullet points.',
      `Outstanding debts and lent amounts:\n${debtCtx}\n\nFinancial context:\n${ctx}`,
      { maxTokens: 500 },
    )
  }

  // ── Chat ────────────────────────────────────────────────────────────────────
  async function sendChat() {
    const q = chatInput.trim()
    if (!q || chatLoading) return
    setChatInput('')
    setMsgs((prev) => [...prev, { role: 'user', text: q }])
    setChatLoading(true)
    try {
      const answer = await groqChat(
        `You are a personal finance assistant. Answer questions based ONLY on the user's actual financial data provided. Be concise and specific. If data is insufficient, say so.`,
        `User question: ${q}\n\nFinancial data:\n${ctx}`,
        { maxTokens: 400 },
      )
      setMsgs((prev) => [...prev, { role: 'ai', text: answer }])
    } catch (e: unknown) {
      setMsgs((prev) => [...prev, { role: 'ai', text: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` }])
    } finally {
      setChatLoading(false)
    }
  }

  // ── Goal planner runner ─────────────────────────────────────────────────────
  async function handleRunGoal() {
    setGoalLoading(true); setGoalError(null); setGoalResult(null)
    try {
      const result = await runGoalPlan()
      if (result) setGoalResult(result)
    } catch (e: unknown) {
      setGoalError(e instanceof Error ? e.message : 'Error')
    } finally {
      setGoalLoading(false)
    }
  }

  return (
    <motion.div className="aih-root" variants={fadeUp} initial="initial" animate="animate">

      {/* Header */}
      <div className="aih-header">
        <div className="aih-header-left">
          <Sparkles size={16} style={{ color: '#A855F7' }} />
          <span className="aih-header-title">AI Insights</span>
          <span className="aih-provider-badge">Groq · llama-3.1-8b-instant</span>
        </div>
        <span className="aih-header-sub">Powered by Groq free tier · Click any feature to analyze</span>
      </div>

      {/* Feature grid */}
      <div className="aih-grid">
        <FeatureCard icon="🚨" title="Anomaly Detection" accent="#EF4444"
          desc="Flags categories with unusual spending spikes vs your 3-month average."
          onRun={runAnomalyDetection} />

        <FeatureCard icon="📋" title="Weekly Digest" accent="#10B981"
          desc="A friendly summary of your last 7 days — highlights, concerns, and a tip."
          onRun={runWeeklyDigest} />

        <FeatureCard icon="⚖️" title="Budget vs Actual Analysis" accent="#F59E0B"
          desc="Explains WHY you're over or under budget and what to do about it."
          onRun={runBudgetAnalysis} />

        <FeatureCard icon="🔄" title="Spending Patterns" accent="#06B6D4"
          desc="Identifies recurring habits and expensive patterns in your 6-month history."
          onRun={runSpendingPatterns} />

        <FeatureCard icon="💡" title="Budget Recommendations" accent="#6C63FF"
          desc="Suggests realistic budget targets based on your actual spending averages."
          onRun={runBudgetRecommendations} />

        <FeatureCard icon="📊" title="Benchmarking" accent="#A855F7"
          desc="Compares your spending to typical Bangladesh household benchmarks."
          onRun={runBenchmarking} />

        <FeatureCard icon="🏦" title="Debt Payoff Strategy" accent="#F97316"
          desc="Analyzes your lent/debt entries and recommends Snowball vs Avalanche strategy."
          onRun={runDebtStrategy} />
      </div>

      {/* Goal Planner — needs user input */}
      <div className="aih-card">
        <div className="aih-card-header">
          <div className="aih-card-icon" style={{ background: '#10B98118', color: '#10B981' }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div className="aih-card-title">Goal-Based Spending Plan</div>
            <div className="aih-card-desc">Enter a savings goal and get a personalized month-by-month spending plan.</div>
          </div>
        </div>
        <div className="aih-goal-inputs">
          <div className="aih-goal-field">
            <label className="aih-goal-label">Save amount (৳)</label>
            <input className="aih-input" type="number" placeholder="e.g. 50000"
              value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} />
          </div>
          <div className="aih-goal-field">
            <label className="aih-goal-label">In how many months?</label>
            <input className="aih-input" type="number" placeholder="e.g. 6"
              value={goalMonths} onChange={(e) => setGoalMonths(e.target.value)} min="1" max="60" />
          </div>
          <button className="aih-run-btn" style={{ alignSelf: 'flex-end', borderColor: '#10B98144', color: '#10B981' }}
            onClick={handleRunGoal} disabled={goalLoading || !goalAmount}>
            {goalLoading ? <span className="aih-spinner" /> : <><RefreshCw size={12} /> Plan</>}
          </button>
        </div>
        <AnimatePresence>
          {goalError && <motion.div className="aih-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><AlertCircle size={13} /> {goalError}</motion.div>}
          {goalResult && <motion.div className="aih-result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{formatResult(goalResult)}</motion.div>}
        </AnimatePresence>
      </div>

      {/* Natural Language Chat */}
      <div className="aih-chat-card">
        <div className="aih-chat-header">
          <span className="aih-card-icon" style={{ background: '#6C63FF18', color: '#6C63FF' }}>💬</span>
          <div>
            <div className="aih-card-title">Ask Anything</div>
            <div className="aih-card-desc">Ask questions about your spending in plain language.</div>
          </div>
        </div>

        {msgs.length > 0 && (
          <div className="aih-messages">
            {msgs.map((m, i) => (
              <div key={i} className={`aih-msg ${m.role === 'user' ? 'aih-msg-user' : 'aih-msg-ai'}`}>
                {m.role === 'ai' ? formatResult(m.text) : m.text}
              </div>
            ))}
            {chatLoading && (
              <div className="aih-msg aih-msg-ai" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="aih-spinner" style={{ borderTopColor: '#6C63FF', borderColor: 'rgba(108,99,255,0.2)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thinking…</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {msgs.length === 0 && (
          <div className="aih-chat-hints">
            {[
              'How much did I spend on food this month?',
              'Which category am I overspending on?',
              'Compare this month vs last month',
              'What\'s my biggest expense?',
            ].map((hint) => (
              <button key={hint} className="aih-hint-chip"
                onClick={() => { setChatInput(hint); }}>
                {hint}
              </button>
            ))}
          </div>
        )}

        <div className="aih-chat-input-row">
          <input
            className="aih-chat-input"
            placeholder="Ask about your spending…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
            disabled={chatLoading}
          />
          <button className="aih-chat-send" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
            <Send size={15} />
          </button>
        </div>
      </div>

      <style>{STYLES}</style>
    </motion.div>
  )
}

const STYLES = `
  .aih-root { display: flex; flex-direction: column; gap: 14px; }

  /* Setup state */
  .aih-setup { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 24px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; gap: 10px; }
  .aih-setup-icon { font-size: 40px; }
  .aih-setup-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
  .aih-setup-desc { font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.6; }
  .aih-setup-link { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; background: linear-gradient(135deg,#6C63FF,#A855F7); color: #fff; text-decoration: none; margin-top: 4px; }

  /* Header */
  .aih-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .aih-header-left { display: flex; align-items: center; gap: 8px; }
  .aih-header-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
  .aih-provider-badge { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; background: rgba(16,185,129,0.12); color: var(--accent-teal); }
  .aih-header-sub { font-size: 12px; color: var(--text-muted); }

  /* Feature grid */
  .aih-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 640px) { .aih-grid { grid-template-columns: 1fr; } }

  /* Feature card */
  .aih-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
    padding: 16px; display: flex; flex-direction: column; gap: 10px;
    transition: border-color 0.15s;
  }
  .aih-card:hover { border-color: rgba(108,99,255,0.2); }
  .aih-card-header { display: flex; align-items: flex-start; gap: 10px; }
  .aih-card-icon { width: 36px; height: 36px; border-radius: 10px; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .aih-card-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
  .aih-card-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
  .aih-run-btn {
    display: flex; align-items: center; gap: 5px; flex-shrink: 0;
    padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;
    background: none; border: 1px solid; transition: background 0.12s; white-space: nowrap;
    align-self: flex-start;
  }
  .aih-run-btn:hover { background: rgba(108,99,255,0.06); }
  .aih-run-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .aih-error { display: flex; align-items: flex-start; gap: 7px; padding: 10px 12px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; font-size: 12px; color: var(--accent-red); }
  .aih-result { padding: 10px 0 0; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 2px; }

  /* Goal planner */
  .aih-goal-inputs { display: flex; gap: 10px; flex-wrap: wrap; }
  .aih-goal-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 120px; }
  .aih-goal-label { font-size: 11px; font-weight: 500; color: var(--text-muted); }
  .aih-input {
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text-primary); font-size: 14px; padding: 8px 12px;
    transition: border-color 0.15s;
  }
  .aih-input:focus { outline: none; border-color: var(--border-focus); }
  .aih-input::placeholder { color: var(--text-muted); }

  /* Chat */
  .aih-chat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .aih-chat-header { display: flex; align-items: flex-start; gap: 10px; }
  .aih-messages { display: flex; flex-direction: column; gap: 8px; max-height: 360px; overflow-y: auto; padding: 4px 0; }
  .aih-msg { padding: 10px 12px; border-radius: 10px; font-size: 13px; line-height: 1.5; }
  .aih-msg-user { background: rgba(108,99,255,0.1); color: var(--text-primary); font-weight: 500; align-self: flex-end; max-width: 85%; border-radius: 10px 10px 2px 10px; }
  .aih-msg-ai { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 2px; }

  .aih-chat-hints { display: flex; flex-wrap: wrap; gap: 6px; }
  .aih-hint-chip { padding: 5px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-secondary); transition: all 0.12s; text-align: left; }
  .aih-hint-chip:hover { background: rgba(108,99,255,0.08); border-color: rgba(108,99,255,0.3); color: var(--accent-primary); }

  .aih-chat-input-row { display: flex; gap: 8px; }
  .aih-chat-input {
    flex: 1; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px;
    color: var(--text-primary); font-size: 14px; padding: 10px 14px;
    transition: border-color 0.15s;
  }
  .aih-chat-input:focus { outline: none; border-color: var(--border-focus); }
  .aih-chat-input::placeholder { color: var(--text-muted); }
  .aih-chat-input:disabled { opacity: 0.6; }
  .aih-chat-send {
    width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg,#6C63FF,#A855F7); border: none; color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: opacity 0.15s;
  }
  .aih-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
  .aih-chat-send:not(:disabled):hover { opacity: 0.85; }

  /* Spinner */
  .aih-spinner { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(108,99,255,0.2); border-top-color: var(--accent-primary); border-radius: 50%; animation: aih-spin 0.7s linear infinite; }
  @keyframes aih-spin { to { transform: rotate(360deg); } }
`
