<p align="center">
  <img src="public/brand/readme-header.svg" alt="FinTrack" width="340" />
</p>

> **Personal finance management — track expenses, lent & debt, and investments with AI-powered insights.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-fin--track--eight--blue.vercel.app-4FA981?style=flat-square)](https://fin-track-eight-blue.vercel.app/)
[![Version](https://img.shields.io/badge/version-1.2.0-4FA981?style=flat-square)](https://github.com/isttiiak/FinTrack/releases)
[![Built with React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

---

## What is FinTrack?

FinTrack is an open-source personal finance app built for the Bangladeshi context but usable by anyone. It combines expense tracking, a lent & debt ledger, an investment portfolio tracker, and a full AI assistant — all in a premium dark UI (muted Emerald & Gold) with smooth animations.

**Everything is yours.** Your data lives in your own Supabase project. You can export it anytime, delete it anytime, and self-host the app in under 10 minutes.

**Installable as an app.** FinTrack is a PWA — on mobile, open the site and choose "Add to Home Screen" (Android Chrome / iOS Safari) to install it like a native app, complete with its own icon and no browser address bar.

---

## Features

### 💸 Expenses
- Add, edit, delete transactions (Expense / Income)
- Smart category system with main groups and sub-categories
- **AI-powered category suggestion** — type a description, Groq auto-suggests the category
- Search, filter by category, type, payment method, and month
- Budget limits per category with visual indicators (amber at 80%, red at 100%)
- No-spend streak tracker with calendar heatmap
- CSV import with column preview and Supabase bulk insert
- Export to Excel (multi-sheet) or CSV
- **Inline expression amount field** — type `60*4` directly into the Amount field and it evaluates live as you type
- **Floating calculator** — a global, draggable calculator reachable from every page, with copy-to-clipboard

### 🏦 Lent & Debt
- Track money you've lent and owe across people
- Full payment history per entry with running remaining balance
- Tabs: All · Lent · Debt · Summary · Payment Logs
- Summary view: Total / Paid back / Remaining per person per type
- Two-step delete confirmation on all entries

### 📈 Investments
- Track committed capital, installment payments, and returns
- ROI %, P&L, and portfolio total computed live
- Return types: Profit / Capital Return / Dividend / Rent
- Payment method + account picker on every payment and return form
- Detail page per investment with payments and returns tabs

### 🤖 AI Insights (Powered by Groq — free)
All features use your own free Groq API key (14,400 requests/day, no credit card):

| Feature | What it does |
|---------|-------------|
| **Smart Categorization** | Auto-suggests category while you type the description |
| **Anomaly Detection** | Flags spending spikes vs your 3-month average |
| **Weekly Digest** | Friendly 7-day summary with highlights and tips |
| **Budget vs Actual Analysis** | Explains WHY you're over/under budget |
| **Spending Patterns** | Identifies expensive habits over 6 months |
| **Natural Language Chat** | Ask "How much did I spend on food?" in plain English |
| **Budget Recommendations** | Suggests realistic budgets from your actual spending |
| **Goal-Based Plan** | Enter a savings goal → get a month-by-month spending plan |
| **Benchmarking** | Compares your spending vs typical Bangladesh household |
| **Debt Payoff Strategy** | Snowball vs Avalanche analysis from your ledger data |

### ⚙️ Settings & Preferences
- **Data Preferences** — full CRUD for categories (tree view), payment methods, and accounts
- Payment method smart picker: Cash → auto account · MFS → bKash/Nagad/Rocket · Card/Bank Transfer → bank selector
- Add custom payment methods and bank accounts
- Budget limits management
- CSV import with drag-and-drop
- Full data export + account deletion (30-day soft-delete recovery)

### 📊 Analytics
- Monthly trend (12 months, expense + income lines)
- Category donut for selected month
- Daily spending bars
- Payment method split
- Budget vs actual horizontal bars
- No-spend calendar heatmap with streak counter
- 6 KPI cards: Spent · Income · Net · Daily avg · Yearly total · No-spend streak

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + Vite 6 |
| Language | TypeScript 5.7 (strict, `.tsx`/`.ts` only) |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| Routing | TanStack Router v2 (type-safe) |
| Data fetching | TanStack Query v5 |
| State | Zustand |
| Animations | Framer Motion v12 |
| Forms | React Hook Form v8 + Zod v4 |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL 16 + Auth + RLS) |
| AI | Groq API (llama-3.1-8b-instant, browser-direct BYOK) |
| Export | SheetJS (Excel) + Papa Parse (CSV) |
| PWA | vite-plugin-pwa (installable, offline app-shell caching) |
| Hosting | Vercel |
| Package manager | pnpm |

---

## Self-Hosting in 10 Minutes

### Prerequisites
- Node.js 18+, pnpm
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)

### 1. Clone and install
```bash
git clone https://github.com/isttiiak/FinTrack.git
cd FinTrack
pnpm install
```

### 2. Set up Supabase
1. Create a new Supabase project
2. Go to **SQL Editor** → paste and run `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key from **Settings → API**

### 3. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally
```bash
pnpm dev
```
Visit `http://localhost:5173`

### 5. Deploy to Vercel
```bash
pnpm build   # verify it builds cleanly
```
Then import the GitHub repo in Vercel and add the two environment variables.

---

## Setting up AI Features

1. Go to [console.groq.com](https://console.groq.com) → sign up free → **API Keys → Create API key**
2. In FinTrack: **Settings → AI Insights → paste your key → Save**
3. Navigate to **Analytics → ✨ AI Insights**

Your key is stored only in your browser's localStorage — never sent to any server other than Groq directly.

---

## Project Structure

```
src/
├── components/
│   ├── ai/           ← AIHub (all 10 AI features)
│   ├── common/       ← DeleteButton, ConfirmDialog, PaymentMethodPicker, Logo, ToastContainer
│   ├── expenses/     ← ExpenseForm, ExpenseCard, CategoryCombobox, CategoryManagerModal
│   ├── investments/  ← InvestmentForm, ReturnForm, InvestmentPaymentForm
│   ├── layout/       ← AppShell, Sidebar, MobileNav
│   └── ledger/       ← PersonCard, LedgerSummaryTab, LedgerPaymentLogs
├── hooks/
│   ├── useAICategorySuggest.ts  ← Smart categorization
│   ├── useExpenses.ts
│   ├── useInvestments.ts
│   ├── useLedger.ts
│   ├── useCategories.ts
│   ├── useNoSpendStreak.ts
│   └── useDemoGuard.ts          ← Blocks writes in demo mode with a friendly toast
├── lib/
│   ├── groq.ts        ← Groq API client
│   ├── aiContext.ts   ← AI prompt data builders
│   ├── constants.ts   ← Payment methods, accounts, categories
│   ├── export.ts      ← Excel + CSV export
│   └── utils.ts
├── pages/
│   ├── AnalyticsPage.tsx
│   ├── DataSettingsPage.tsx   ← Category/method/account CRUD
│   ├── DashboardPage.tsx
│   ├── ExpensesPage.tsx
│   ├── InvestmentDetailPage.tsx
│   ├── InvestmentsPage.tsx
│   ├── LedgerPage.tsx
│   ├── PersonDetailPage.tsx
│   └── SettingsPage.tsx
├── stores/
│   ├── authStore.ts
│   ├── confirmStore.ts  ← Two-step delete confirmation
│   ├── demoStore.ts
│   └── uiStore.ts
└── types/
    ├── database.types.ts
    ├── expense.types.ts
    ├── investment.types.ts
    └── ledger.types.ts
```

---

## Database Schema (key tables)

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (name, avatar, currency, timezone) |
| `categories` | Expense/income categories with main groups |
| `budget_limits` | Monthly spend cap per category |
| `transactions` | All expense and income entries |
| `persons` | People in the lent/debt ledger |
| `person_ledger` | Individual lent/debt entries |
| `ledger_payments` | Payments against ledger entries |
| `investments` | Investment portfolio entries |
| `investment_payments` | Installment payments into investments |
| `investment_returns` | Returns received from investments |

All tables have **Row Level Security** — users can only see their own data.

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes (TypeScript strict, `.tsx` only)
4. Run `pnpm build` to verify it type-checks and builds cleanly
5. Open a PR

### Code conventions
- No comments unless the WHY is non-obvious
- No unused variables (TypeScript strict enforces this)
- Inline `<style>` in components is fine (no Tailwind classes for custom UI)
- All animations via Framer Motion
- All forms via React Hook Form + Zod

---

## License

MIT — fork it, self-host it, build on it.

---

*Built by [Istiak Islam](https://github.com/isttiiak)*
