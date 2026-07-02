// Supabase Edge Function — budget/weekly/monthly email notifications.
//
// Deployed manually (`supabase functions deploy notifications`), triggered by
// three pg_cron schedules (see the comment block at the bottom of
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

function formatBDT(n: number): string {
  return `৳${Math.round(n).toLocaleString('en-BD')}`
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
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
    .from('profiles').select('id, email').eq('notify_budget_alerts', true).is('deleted_at', null)
  if (usersErr) throw usersErr

  let sent = 0
  let failed = 0
  for (const user of users ?? []) {
    const { data: budgets } = await supabase
      .from('budget_limits')
      .select('category_id, monthly_limit, category:categories(name)')
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

    for (const b of budgets) {
      const spent = spentByCategory.get(b.category_id) ?? 0
      if (spent < b.monthly_limit) continue

      const { data: existing } = await supabase
        .from('budget_alert_log')
        .select('id')
        .eq('user_id', user.id).eq('category_id', b.category_id).eq('alert_month', currentMonth)
        .maybeSingle()
      if (existing) continue

      const categoryName = (b.category as unknown as { name: string } | null)?.name ?? 'a category'
      // A failed send for one user (e.g. Resend sandbox restrictions, a bad
      // address) must not abort the loop for everyone else.
      try {
        await sendEmail(
          user.email,
          `Budget exceeded: ${categoryName}`,
          `<p>You've spent <strong>${formatBDT(spent)}</strong> on <strong>${categoryName}</strong> this month — over your ${formatBDT(b.monthly_limit)} budget.</p>
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
    .from('profiles').select('id, email').eq('notify_weekly_digest', true).is('deleted_at', null)
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
    const topHtml = top.map(([name, amt]) => `<li>${name}: ${formatBDT(amt)}</li>`).join('')

    try {
      await sendEmail(
        user.email,
        'Your weekly spending digest',
        `<p>You spent <strong>${formatBDT(total)}</strong> over the last 7 days.</p>
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
    .from('profiles').select('id, email').eq('notify_monthly_digest', true).is('deleted_at', null)
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
    const topHtml = top.map(([name, amt]) => `<li>${name}: ${formatBDT(amt)}</li>`).join('')

    try {
      await sendEmail(
        user.email,
        `Your ${monthLabel} summary`,
        `<p><strong>${monthLabel}</strong></p>
         <p>Income: ${formatBDT(income)}<br>Expenses: ${formatBDT(expense)}<br>Net: ${formatBDT(income - expense)}</p>
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
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
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
