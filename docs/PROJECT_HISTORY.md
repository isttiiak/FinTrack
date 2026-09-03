# FinTrack — Project History

> Archive of everything FinTrack has shipped, why, and the long-form product spec.
> Split out of `CLAUDE.md` on 2026-09-03 so it is read **on demand** rather than loaded
> into every session (it was ~23k tokens of always-on context).
>
> **Read this when** you need to know why something was built the way it was, or what a
> module is supposed to do in full. **Don't read it** for routine work — `CLAUDE.md` has
> the operating rules and `TODO.md` has the active backlog.
>
> Content below is preserved verbatim from CLAUDE.md.

---

## Current Build Status

### Phase 1 — COMPLETE
- [x] Project scaffold (Vite 6 + React 19 + TypeScript + Tailwind v4)
- [x] Supabase schema + RLS policies (all tables, triggers, seed function)
- [x] Auth — email/password + Google OAuth + demo mode
- [x] Expenses module (full — add/edit/delete, CategoryCombobox with search + create, filters, budget indicators, export, CSV import)
- [x] Lent & Debt module (full — QuickLedgerEntry form, person timeline, payment tracking, summary tab, payment logs)
- [x] User profile + settings (name, avatar, currency, timezone, data export, account deletion)
- [x] Data export (Excel multi-sheet + CSV) + CSV import with preview
- [x] Account deletion flow (soft-delete with 30-day recovery)
- [x] Landing page
- [x] Analytics (Recharts — monthly trend, category donut, daily bars, payment split, budget vs actual, no-spend calendar)
- [x] Responsive polish
- [x] Deployed to Vercel

### Phase 2 — COMPLETE
- [x] Investment tracker (full CRUD — name, category, company, committed amount, start/end date, market value, doc link)
- [x] Investment returns (log profit / capital return / dividend / rent)
- [x] Investment payments (installment tracking with PaymentMethodPicker)
- [x] ROI and P&L computed per investment and portfolio summary
- [x] InvestmentDetailPage with payments + returns tabs
- [x] Payment method + account smart picker (Cash/MFS/Card/Bank Transfer with auto-account)
- [x] Data Preferences page (category CRUD tree, custom payment methods/accounts)
- [x] Two-step delete confirmation modal (SweetAlert2-style)
- [x] DeleteButton reusable component across all delete actions

### Phase 3 — AI FEATURES COMPLETE (Groq)
- [x] Groq API integration (llama-3.1-8b-instant, free tier, BYOK)
- [x] Smart Transaction Categorization — AI suggests category from description while typing
- [x] Anomaly Detection — flags spending spikes vs 3-month average
- [x] Weekly Spending Digest — friendly 7-day summary with highlights + tips
- [x] Budget vs Actual Analysis — explains WHY over/under budget
- [x] Spending Pattern Analysis — identifies habits and optimization opportunities
- [x] Natural Language Chat — ask questions about your finances in plain English
- [x] Budget Recommendations — data-driven budget targets based on real spending
- [x] Goal-Based Spending Plan — savings goal → personalized monthly spending plan
- [x] Benchmarking — compares spending vs Bangladesh household averages
- [x] Debt Payoff Strategy — Snowball vs Avalanche analysis from Lent & Debt data

### Phase 3.5 — POST-AUDIT BUG-FIX PASS — COMPLETE (2026-07-01)
A full codebase audit surfaced several bugs — some present since Phase 2/3 shipped — that are now fixed:
- [x] `investment_payments` table was referenced by the app but never created in the schema — installment payment logging was completely broken until `002_investment_fixes.sql`
- [x] `investment_returns` was missing `payment_method`/`account` columns the return form always submitted — every return log attempt failed until the same migration added them
- [x] `/reset-password` page and route did not exist — the forgot-password email flow led to a dead end; added `ResetPasswordPage.tsx` + route
- [x] Investment ROI/P&L were computed with two different formulas on the list page (vs. committed amount) and detail page (vs. amount paid so far) — unified to the committed-amount formula everywhere
- [x] Account deletion had no error handling — a failed DB update would still sign the user out, leaving the account in a broken half-deleted state
- [x] `no_spend_flag` column removed — it was always written `false` and never read; the real no-spend streak logic in `useNoSpendStreak.ts` already computes dynamically from transaction dates
- [x] CSV import now validates dates are `YYYY-MM-DD` before inserting, instead of silently accepting any string
- [x] Date-only strings (`formatDate`/`formatDateShort`/`formatDateLabel`) now parse y/m/d components directly instead of via the UTC-assuming `Date` constructor, removing an off-by-one-day risk for Asia/Dhaka (UTC+6) users
- [x] Category delete confirmation now shows the real count of transactions that will become "Uncategorized" instead of incorrectly claiming transactions are unaffected
- [x] Ledger payment form now blocks entering more than the remaining balance
- [x] Investment payment/return forms remember the last-used payment method/account (matching `ExpenseForm`) instead of always defaulting to Cash
- [x] Demo mode now seeds sample investments/returns/payments so the Investments tab isn't empty for visitors
- [x] `AnalyticsPage` chart colors/tooltip now reference the CSS design tokens instead of duplicating hex values

