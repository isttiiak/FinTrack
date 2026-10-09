// Supabase Edge Function — budget/weekly/monthly email notifications.
//
// Deployed manually, and it MUST be with JWT verification off:
//   supabase functions deploy notifications --project-ref <your-project-ref> --no-verify-jwt
// pg_cron sends the CRON_SECRET as its bearer token, not a Supabase JWT, so
// with verification on the gateway rejects every scheduled call (401) before
// this code runs. The function checks CRON_SECRET itself (see the handler).
// Triggered by three pg_cron schedules (see the comment block at the bottom of
// supabase/migrations/004_currency_and_notifications.sql) hitting this same
// function with a different `?type=` each time. Runs on the Deno runtime, so
// it cannot import anything from src/ — the small summarization helpers below
// are deliberate re-implementations, not shared code.
//
// Required secrets (set via `supabase secrets set`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — service-role client, bypasses RLS
//   RESEND_API_KEY, RESEND_FROM_EMAIL       — outbound email
//   CRON_SECRET                             — bearer token checked below
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL     = Deno.env.get('RESEND_FROM_EMAIL') ?? 'FinTrack <notifications@resend.dev>'
const CRON_SECRET           = Deno.env.get('CRON_SECRET')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Amounts go out in the user's own Profile → Currency (it used to be ৳ for
// everyone, which was wrong for anyone outside Bangladesh). Same rules as the
// app's lib/utils.ts formatCurrency.
function formatMoney(n: number, currency: string | null | undefined): string {
  const cur = currency || 'BDT'
  if (cur === 'BDT') {
    return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${cur} ${n.toFixed(2)}`
  }
}

// 'YYYY-MM' → first and last day of the month before it.
function previousMonthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const prevY = m === 1 ? y - 1 : y
  const prevM = m === 1 ? 12 : m - 1
  const last = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate()
  const mm = String(prevM).padStart(2, '0')
  return { from: `${prevY}-${mm}-01`, to: `${prevY}-${mm}-${String(last).padStart(2, '0')}` }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend error (HTTP ${res.status}): ${body}`)
  }
}

// ── Budget-exceeded alerts ──────────────────────────────────────────────────
async function runBudgetAlerts() {
  const currentMonth = todayISO().slice(0, 7) // 'YYYY-MM'
  const monthStart = `${currentMonth}-01`

  const { data: users, error: usersErr } = await supabase
    .from('profiles').select('id, email, currency').eq('notify_budget_alerts', true).is('deleted_at', null)
  if (usersErr) throw usersErr

  let sent = 0
  let failed = 0
  for (const user of users ?? []) {
    const { data: budgets } = await supabase
      .from('budget_limits')
      .select('*, category:categories(name)')
      .eq('user_id', user.id)
    if (!budgets?.length) continue

    const { data: txns } = await supabase
      .from('transactions')
      .select('category_id, amount, type')
      .eq('user_id', user.id)
      .eq('type', 'Expense')
      .gte('txn_date', monthStart)
    const spentByCategory = new Map<string, number>()
    for (const t of txns ?? []) {
      spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + Number(t.amount))
    }

    // Opt-in rollover (017_budget_rollover.sql): last month's unspent part of
    // the base limit is added to this month's — same rule as the app's
    // src/lib/budgetRollover.ts, so the email agrees with what the user sees.
    const lastMonthSpent = new Map<string, number>()
    const rolling = budgets.filter((b) => b.rollover && String(b.created_at).slice(0, 10) < monthStart)
    if (rolling.length > 0) {
      const { from, to } = previousMonthRange(currentMonth)
      const { data: prev } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', user.id)
        .eq('type', 'Expense')
        .in('category_id', rolling.map((b) => b.category_id))
        .gte('txn_date', from)
        .lte('txn_date', to)
      for (const t of prev ?? []) {
        lastMonthSpent.set(t.category_id, (lastMonthSpent.get(t.category_id) ?? 0) + Number(t.amount))
      }
    }

    for (const b of budgets) {
      const spent = spentByCategory.get(b.category_id) ?? 0
      const base = Number(b.monthly_limit)
      const carry = rolling.includes(b) ? Math.max(0, base - (lastMonthSpent.get(b.category_id) ?? 0)) : 0
      const limit = base + carry
      if (spent < limit) continue

      const { data: existing } = await supabase
        .from('budget_alert_log')
        .select('id')
        .eq('user_id', user.id).eq('category_id', b.category_id).eq('alert_month', currentMonth)
        .maybeSingle()
      if (existing) continue

      const categoryName = (b.category as unknown as { name: string } | null)?.name ?? 'a category'
      const categoryNameHtml = escapeHtml(categoryName)
      // A failed send for one user (e.g. Resend sandbox restrictions, a bad
      // address) must not abort the loop for everyone else.
      try {
        await sendEmail(
          user.email,
          `Budget exceeded: ${categoryName}`,
          `<p>You've spent <strong>${formatMoney(spent, user.currency)}</strong> on <strong>${categoryNameHtml}</strong> this month — over your ${formatMoney(limit, user.currency)} budget${carry > 0 ? ` (including ${formatMoney(carry, user.currency)} rolled over from last month)` : ''}.</p>
           <p>— FinTrack</p>`,
        )
        await supabase.from('budget_alert_log').insert({ user_id: user.id, category_id: b.category_id, alert_month: currentMonth })
        sent++
      } catch (err) {
        console.error(`budget alert failed for user ${user.id}:`, err)
        failed++
      }
    }
  }
  return { sent, failed }
}