### Phase 3.6 — LEDGER PAYMENT MODEL REDESIGN — COMPLETE (2026-07-01)
User-reported logic/UX bugs in the Lent & Debt module traced back to one root cause: payments
were bound to a single `person_ledger` entry (`ledger_id` FK), but a person can have multiple
lend/debt events over time and the correct mental model is an aggregate running balance per
(person, Lent-or-Debt) — not "which loan is this payment for". Redesigned in `003_ledger_aggregate_payments.sql`:
- [x] `ledger_payments` now attaches to `(person_id, ledger_type)` instead of one `person_ledger` row — migration backfills existing payments from their old `ledger_id` link, then drops that column
- [x] Per-entry `paid_amount`/`remaining`/`status`/`payments` fields removed from `PersonLedger` — aggregates now live on `PersonWithLedgers` (`lent_count`, `debt_count`, `lent_status`, `debt_status`, `overpaid_lent`, `overpaid_debt`)
- [x] Main ledger list's row-level "Edit" button removed — it was incorrectly wired to open the People management slider; editing an entry is only reachable from a person's Timeline tab (unchanged, always worked correctly)
- [x] "Pay" button — on the main list and the person detail hero — split into two type-aware buttons ("Collect" for outstanding Lent, "Pay" for outstanding Debt) defaulting to the person's TRUE aggregate remaining for that type, not a single entry's remaining
- [x] Timeline tab's per-entry "Payments/Hide" expand drawer removed — payments aren't attributable to one entry anymore; entries are now a clean historical list (amount, date, reason, Edit, Delete)
- [x] "Payment logs" (`LedgerPaymentLogs.tsx`, shared by the main Ledger page and the person detail page) rewritten as a unified chronological history — every lend/debt entry AND every payment interleaved by date with a running balance, replacing the old payments-only table that computed remaining/status incorrectly (used today's final total against historical rows, and had a dead status branch that always evaluated to "Partial")
- [x] Fixed a horizontal-scroll bug on the person detail page's Payments tab — a `min-width: 700px` grid table inside a `max-width: 760px` page left almost no breathing room; replaced with a responsive card layout and widened the page to 900px (matching the main Ledger page)
- [x] Editing/deleting a lend/debt entry can no longer break the aggregate — remaining clamps to a minimum of 0, and any surplus from an entry being reduced/removed after payments were logged against it surfaces as an "Overpaid by ৳X" badge instead of going negative or blocking the edit
- [x] Demo mode seed data updated to the new payment shape, including a person with two separate Lent entries to showcase the aggregate model

### Phase 4 — UX CLEANUP, AI DECLUTTER, NOTIFICATIONS & MULTI-CURRENCY — COMPLETE (2026-07-02)
- [x] Dashboard gained a month picker (shared `MonthPicker` component, extracted from `ExpensesPage`'s local one) — defaults to the current month, drives all KPI cards/top category/recent transactions/ledger snapshot for the selected month instead of always "now"
- [x] Ledger page's 3-card summary row (Total lent out / Total borrowed / Net position) reduced to 2 cards — Net position folded into the "Total borrowed" card as a small inline line instead of its own card
- [x] The "People" panel (`PersonManagementPanel.tsx`, a slide-over) replaced by a full page (`PeoplePage.tsx` at `/ledger/people`) — its old 4-card KPI grid (Top lent/Top debt/Owe you/You owe, duplicating the main Ledger page's own summary row) removed entirely in favor of a compact stats strip (total people / people who owe you / people you owe) plus All-people/Lent/Debt tabs and a relationship filter dropdown
- [x] Data Preferences (`DataSettingsPage.tsx`) converted from a slide-over to a full page at `/settings/data`. Category sub-add no longer asks for a type — it's inherited from the parent group. Main groups show a type tag; a type filter (All/Expense/Income) was added
- [x] The separate "Payment Methods" and "Accounts" tabs merged into one "Payment Methods" tab, scoped to what `PaymentMethodPicker` actually reads (confirmed by reading the picker: for Card/Bank Transfer it only ever renders the *accounts* list, never a *methods* list — so the old tab's entries for those two groups were silently dead). Taken further in a same-day follow-up: Card and Bank Transfer's account lists were themselves duplicated (`Card.accounts` and `'Bank Transfer'.accounts` were the literal same array) — merged into one shared `BANK_ACCOUNTS` list/section (`lib/paymentMethodPrefs.ts`), so a bank only needs to be added once, used by both. The section is now 3 cards (Cash fixed / MFS providers / shared Bank Accounts), and every non-Cash entry — built-in or custom — supports reorder (▲▼), rename, remove, and a "Reset to defaults" link; built-ins are no longer a protected, unremovable subset. `PaymentMethodPicker` reads this same persisted state, so Data Preferences changes actually affect transaction entry
- [x] AI Hub (`AIHub.tsx`) decluttered — the 7 always-expanded feature cards became collapsed-by-default rows (icon + title + Run; description moved to a hover tooltip), grouped under "Spending Analysis" and "Planning" headings; Goal Planner and Chat unchanged
- [x] Ledger page's summary row gained a 3rd card: people counts (how many people owe you / how many you owe), stacked vertically with a divider, next to the existing lent/borrowed totals
- [x] Multi-currency (lightweight) — **built, tested, then reverted the same day.** `transactions` gained `original_amount`/`original_currency`, `ExpenseForm` gained a currency selector with a live converted-amount preview via `open.er-api.com`. After shipping it, a live test ($10 → ৳1231.70 vs. ৳1232.43 shown elsewhere) surfaced the real tradeoff of a free daily-rate API: a small but visible gap vs. other sources. Traced the math — the conversion logic itself was correct, the gap was just normal cross-provider/staleness drift (~0.06%, smaller than a real bank's markup) — but decided it wasn't worth the added complexity for a free/open-source app. Removed in `006_remove_currency_conversion.sql`; `lib/currency.ts` deleted. See Decisions Log
- [x] Email notifications (budget exceeded / weekly digest / monthly digest) — new `supabase/functions/notifications/index.ts` Edge Function (Deno), triggered by three `pg_cron` + `pg_net` schedules (see the SQL comment block in `004_currency_and_notifications.sql` and `005_schedule_notification_crons.sql`), sends via Resend. Per-user toggles live on `profiles.notify_budget_alerts`/`notify_weekly_digest`/`notify_monthly_digest`, editable from Settings → Notifications. `CRON_SECRET` is stored in Supabase Vault (`vault.create_secret`), not inline in any committed migration, since this repo is public. Per-user send failures are caught individually so one bad address doesn't block everyone else's digest in the same run. Web Push was considered and deliberately deferred (no service worker / push infra yet) — email covers the same alerts without that extra surface. Confirmed working end-to-end with a live test send
- [x] **Schema-doc correction**: the user-profile table has always been named `profiles` (see `001_initial_schema.sql`), not `users` — this file previously documented it as `users` throughout; fixed below

### Phase 5 — INLINE EXPRESSION AMOUNT FIELD + FLOATING CALCULATOR — COMPLETE (2026-07-06)
Recurring day-to-day friction: entering a repeated small cost (e.g. bus fare × 4 trips) meant doing
the multiplication in your head or on a separate calculator app before typing the final number into
an Amount field. Two related features shipped:
- [x] `lib/calculator.ts` — hand-rolled tokenizer + recursive-descent expression evaluator
  (`evaluate()`/`hasOperator()`), supporting `+ - * / ( ) %` with standard precedence. Deliberately
  no `eval()`/`new Function()` — this is a financial app, avoid arbitrary code execution even though
  input is always local. `%` is a simple postfix divide-by-100, not context-aware percent-of-total
- [x] `components/common/SmartAmountInput.tsx` — reusable live-expression amount input. Type `60*4`
  directly into a field and it evaluates on every keystroke (not just on blur/submit), showing a
  live `= 240` preview; blur snaps the visible text to the resolved number. A compact `+ − × ÷` chip
  row appears while focused, since mobile `inputMode="decimal"` keypads generally have no operator
  keys at all — without the chips, the feature would be effectively undiscoverable/unusable on phone
- [x] Wired into `ExpenseForm.tsx`'s Amount field only for this pass (swapped `register` for
  `Controller`, the pattern already used elsewhere in that same file) — the other 6+ amount inputs
  across ledger/investment forms (`LedgerEntryForm`, `QuickLedgerEntry`, `PaymentForm`, `ReturnForm`,
  `InvestmentPaymentForm`, `InvestmentForm`) still use a plain numeric input and can adopt
  `SmartAmountInput` later since it's a standalone drop-in, not entangled with `ExpenseForm`
- [x] `components/common/FloatingCalculatorFAB.tsx` + `FloatingCalculatorPanel.tsx` — a global,
  draggable floating calculator reachable from every page (mounted once in `AppShell.tsx`, alongside
  `ConfirmDialog`), for calculations that don't belong to one specific field. Full keypad (digits,
  `+ − × ÷ % ( )`, clear, backspace, equals), copy-to-clipboard on the result via
  `navigator.clipboard.writeText()`. Dragging is genuinely new to this codebase (Framer Motion
  `drag`/`useDragControls`, header-only drag handle so keypad taps never start a drag gesture) —
  position persists across reloads via `lib/calculatorPrefs.ts` (localStorage, same
  `paymentMethodPrefs.ts`-style pattern). Panel z-index sits above form-modal overlays (`50`) but
  below `ConfirmDialog` (`9000`), so it stays usable while e.g. `ExpenseForm` is open at the same time
- [x] **Bug found and fixed during browser verification**: the desktop sidebar is `position:fixed;
  left:0; width:240px; z-index:40` — placing the new FAB's trigger at `left:24px` put it directly
  underneath the sidebar, completely invisible on desktop. Fixed by shifting the FAB (and the
  panel's default first-open position) to `left:264px` on desktop only (`@media min-width:769px`),
  clearing the sidebar; mobile keeps `left:24px` since the sidebar there is off-canvas by default
- [x] **Second pre-existing bug found (unrelated to this feature) and fixed**: `uiStore.ts`'s
  `sidebarOpen` defaulted to `true` with no persistence, so on every fresh mobile page load the
  sidebar drawer rendered open-over-content (translateX(0)) until the user tapped a nav link —
  which also hid the new mobile-width FAB behind it. Confirmed via the CSS that this flag has zero
  effect on desktop (the mobile-only `@media max-width:768px` block is the only place `.sidebar-open`
  does anything), so flipping the default to `false` fixes the mobile drawer-on-load quirk with no
  desktop impact
- Both features browser-tested end-to-end via a headless Chromium/Playwright session (demo mode →
  typed `60*4+15` in the Expense Amount field → live preview showed `= 255`, blur snapped to `255` →
  computed `12*3-4` on the floating keypad → result `32` → copy button → clipboard confirmed to
  contain `32` → dragged the panel by its header and confirmed it stayed within the viewport →
  confirmed an existing transaction's Amount still pre-fills as a plain number in edit mode)

### Phase 5.5 — RESPONSIVENESS & DATA-INTEGRITY AUDIT — COMPLETE (2026-07-06)
Prompted by a third-party usability review of the live site (via an external AI browser-extension
inspection) flagging a Dashboard/Expenses data mismatch, an Investments KPI contradiction, and
general responsiveness concerns. Verified each claim against the live deployed site (network access
confirmed, tested with demo mode + a 375–1280px viewport sweep) and the source code before touching
anything:
- [x] **Investments "Portfolio value" bug (confirmed real)** — `InvestmentsPage.tsx` summed
  `market_value ?? committed_amount` per investment, so whenever a user hadn't entered a market
  value (the common case), "Portfolio value" silently re-displayed the committed amount under a
  different label — reading as a contradiction next to a correctly-computed negative ROI (ROI is,
  by design since Phase 3.5, computed purely from cash returned vs. committed, never from
  `market_value`). Also found `InvestmentDetailPage.tsx` used a *different* fallback
  (`market_value ?? totalPaid`) than the list page, so the same investment could show two different
  "Portfolio value" numbers depending which page you were on. Fixed on both pages to only sum/show
  investments that actually have a `market_value` set, labeled honestly ("valued: 2 of 3" / "Not
  valued yet") instead of fabricating a number
- [x] **Analytics date-range bug (confirmed real)** — `AnalyticsPage.tsx`'s month-scoped query used
  `getMonthRange(0).to`, which always computed the end date from *today*, completely ignoring the
  `selectedMonth` picker. Picking any month other than the current one silently used the wrong date
  range. Didn't show up in casual testing only because the reviewer happened to be viewing the
  current month. Replaced with a `selectedMonthRange` derived directly from `selectedMonth` (same
  safe y/m/d `Date` construction pattern already used in `DashboardPage.tsx`/`ExpensesPage.tsx`); the
  now-dead module-level `getMonthRange` helper was removed
- [x] **Silent-failure reliability gap (confirmed real, root cause of the Dashboard mismatch)** —
  none of `DashboardPage.tsx`, `ExpensesPage.tsx`, or `AnalyticsPage.tsx` read `isError`/`error` from
  their queries, so any failed fetch (auth-token refresh race, transient network blip) rendered
  pixel-identical to "genuinely zero transactions." Dashboard alone fires 5 concurrent Supabase
  queries on mount vs. Expenses' 1, making it the most exposed to a single transient failure looking
  like missing data — the most likely explanation for the reported "Dashboard shows nothing, Expenses
  shows ৳1,083" mismatch (not reproduced directly, since demo mode never touches the network, but the
  date-range math and query-cache keys were traced and ruled out as causes). New
  `components/common/ErrorBanner.tsx` (icon + message + Retry button, styled consistent with
  `EmptyState.tsx`) now renders on all three pages when any of their queries error, calling
  `refetch()` on click, instead of silently showing an empty state indistinguishable from "no data"
- [x] **Ledger page mobile tab-row cramping (confirmed real, found during the viewport sweep)** —
  on narrow phones (~375–390px), the 5-tab row (All/Lent/Debt/Summary/Payment logs) shared a flex row
  with the Newest/Oldest sort buttons; the sort buttons had `flexShrink:0` while the tabs container
  had bare `flex:1` with no minimum width, so the tabs container was squeezed to ~180px — clipping
  "Debt" mid-icon and hiding "Summary"/"Payment logs" behind an undiscoverable horizontal scroll.
  Fixed by giving the tabs container `flex: '1 1 240px'` and the sort-buttons div `marginLeft: 'auto'`
  — standard flexbox now wraps the sort buttons onto their own line whenever there isn't room for
  both on one line, at any width, instead of a hardcoded breakpoint
- [x] **Responsiveness sweep (375/390/768/1024/1280px, 7 pages)** — zero page-level horizontal
  overflow found anywhere else. One apparent bug (Ledger's bottom tab row visually overlapping the
  fixed mobile nav bar) turned out to be a `page.screenshot({ fullPage: true })` stitching artifact
  from a `position:fixed` element being redrawn at multiple scroll offsets — confirmed via viewport-only
  screenshots and `getBoundingClientRect()` that there was no real overlap; worth remembering for any
  future automated visual testing in this codebase
- [x] Reviewed but **not** changed: the ~2s skeleton-loader flash on first visit to Investments/Analytics
  is expected cold-cache Supabase latency (React Query's `staleTime` is 5 minutes, so revisits within
  a session are instant) — not a bug. Red/green color reliance is a valid general accessibility note
  but already partially mitigated (arrows paired with color in several places) — left as a future
  polish item, not urgent

**Follow-up sweep (same day)** — extended the audit to the pages not covered above
(Settings, Profile, People, Data Preferences, PersonDetail, AI Hub) plus a security/release-readiness
pass, ahead of tagging v1.0.0:
- [x] **`SettingsPage.tsx` off-by-one date bug** — the Data Export card's "This month" range used
  `.toISOString().split('T')[0]` on a local-midnight `Date`, which shifts the end-of-month date back
  a day in Asia/Dhaka (UTC+6), silently excluding the last day's transactions from the export count.
  Replaced with the existing `getCurrentMonthRange()` helper (also deduplicates a range that
  `useExpenses()` already computes internally when called with no filter)
- [x] **`AIHub.tsx` date-range bug** — the same "anchored to today, ignores the selected month" bug
  as the Analytics fix above, in a second location: `allTxns` fed Anomaly Detection's "3-month
  average" baseline, Spending Patterns' 6-month trend, and Budget Recommendations' 3-month average —
  all silently computed relative to real-today instead of whichever month is selected in Analytics.
  Fixed by anchoring `allTxns` to `selectedMonth`; `runWeeklyDigest` intentionally kept on its own
  independent "real last 7 days" query since that feature is meant to be always-current regardless
  of the analytics month picker
- [x] **Error/retry states extended** to `PersonDetailPage.tsx`, `PeoplePage.tsx`,
  `DataSettingsPage.tsx`, `SettingsPage.tsx` (`BudgetSection` + `ExportSection`), and `AIHub.tsx` —
  same `ErrorBanner` pattern as Phase 5.5's Dashboard/Expenses/Analytics fix. Worst prior case:
  `PersonDetailPage` showed "Person not found" on a genuine fetch failure (not just missing/empty) —
  now distinguishes the two states
- [x] **Two "possible mobile squeeze" leads investigated and ruled out** (PersonDetailPage's
  `.pd-section-header`, DataSettingsPage's `.dsc-group-header`) — both wrap text normally at 375px
  with no `white-space:nowrap` forcing an overflow; confirmed visually, no fix needed
- [x] **Dependency security**: `pnpm audit` found 4 high-severity CVEs — `vite` (6.4.2→6.4.3) and
  `@supabase/supabase-js`'s transitive `ws` dependency both patched via `pnpm update` (already within
  existing `^` ranges). `xlsx` had 2 unfixed CVEs (prototype pollution, ReDoS) with **no patched
  version ever published to npm** — SheetJS stopped publishing there at 0.18.5 and moved fixes to
  their own CDN. Switched `package.json`'s `xlsx` entry to `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
  (the actual patched release); re-verified export still works end-to-end after the swap
- [x] **Repo hygiene**: `tsconfig.tsbuildinfo` (a machine-specific incremental build cache,
  regenerated on every `tsc` run) was tracked in git — added `*.tsbuildinfo` to `.gitignore` and
  `git rm --cached` it
- [x] **Added missing `LICENSE` file** — the README linked to and claimed MIT, but no LICENSE file
  existed in the repo
- [x] Security spot-checks came back clean: no hardcoded secrets/keys anywhere in `src/`/`supabase/`,
  no `console.log` left in source, every table has RLS enabled with no overly-permissive policies,
  no `dangerouslySetInnerHTML`/`eval`/`new Function` usage

### Phase 6 — UI RETHEME (EMERALD & GOLD) + SHIELD LOGO + DEMO-MODE RELIABILITY PASS — COMPLETE (2026-07-08)
User-supplied `RAWDATA/FINTRACK_UI_REDESIGN.md` (plus 4 SVGs) specified a full visual retheme —
the indigo/violet accent (`#6C63FF`/`#A855F7`) was explicitly disliked; replaced with a muted,
desaturated **Emerald & Gold** palette and a new shield-and-trendline logo. Scoped as styling/logo/
animation only (no schema or business-logic changes) — see the new `## UI Design System` section
below for the final token values. A follow-up "audit and fix any bugs" pass then surfaced and fixed
a much larger, previously-invisible demo-mode reliability gap.
- [x] **Retheme execution** — `globals.css`'s `:root` block replaced with the new Emerald & Gold
  tokens (token *names* kept identical, so nothing else needed renaming); a ~300-occurrence sweep of
  hardcoded old-theme hex/rgba literals across 45 files done via a one-off scripted find-and-replace
  (exact old→new hex table, plus a special-case pass turning the old 2-stop purple chrome gradient
  into the new 3-stop `--grad-brand` emerald→gold gradient) rather than by hand — the true footprint
  was ~4x wider than an initial grep for just the 2 purple hexes suggested, once the other 5 old
  semantic accents (teal/teal-2/coral/red/amber) and 3 text/surface hexes were included
- [x] **`src/stores/demoStore.ts` deliberately excluded from the sweep** — its `color_hex` seed
  values (e.g. `#6C63FF` on a demo category) are user-facing category-color *data*, not app chrome;
  only coincidentally matched old theme hexes
- [x] **Hand-curated exceptions where a 1:1 hex swap would have merged two meaningfully-different
  colors into one** — the new palette *intentionally* collapses `accent-teal` into `accent-primary`
  and `accent-amber` into `accent-gold` (fine for single-value CSS var usage), but this silently
  broke anywhere that relied on 6–7 mutually-distinct hues from the old palette for a categorical
  legend: `RELATIONSHIP_COLORS` (`PersonCard.tsx` + `PeoplePage.tsx`, kept in sync), `AIHub.tsx`'s 7
  `FeatureCard` accent props, and `AnalyticsPage.tsx`'s `CHART_COLORS` donut/legend array (converted
  from `var(--accent-*)` tokens to 10 curated literal hex values specifically to guarantee visually
  distinct slices — the one deliberate exception to "always use tokens" in this codebase)
- [x] **New `src/components/common/Logo.tsx`** — inline SVG shield + rising-trendline mark with a
  gradient stroke (not a static asset import, so it inherits crisp rendering at any size per the
  redesign doc's own recommendation); wired into the Sidebar, `App.tsx`'s splash screen, all 4 auth
  pages, `LandingPage.tsx` (nav + footer), and `AppShell.tsx`'s mobile topbar — the last of these was
  initially missed (a separate hardcoded "৳" placeholder box) and only caught during the mobile
  screenshot pass, a reminder that a plan's file list can miss siblings of files it does cover
- [x] **`public/favicon.svg`/`favicon-32.png`/`favicon-16.png`/`apple-touch-icon.png`** replaced;
  PNG fallbacks generated via a Playwright screenshot script (no `rsvg-convert`/ImageMagick available
  in this environment) rather than an external generator site. Original 4 SVGs also copied to
  `public/brand/` as source-of-truth originals. `README.md`'s header uses a new
  `public/brand/readme-header.svg` — a copy of `logo-lockup.svg` with a dark rounded-rect background
  baked in (same technique as `favicon.svg`) — not the raw lockup file as-is, because the lockup's
  near-white "FinTrack" text has no background of its own and would be nearly illegible on GitHub's
  light theme. A raw SVG file (not the React `Logo` component) either way, since GitHub can't render
  React in a README
- [x] **Sidebar tagline updated to match the new logo's intended branding** — `logo-lockup.svg` bakes
  in "FINANCE, TRACKED" as its tagline (uppercase, letter-spaced, small caps under the wordmark); the
  Sidebar's separate hardcoded tagline text still said "Personal Finance" (pre-dated this retheme,
  untouched by the initial pass since it isn't part of the `Logo` component itself). Updated to
  "Finance, Tracked" + `text-transform:uppercase` in `Sidebar.tsx` for visual consistency with the
  shipped logo asset — found and fixed after the user asked where the lockup's tagline was actually
  used, since the initial pass had only reused the *mark*, not this text
- [x] **Mobile nav-bar regression found and fixed during verification**: `<Logo withWordmark>`'s
  wordmark text (`fontSize: size*0.9`) is meaningfully larger than the old fixed 17px "FinTrack"
  label it replaced in `LandingPage.tsx`'s nav — at ≤420px it wrapped onto 2 lines and overlapped the
  GitHub/Sign-in/Get-started-free nav-right group. Fixed with a `.logo-wordmark` class + a
  `@media (max-width:420px)` rule hiding the wordmark (icon-only) on narrow phones, rather than
  shrinking the logo everywhere
- [x] **New `.card-featured`/`.card-glow` gradient-border utility classes added to `globals.css`**
  per the redesign doc's spec, but **not** retrofitted onto every existing card — 158 occurrences of
  `border: 1px solid var(--border)` across 19 bespoke per-page card classes were found, and the
  wrapper-div gradient-border technique would have meant restructuring JSX broadly for a purely
  cosmetic goal (real layout-breakage risk, and past "styling only" scope). Applied hands-on at
  exactly one spot instead — `LandingPage.tsx`'s closing CTA card — using the doc's own
  single-element `padding-box`/`border-box` layering trick so the existing translucent tinted
  background could be kept rather than overwritten
- [x] **`src/lib/animations.ts`**: `revealOnScroll` and `modalIn` variants added (the doc assumed
  `staggerItem` also needed adding, but it already existed). Landing page root and
  `DataSettingsPage.tsx`'s inline `{opacity,y}` motion object standardized onto `fadeUp` for
  consistency — the other 10 main pages already used it
- [x] **Reduced-motion CSS safety net added** (`@media (prefers-reduced-motion:reduce)` in
  `globals.css`) — didn't exist at all before this pass
- [x] **Two confirmed pre-existing bugs found and fixed during verification (unrelated to the
  retheme itself)**: `LoginPage.tsx` and `SignupPage.tsx`'s "Try demo" buttons called `enterDemo()`
  without a following `navigate({ to: '/dashboard' })` — unlike `LandingPage.tsx`'s equivalent
  button, which does both — so clicking either silently did nothing. Both fixed
- [x] **`InvestmentsPage.tsx`, `InvestmentDetailPage.tsx`, `LedgerPage.tsx` gained the `ErrorBanner`
  treatment** (destructure `isError`/`refetch`, render on error) — the 3 query-using pages the
  Phase 5.5 audit's page list had missed
- [x] **Demo-mode reliability pass (large, unplanned — surfaced by "audit and fix any bugs")**: what
  started as "add the missing demo-mode guard to Investments" turned into fixing a much bigger,
  previously-invisible gap once it became clear *why* a blocked mutation showed nothing at all —
  **`useUIStore`'s toast system had no renderer.** Every `addToast()` call in the codebase — every
  existing "Demo mode — changes are not saved" guard included — had been silently updating Zustand
  state with nothing ever subscribed to render it. Root-caused and fixed as one connected pass:
  - New `src/components/common/ToastContainer.tsx`, mounted once at `App.tsx`'s root (sibling to
    the routed `<Outlet>`, *not* inside `AppShell`) so it survives route navigation — load-bearing,
    since several delete flows `mutate()` then immediately `navigate()` away from the page that
    triggered the toast
  - New `src/hooks/useDemoGuard.ts` (`useDemoGuard()` + `DemoBlockedError`) — a single reusable
    guard called at the top of a `mutationFn`, replacing the old convention of an ad-hoc
    `if (isDemo) {...; return}` check duplicated at some (not all) call sites. Applied to all ~24
    previously-unguarded mutation hooks across `useExpenses.ts`, `useLedger.ts`, `useInvestments.ts`,
    `useCategories.ts` — the entire Investments module had **no** demo guard at all before this,
    meaning every add/edit/delete there fired a real unauthenticated Supabase call that failed with
    a raw technical error instead of the friendly toast
  - `useExpenses.ts`'s `useCreateExpense` is the **one deliberate exception**: instead of blocking,
    demo-mode creation now actually appends to `demoStore.transactions` (new `addTransaction`
    action) so the app's single most-tried interaction works rather than faking a success toast with
    nothing persisted (the previous behavior) or being flatly blocked (consistent with every other
    mutation, but a worse first impression for a demo). In-memory only, lost on `exitDemo()`/reload,
    same as the rest of the seed data
  - **Second, independently-confirmed bug**: `ExpenseCard.tsx`'s delete button uses an optimistic
    "hide row immediately + 3.6s undo-toast countdown, then really delete" pattern — but never
    rolled back the local `deleting` state if the deferred delete failed for *any* reason (not just
    the new demo guard — this was already true for a genuine network/RLS error). Fixed by passing
    `{ onError: () => setDeleting(false) }` to the deferred `mutate()` call
  - **Third, broader bug found while testing the guard**: 11 form components call `mutateAsync(...)`
    without a `try/catch` (`ExpenseForm`, `PersonForm`, `InvestmentForm`, `ReturnForm`,
    `InvestmentPaymentForm`, `PaymentForm`, `LedgerEntryForm`, `LedgerPaymentLogs.saveEdit`,
    `InvestmentTransactionLogs.saveEdit`, plus inline handlers in `DataSettingsPage.tsx` and
    `PeoplePage.tsx`/`PersonDetailPage.tsx`) — a rejected mutation (demo-blocked *or* a real error)
    became an unhandled promise rejection, and since `onClose()`/state-reset always ran as the next
    line after the `await` rather than in a `finally`, it never ran, leaving the modal stuck open.
    Fixed uniformly: wrap in `try/catch`, close/reset on `DemoBlockedError` (nothing more to do, the
    toast said so), leave open on a real error so the user can retry — confirmed via a
    `page.on('pageerror')` Playwright listener that genuinely caught the unhandled rejection before
    the fix and was clean after
- All of the above browser-verified end-to-end via headless Chromium/Playwright: full page sweep at
  1280px + 375px with zero console/page errors; demo-mode delete → "Demo mode — changes are not
  saved" toast → row correctly reappears; demo-mode Add Investment → same toast → modal closes
  cleanly, count unchanged; demo-mode Add Expense → "Transaction saved" toast → new row genuinely
  appears in the list and updates the Total Spent KPI

**Follow-up fixes (same day, found by the user testing in a real browser — not caught by the
Playwright sweep above):**
- [x] **`LandingPage.tsx`'s final CTA card had a real contrast bug**: the single-element
  `padding-box`/`border-box` layered-background trick used for its gradient border didn't clip
  reliably in a real browser — the bright `--grad-brand` "border" layer bled across the *entire*
  card instead of staying a 1px ring, washing out the body text and "Try demo first" button
  underneath it to the point of being unreadable. My own automated screenshot of the same element
  hadn't shown this. Rebuilt using the wrapper-div technique instead (`.lp-final-card-outer` +
  `.lp-final-card`, matching `globals.css`'s already-reliable `.card-featured`/`.card-inner`
  pattern) — no CSS clip ambiguity, verified fixed. Confirmed via grep this was the *only* place in
  the app using the single-element trick, so no other spot had the same latent bug
- [x] **Landing page had no concept of an already-logged-in visitor** — nav bar, hero CTAs, the
  final CTA card, and the footer all unconditionally showed "Sign in"/"Get started free"/"Create
  free account" even for a visitor with an active session or demo session, and "Create free
  account" pointed at `/signup` regardless. Added `isLoggedIn = !!session || isDemo` (checked via
  `useAuthStore`/`useDemoStore`, `LandingPage.tsx`) and branched all four spots: nav shows an
  avatar + "Dashboard" pill (new `.lp-nav-account`/`.lp-nav-avatar`, mirroring `Sidebar.tsx`'s
  avatar pattern) instead of Sign in/Get started; hero and the final card both collapse to a single
  "Go to Dashboard" button (final card's heading/subtext also swap to "Welcome back!"); footer
  swaps Sign in/Sign up for a single "Dashboard" link. Demo sessions count as "logged in" here too
  — landing back on `/` mid-demo showing signup CTAs was just as confusing as it would be for a
  real session

### Phase 7 — PWA SUPPORT + DEPENDENCY SECURITY HARDENING — COMPLETE (2026-07-23)
User asked to make FinTrack installable on mobile ("Add to Home Screen") plus a routine
vulnerability check.
- [x] Added `vite-plugin-pwa` (devDependency) — `generateSW` mode, `registerType: 'autoUpdate'`.
  Manifest (`name`, `short_name`, `theme_color`/`background_color` matching the Emerald & Gold
  `#0C0F0D` base, `display: 'standalone'`, `categories: ['finance','productivity']`) and 4 icon
  sizes (192/512, plus dedicated maskable variants for Android's adaptive-icon safe zone) all
  configured in `vite.config.ts`
- [x] **Deliberately no runtime caching of Supabase/Groq API calls** — `workbox.globPatterns`
  scoped to only the static build output (`js/css/html/ico/png/svg/webmanifest`). A finance app
  serving stale cached account data from an old service-worker cache as if it were current would
  be a worse failure mode than the existing `ErrorBanner`/retry UX for a genuine network failure
- [x] New `public/pwa-192.png`/`pwa-512.png` (from the existing `favicon.svg`, which already has
  the dark rounded-square background baked in) + `public/pwa-maskable-*.png` (from a new
  `pwa-maskable.svg` — same mark, full-bleed square background since Android applies its own mask
  shape). Generated via the same Playwright-screenshot technique used for the Phase 6 favicons (no
  ImageMagick/rsvg-convert in this environment)
- [x] `index.html` gained the standard "Add to Home Screen" meta tags
  (`mobile-web-app-capable`, `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title`) and
  `viewport-fit=cover` so the app can draw edge-to-edge under a notch/status bar when launched
  standalone
- [x] `AppShell.tsx`'s mobile topbar gained `padding-top: max(12px, env(safe-area-inset-top))` to
  avoid sitting under the notch in standalone mode — `MobileNav.tsx`'s bottom bar already had the
  equivalent `env(safe-area-inset-bottom)` handling from before this pass
- [x] Verified end-to-end against a production build (`vite preview`, not `vite dev` — the SW is
  inactive in dev mode by default): manifest reachable and valid, service worker registers and
  reaches `active` state, all 4 icon files present in `dist/`, no console/page errors on mobile
  viewport in both logged-out and demo-mode dashboard views
- [x] **Dependency security**: `pnpm audit` found 5 vulnerabilities (3 high, 1 moderate, 1 low) —
  all in nested transitive devDependencies (`eslint`'s bundled `minimatch`→`brace-expansion` and
  `@eslint/eslintrc`→`js-yaml`; `vite`'s bundled `postcss`; the new `vite-plugin-pwa`'s
  `workbox-build`→`@babel/preset-env`→`@babel/core`), none reachable from the shipped production
  browser bundle. Fixed via `pnpm.overrides` in `package.json` pinning each to its patched version
  — first attempt used unbounded `>=` ranges, which pnpm resolved to unintended new *major*
  versions (`@babel/core` 7→8, `js-yaml` 4→5, `brace-expansion` 1→5) that risked breaking the build
  tooling depending on them; corrected to caret-constrained ranges (`^1.1.16` etc.) so each stays
  within its original major line. `pnpm audit` now reports zero known vulnerabilities; `tsc -b`,
  `vite build`, and a full Playwright smoke test across the main pages all still pass afterward
- [x] Noted, not fixed: `pnpm lint` has never worked in this repo — no `eslint.config.js` exists
  despite `eslint` being a devDependency with a `lint` script. Pre-existing gap, unrelated to this
  pass's dependency changes; out of scope for a vulnerability-fix request

### Phase 8 — FUTURE
- [ ] Investment analytics charts
- [ ] Debt ↔ Investment link (person_ledger.investment_id FK)
- [ ] Receipt/Invoice Analysis (OCR + Groq)
- [ ] Spending Forecast & Projection
- [ ] Habit Tracking & Nudges
- [ ] Savings account balance tracking
- [ ] Family/household mode (shared expenses view)
- [ ] Web Push notifications (on top of the Phase 4 Edge Function/cron infra)
- [ ] PDF attachment on the monthly digest email
- [ ] To use the email notification for all fintrrack users, we need to add a "from" domain to Resend's verified list (currently only `isttiiak@gmail.com` is verified). This is a free Resend account limitation, not a technical blocker. Ensure the domain is verified before enabling notifications for all users.
- [ ] Roll `SmartAmountInput` out to the other 6+ amount inputs (ledger entries, payments, investment payments/returns) if the inline-expression UX proves popular

---


---

## Features — Detailed Specification

### Auth & User Management

**Sign up flow:**
1. Email + password OR "Continue with Google"
2. On first login: brief onboarding (name, select default currency — BDT pre-selected)
3. Default categories auto-created for new user (seeded from constants)

**Demo mode:**
- Button on landing/login/signup pages: "Try demo — no signup" (all 3 call `enterDemo()` **and**
  `navigate({ to: '/dashboard' })` — the login/signup buttons were missing the navigate call until
  Phase 6, so they silently did nothing when clicked)
- Creates temporary Zustand state (`demoStore.ts`) with seed data (NOT written to Supabase)
- Demo data includes: ~3 months of realistic expenses, 5 persons with varied statuses, 3 investments
- Banner shown at top: "Demo mode — data is not saved. Sign up to keep your data →"
- Demo session cleared on tab close (or full page reload/`goto()` — the store is in-memory only,
  not persisted to localStorage, which matters for anyone writing browser-automation tests against it)
- **Mutation behavior (Phase 6):** every mutation hook checks `isDemo` via `useDemoGuard()` (see
  `src/hooks/useDemoGuard.ts`) and blocks with a "Demo mode — changes are not saved" toast — **except**
  expense creation, which actually appends to `demoStore.transactions` in-memory
  (`useCreateExpense`'s demo branch calls `demoStore.addTransaction`) so the app's single most-tried
  interaction genuinely works in the demo rather than faking success or being flatly blocked. Every
  other create/edit/delete across expenses/ledger/investments/categories is block-with-toast

**Google OAuth:**
- Supabase handles the OAuth flow
- On first Google login: check if profile exists, if not create one with name/avatar from Google

**Profile page:**
- Edit name, avatar (upload OR URL)
- Change timezone
- Change currency (BDT default)
- View account creation date

**Account deletion flow:**
1. User clicks "Delete my account" in Settings
2. Modal: "Before you go — export your data?" with Export button
3. Second confirmation: type "DELETE" to confirm
4. Soft-delete: `deleted_at = now()` set on user
5. Toast: "Account scheduled for deletion in 30 days. You'll receive an email. To cancel, log back in."
6. If user logs back in within 30 days: restore `deleted_at = null`
7. Cron job (Supabase Edge Function, scheduled): hard-delete users where `deleted_at < now() - interval '30 days'`

---

### Expenses Module

**Quick-add FAB (Floating Action Button):**
- Fixed bottom-right on all screen sizes
- Opens bottom sheet on mobile, centered modal on desktop
- Form fields (in order, with smart defaults):
  1. Amount (number input, autofocused, large font)
  2. Category (searchable dropdown — shows sub-categories, auto-links main group)
  3. Description (optional text)
  4. Date (defaults to today)
  5. Payment method (defaults to last used method)
  6. Account (defaults to last used account)
- "Save" animates button → checkmark → form closes → new entry slides into list
- Last used method + account stored in localStorage for defaults

**Transaction list:**
- Grouped by date (today, yesterday, then "DD MMM YYYY")
- Each group shows day total on the right
- Each card: category icon + color dot, description, amount, payment method chip
- Swipe left (mobile) or hover (desktop) → shows Edit + Delete actions
- Delete: slides out with undo toast

**Filters:**
- Month/year picker (defaults to current month)
- Category filter (multi-select)
- Type filter (Expense / Income / All)
- Payment method filter

**Budget limits:**
- Set per category in Settings
- On transaction list: category rows near limit show amber indicator
- Over limit: red indicator + optional alert
- Budget progress shown as a thin colored bar under category name

**No-spend day logic:**
- A day with zero `Expense` transactions = no-spend day
- Streak counts consecutive no-spend days up to today
- Calendar heatmap in Analytics shows: green = no-spend, red gradient = spend intensity

**Export:**
- Export button in page header
- Options: current month / all time / custom date range
- Formats: Excel (.xlsx) or CSV
- Excel export includes: Date, Category, Main Group, Type, Description, Amount, Method, Account

---

### Lent & Debt Module

**Person list view:**
- Two tabs: "They Owe Me" (Lent) and "I Owe Them" (Debt), plus "Summary" and "Payment logs" tabs
- Each person card shows: name, relationship badge, outstanding amount(s), status
- Status: ⏳ Pending / 🔄 Partial / ✅ Settled — computed per (person, Lent-or-Debt), not per entry
- A person with BOTH outstanding Lent and outstanding Debt shows both amounts and gets two
  independent action buttons ("Collect" for Lent, "Pay" for Debt) — the two directions are never
  netted together
- "Add entry" button → QuickLedgerEntry form: pick/create person + amount + date + reason, etc.

**Ledger entry (one event = one row):**
- One person can have MULTIPLE ledger entries over time per type (full timeline)
- Each entry: amount, date, reason, payment method, account, optional doc link
- Entries are a pure historical record — they do NOT carry their own remaining/status (see
  Payment tracking below); editing/deleting one entry only affects that entry's `total_amount`
  contribution to the aggregate, never a payment record

**Person detail page:**
- Hero section: person name, relationship, net position, Collect/Pay buttons (type-aware)
- Stat cards per type: total, event count, remaining, status, "Overpaid by ৳X" badge if applicable
- Timeline tab: clean list of lend/debt entry cards (amount, date, reason, method, Edit + Delete)
  — no per-entry payment sub-list; payments aren't attributed to a specific entry
- Payments tab: unified chronological history per (person, type) — every entry AND every payment
  interleaved by date with a running balance column, so it's visible exactly why the balance
  changed at each point

**Payment tracking (redesigned in Phase 3.6 — see Decisions Log):**
- `ledger_payments` rows attach to `(person_id, ledger_type)`, not to one `person_ledger` row
- Aggregate remaining for a (person, type) = SUM(that type's entries' `total_amount`) −
  SUM(that type's payments' `amount`), clamped to a minimum of 0
- Status: `remaining === 0` → Settled, `paid > 0` → Partial, else → Pending (null if no entries)
- If payments exceed the total (e.g. an entry was edited/deleted after being paid down), the
  surplus is surfaced as "Overpaid by ৳X" rather than going negative or blocking the edit

**Debt ↔ Investment link (Phase 4 — not built):**
- `person_ledger` may get an optional `investment_id FK` column in Phase 4
- UI: when creating a ledger entry, optional "This debt funds an investment" dropdown
- Keep simple — just a link, no complex calculations

**Export:**
- Per person: their full timeline + all payments as Excel
- All persons: summary sheet + individual sheets per person

---

### Analytics Module

**Charts to build (all using Recharts):**

1. **Monthly trend line** — last 12 months, expense line + income line
2. **Category donut** — for selected month, top 8 categories + "Others"
3. **Budget vs actual bars** — horizontal bars, one per category with limit set
4. **No-spend calendar heatmap** — current month, color-coded by spend amount
5. **Payment method split** — pie chart (Cash / bKash / Card / Bank Transfer)
6. **Daily spend bar chart** — for selected month, one bar per day

**Dashboard widgets (not full charts, just KPI cards):**
- Total spent this month
- vs last month (% change, colored arrow)
- Biggest category this month
- No-spend streak (days)
- Total outstanding lent
- Total outstanding debt
- Net position (lent − debt)

---

### Data Export (global)

**Available from:** Settings page AND individual module pages

**Export formats:**
- Excel (.xlsx) — multiple sheets
- CSV — flat file

**Excel export structure (full export):**
```
Sheet 1: Transactions (all time)
Sheet 2: Category Summary (by month)
Sheet 3: Monthly Summary
Sheet 4: Persons
Sheet 5: Ledger Entries
Sheet 6: Ledger Payments
```

---


---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-04-25 | Use `.tsx` exclusively, never `.jsx` | TypeScript-first for finance app safety |
| 2026-04-25 | React 19 + Vite 6 (not Next.js) | Client-side SPA, Supabase handles API layer |
| 2026-04-25 | Tailwind v4 (CSS-first config) | No config file needed, faster builds |
| 2026-04-25 | TanStack Router v2 (not React Router) | Type-safe routing, better TS integration |
| 2026-04-25 | Person-based ledger (not loan-ID-based) | Simpler for user, full timeline per person |
| 2026-04-25 | Multiple ledger entries per person | Preserves full history, better analytics |
| 2026-04-25 | Supabase soft-delete (30 day window) | User data safety, allows recovery |
| 2026-04-25 | Demo mode via Zustand (not fake Supabase) | No DB reads/writes for demos, instant |
| 2026-04-27 | QuickLedgerEntry: person + entry in one form | Eliminates "add person then add entry" two-step; new persons created inline |
| 2026-04-27 | CategoryCombobox: replaces native `<select>` | Search + grouped results + inline new-category creation with group typeahead |
| 2026-04-27 | Investment tracker built in Phase 2 (not Phase 1.5) | Scope control; Phase 1 expenses + ledger must be solid first |
| 2026-04-27 | Google OAuth redirectTo = window.location.origin (not /dashboard) | /dashboard is protected; the PKCE code gets stripped before exchange if routed there directly |
| 2026-04-27 | beforeLoad returns early when loading=true | Defers auth redirect to getSession() callback; prevents reload-to-dashboard issue |
| 2026-04-25 | Phase 2 for investments | Scope control — expenses + ledger first |
| 2026-04-25 | Doc links (not file upload) | Open source — user controls their storage |
| 2026-04-25 | Coffee as separate main_group | Owner tracks this separately for habit monitoring |
| 2026-04-25 | pnpm (not npm/yarn) | Faster installs, better disk usage |
| 2026-07-01 | Groq key stays BYOK/client-side (no Edge Function proxy) | It's the user's own key for their own use in a self-hosted open-source app; the risk is local (XSS/device access), not a shared-secret leak. Building a proxy was assessed and rejected during the post-audit fix pass — this CLAUDE.md previously contradicted itself on this point (see Phase 3.5) |
| 2026-07-01 | Removed `no_spend_flag` column from `transactions` | Dead column — always written `false`, never read; `useNoSpendStreak.ts` already computes the streak dynamically from `txn_date`s |
| 2026-07-01 | Post-audit bug-fix pass (see Phase 3.5) | A full codebase audit found several Phase 2/3 features were shipped with schema mismatches (`investment_payments` missing entirely, `investment_returns` missing columns its own form submitted) and other logic/UX bugs — fixed in `002_investment_fixes.sql` + accompanying code changes |
| 2026-07-01 | Ledger payments moved from per-entry (`ledger_id` FK) to aggregate (`person_id` + `ledger_type`) (see Phase 3.6) | Matches the actual user mental model — a running balance per person/direction, not "which specific loan does this payment retire". Root-caused several reported bugs at once (wrong Pay-button prefill, Lent/Debt payment mismatch, incoherent payment history) rather than patching each symptom |
| 2026-07-01 | Lent and Debt balances for the same person are never netted | User explicitly wants to track "I owe them" and "they owe me" independently even when both exist for one person — netting would hide which direction a payment should apply to |
| 2026-07-02 | Schema-doc correction: the profile table is `profiles`, not `users` | `001_initial_schema.sql` (source of truth) has always named it `profiles`; this file had documented it as `users` since Phase 1, an undetected drift. All `REFERENCES` in the schema section corrected |
| 2026-07-02 | Multi-currency: lightweight (provenance columns), not a full currency-aware app | User chose the lightweight option — `transactions.amount` always stays in the profile's default currency, `original_amount`/`original_currency` just record what was typed. Means zero changes needed to any existing aggregate, chart, or AI-context function |
| 2026-07-02 | FX rates from open.er-api.com, not Frankfurter/ECB, and not AI-estimated | Frankfurter (first choice) doesn't publish BDT rates since it's ECB-only; open.er-api.com is free, keyless, and covers BDT. An LLM was explicitly ruled out for rates — Groq has no live market data and would produce plausible-but-wrong numbers, unacceptable for a finance app |
| 2026-07-02 | Notifications: email via Resend + Supabase Edge Function + `pg_cron`, not Web Push | No push/service-worker infra existed yet; email reaches the user even if they never reopen the app, and reuses the same trigger (Edge Function + cron) that Web Push would need anyway. Web Push deferred to Phase 5 as an additive channel on top of this infra, not a replacement |
| 2026-07-02 | `PersonManagementPanel` (People) and `DataSettingsPage` (Data Preferences) converted from slide-over panels to full pages (`/ledger/people`, `/settings/data`) | Both were cramped at scale (15+ people; several category groups) and duplicated KPIs already shown elsewhere. Full pages give room for tabs/filters without a fixed-width overlay constraint |
| 2026-07-02 | Multi-currency reverted (see Phase 4 bullet) — `006_remove_currency_conversion.sql` drops `original_amount`/`original_currency` again | After shipping it, a live test showed a small (~0.06%) gap between our free daily-rate source and another site's rate. The gap itself was traced and confirmed *not* a bug — the conversion math was correct, free daily-rate APIs just aren't millisecond-fresh — but decided the added complexity (rate fetching, caching, a second currency field on every form) wasn't worth carrying for a free/open-source app. `CURRENCIES` (the profile display-currency list) stays; only the conversion machinery was removed |
| 2026-07-02 | Card and Bank Transfer's account lists merged into one shared list (`BANK_ACCOUNTS` / `lib/paymentMethodPrefs.ts`), and every payment-method/account entry (built-in or custom) became reorderable/renameable/removable, not just custom ones | Found on inspection that `Card.accounts` and `'Bank Transfer'.accounts` were the literal same array duplicated in `constants.ts` — no reason to make a user maintain "BRAC Bank Savings" as two separate entries. Kept `payment_method` itself ('Card' vs 'Bank Transfer') distinct — that's a different, already-used field (filters, historical data) unaffected by merging the account list underneath it. Built-ins were previously a protected, unremovable subset in Data Preferences even though users may not want e.g. every listed bank — removed that restriction |
| 2026-07-02 | `CRON_SECRET` for the notification cron jobs is stored in Supabase Vault (`vault.create_secret`), referenced by name from `cron.schedule()`, never written as plaintext into a committed migration | FinTrack is a public open-source repo — a secret literal in `005_schedule_notification_crons.sql` would leak to anyone cloning it. The one-time `vault.create_secret(...)` call with the real value is a manual step (documented in that migration's header comment), intentionally kept out of any file |
| 2026-07-06 | Inline expression evaluation (Phase 5) hand-rolled in `lib/calculator.ts` rather than adding a math-expression-parsing dependency (mathjs, expr-eval, etc.) | The grammar needed (`+ - * / ( ) %`, standard precedence) is small enough that a ~150-line tokenizer + recursive-descent parser is simpler to audit than vetting a new dependency, and it deliberately avoids `eval()`/`new Function()` in a financial app |
| 2026-07-06 | Inline expression entry (Phase 5) shipped on `ExpenseForm.tsx`'s Amount field only, not all 6+ amount inputs app-wide | Scoped down with the user up front — `SmartAmountInput` is built as a standalone component specifically so the other forms (ledger, investment) can adopt it later without rework, but this pass stays focused on the one field that prompted the request |
| 2026-07-06 | `uiStore.ts`'s `sidebarOpen` default changed from `true` to `false` (Phase 5, found during browser-testing the new calculator FAB) | Pre-existing, unrelated to the calculator: the flag only gates the mobile drawer transform (confirmed via CSS that desktop ignores it entirely), so it defaulting `true` meant the mobile sidebar rendered open-over-content on every fresh page load until a nav link was tapped — which incidentally also hid the new FAB behind it. Fixed at the root since it was a one-line, fully-understood change with no desktop impact |
| 2026-07-08 | UI retheme: navy/purple → Emerald & Gold (muted, dark-first); shield logo; card gradient-borders (see Phase 6) | User disliked the indigo/violet accent and found bright accents eye-straining. New palette desaturates accents and drops purple entirely; kept token names so the swap was non-breaking. Default cards stay solid-border (recolored for free via tokens); the new gradient-border classes are opt-in, reserved for one featured card per view. New static shield logo (security + growth) replaces the ad-hoc "৳" placeholder box that existed in 4 separate places |
| 2026-07-08 | `CHART_COLORS`/`RELATIONSHIP_COLORS`/`AIHub` accents use curated literal hex, not `var(--accent-*)` tokens (see Phase 6) | The new palette intentionally collapses `accent-teal`→`accent-primary` and `accent-amber`→`accent-gold`; fine for single-value usage, but silently merges two categories into one indistinguishable color in a legend/badge context. These three spots specifically need guaranteed-distinct hues, so they're the deliberate exception to "always reference tokens" |
| 2026-07-08 | Demo-mode mutation guards centralized inside each hook's `mutationFn` (new `useDemoGuard()`), not left as ad-hoc `if (isDemo)` checks at each call site (see Phase 6) | The old convention (checked at the caller, before calling `mutate()`) was silently inconsistent — it existed at some call sites and not others, and the entire Investments module had none at all, so those mutations fired real unauthenticated Supabase calls in demo mode. A hook-level guard can't be forgotten by a future caller the way a per-component check can |
| 2026-07-08 | `useCreateExpense`'s demo-mode branch persists to `demoStore.transactions` in-memory instead of blocking like every other mutation (see Phase 6) | Deliberate one-item exception: expense creation is the single most-tried interaction in a demo of a finance app. Faking a "saved" toast with nothing actually appearing (the pre-Phase-6 behavior) was worse than either blocking consistently or actually working — chose "actually works," scoped to just this one entity, in-memory only, lost on exit/reload |
| 2026-07-08 | New `ToastContainer` mounted at `App.tsx` root (sibling to the routed `Outlet`), not inside `AppShell` (see Phase 6) | `useUIStore`'s toast system had existed with zero renderer for an unknown number of prior phases — every `addToast()` call anywhere in the app, including every existing "not saved" guard, silently updated Zustand state with nothing subscribed to show it. Root-mounting (rather than inside the authenticated app shell) makes it survive route navigation, which matters since several delete flows `mutate()` then immediately `navigate()` away from the triggering page |

---

## Open Questions (resolve before building)

- [ ] **App name:** "FinTrack" is a placeholder — check GitHub for name conflicts
- [x] **BDT only or multi-currency from day 1?** Resolved in Phase 4 — tried lightweight multi-currency, reverted the same day after a live-accuracy check (see Decisions Log, 2026-07-02). App is BDT-only (with the pre-existing `profile.currency` display preference) until/unless multi-currency is revisited
- [ ] **Recurring transactions?** (e.g. YouTube Premium ৳85/month) — common in your data, consider for Phase 5
- [x] **Notification emails?** Resolved in Phase 4 — budget/weekly/monthly emails via Resend + a Supabase Edge Function on `pg_cron` (see Decisions Log, 2026-07-02)
- [ ] **GitHub username** for repo URL in README

---