// ── Weekly digest ────────────────────────────────────────────────────────────
async function runWeeklyDigest() {
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const from = weekAgo.toISOString().slice(0, 10)

  const { data: users, error: usersErr } = await supabase
    .from('profiles').select('id, email, currency').eq('notify_weekly_digest', true).is('deleted_at', null)
  if (usersErr) throw usersErr

  let sent = 0
  let failed = 0
  for (const user of users ?? []) {
    const { data: txns } = await supabase
      .from('transactions')
      .select('amount, type, category:categories(name)')
      .eq('user_id', user.id).eq('type', 'Expense').gte('txn_date', from)
    if (!txns?.length) continue

    const total = txns.reduce((s, t) => s + Number(t.amount), 0)
    const byCategory = new Map<string, number>()
    for (const t of txns) {
      const name = (t.category as unknown as { name: string } | null)?.name ?? 'Uncategorized'
      byCategory.set(name, (byCategory.get(name) ?? 0) + Number(t.amount))
    }
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topHtml = top.map(([name, amt]) => `<li>${escapeHtml(name)}: ${formatMoney(amt, user.currency)}</li>`).join('')

    try {
      await sendEmail(
        user.email,
        'Your weekly spending digest',
        `<p>You spent <strong>${formatMoney(total, user.currency)}</strong> over the last 7 days.</p>
         <p>Top categories:</p><ul>${topHtml}</ul>
         <p>— FinTrack</p>`,
      )
      sent++
    } catch (err) {
      console.error(`weekly digest failed for user ${user.id}:`, err)
      failed++
    }
  }
  return { sent, failed }
}

// ── Monthly digest ───────────────────────────────────────────────────────────
async function runMonthlyDigest() {
  const now = new Date()
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const from = prevMonthStart.toISOString().slice(0, 10)
  const to = prevMonthEnd.toISOString().slice(0, 10)
  const monthLabel = prevMonthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const { data: users, error: usersErr } = await supabase
    .from('profiles').select('id, email, currency').eq('notify_monthly_digest', true).is('deleted_at', null)
  if (usersErr) throw usersErr

  let sent = 0
  let failed = 0
  for (const user of users ?? []) {
    const { data: txns } = await supabase
      .from('transactions')
      .select('amount, type, category:categories(name)')
      .eq('user_id', user.id).gte('txn_date', from).lte('txn_date', to)
    if (!txns?.length) continue

    const income = txns.filter((t) => t.type === 'Income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = txns.filter((t) => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0)
    const byCategory = new Map<string, number>()
    for (const t of txns.filter((t) => t.type === 'Expense')) {
      const name = (t.category as unknown as { name: string } | null)?.name ?? 'Uncategorized'
      byCategory.set(name, (byCategory.get(name) ?? 0) + Number(t.amount))
    }
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    const topHtml = top.map(([name, amt]) => `<li>${escapeHtml(name)}: ${formatMoney(amt, user.currency)}</li>`).join('')

    try {
      await sendEmail(
        user.email,
        `Your ${monthLabel} summary`,
        `<p><strong>${monthLabel}</strong></p>
         <p>Income: ${formatMoney(income, user.currency)}<br>Expenses: ${formatMoney(expense, user.currency)}<br>Net: ${formatMoney(income - expense, user.currency)}</p>
         <p>Top categories:</p><ul>${topHtml}</ul>
         <p>— FinTrack</p>`,
      )
      sent++
    } catch (err) {
      console.error(`monthly digest failed for user ${user.id}:`, err)
      failed++
    }
  }
  return { sent, failed }
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('authorization') ?? ''
  if (!timingSafeEqual(authHeader, `Bearer ${CRON_SECRET}`)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const type = new URL(req.url).searchParams.get('type')
  try {
    const result = type === 'budget' ? await runBudgetAlerts()
      : type === 'weekly'  ? await runWeeklyDigest()
      : type === 'monthly' ? await runMonthlyDigest()
      : null
    if (!result) return Response.json({ error: 'type must be budget, weekly, or monthly' }, { status: 400 })
    return Response.json({ type, ...result, ran_at: new Date().toISOString() })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'unknown error' }, { status: 500 })
  }
})
