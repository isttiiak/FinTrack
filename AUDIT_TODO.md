# FinTrack — Strict Security Audit, Bug Verification & Phased Remediation Plan

> **Audit Scope:** Application Security, Database Schema & RLS, Financial Logic & Data Integrity, Auth & Session Lifecycle, Build/DevOps/CI, Accessibility (a11y) & UI/UX, and Feature Enhancements.  
> **Audit Status:** All 44 original items **verified & justified** against the live codebase + **18 additional critical/high/medium bugs uncovered** during deep code & schema inspection (62 total tracked items).  
> **How to use this file in a new session:** Reference a specific phase (e.g. _"Execute Phase 1 and Phase 2 of `@[AUDIT_TODO.md]`"_) and check off `- [x]` items as they are completed and verified.

---

## Executive Summary of Findings

| Severity               | Original | Newly Found | Total  | Key Themes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | -------- | ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Critical**           | 6        | 4           | **10** | PostgreSQL `CHECK` constraints reject built-in `'Dutch Bangla Bank'` & custom MFS/bank/relationship values; `javascript:` XSS in `doc_link` / `avatar_url`; orphaned `ledger_payments` on Lent/Debt deletion; `SmartAmountInput` submits stale/partial numbers on invalid math expressions (`100+`, `500/0`); `PaymentMethodPicker` value-reset & hidden validation failure across 6 forms; `getMethodGroup` breaks custom MFS on edit; unconfirmed/unawaited investment delete; broken ESLint v9 config; `ExpensesPage` stale `useMemo` deps                                                                                                                      |
| **High**               | 12       | 6           | **18** | Soft-deleted accounts (`deleted_at`) can still sign in & mutate data; missing `PASSWORD_RECOVERY` auth event handler; `profile.currency` ignored across entire app/AI/Edge Function; `useNoSpendStreak` returns 1–2 day streak on 0 transactions & filtered month; `ExpensesPage` budget bars break when filters are active; unvalidated `NaN` inline edits & missing CSS in `InvestmentDetailPage`; PostgREST 1,000-row silent truncation; Edge Function HTML injection & non-constant-time `CRON_SECRET` auth; missing `vercel.json` CSP/security headers; `supabase/.temp/` tracked in git; 2.07 MB unsplit JS bundle (near Workbox 2 MiB cache drop threshold) |
| **Medium**             | 14       | 7           | **21** | `Sidebar` avatar ternary precedence bug always shows `'D'`; double `৳৳` symbol in `InvestmentPaymentForm`; `QuickLedgerEntry` duplicate person creation on retry & `onChange` override; `useAICategorySuggest` race condition; `ProfilePage` async profile form sync; `exportFullExcel` omits investments; `usePerson` `.single()` error on missing ID; `AIHub` & `AppShell` raw `<a href>` reloads; `seed_default_categories` missing unique constraint; `purge_deleted_users` unscheduled; modal focus/Escape a11y                                                                                                                                               |
| **Low / Enhancements** | 12       | 1           | **13** | External `xlsx` tarball; CSV formula injection; `uiStore` toast timer leak; Vitest suite; search & filters; account transfers; recurring transactions; valuation history; full demo mode CRUD                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

---

## Part 1 — Verification & Justification of Existing + Newly Discovered Issues

### A. Security & Authentication Vulnerabilities

1. **[Critical — Verified + Expanded] Unvalidated `doc_link` and `avatar_url` schemes (`javascript:` / `data:` XSS)**
   - **Evidence:**
     - `src/components/ledger/LedgerEntryForm.tsx:22`, `src/components/ledger/QuickLedgerEntry.tsx:28` _(newly found)_, `src/components/investments/InvestmentForm.tsx:21`, and `src/pages/ProfilePage.tsx:26` _(newly found)_ all validate URLs using `z.string().url()`.
     - Zod's `.url()` uses `new URL()`, which accepts `javascript:alert(document.domain)`, `data:text/html,...`, and `vbscript:`.
     - `src/pages/InvestmentsPage.tsx:226`, `src/pages/InvestmentDetailPage.tsx:123`, and `src/pages/PersonDetailPage.tsx:273` render `<a href={inv.doc_link}>` / `<a href={entry.doc_link}>` directly into the DOM.
   - **Remediation:** Create `isSafeHttpUrl(value)` in `src/lib/utils.ts` allowing only `http:` and `https:` protocols; enforce it in all Zod schemas and guard `<a href>` / `<img src>` rendering.

2. **[High — Verified] Missing HTTP security headers in `vercel.json`**
   - **Evidence:** `vercel.json:1-5` contains only SPA `rewrites`. No `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, or `Permissions-Policy` headers are served.

3. **[High — Verified] HTML Injection in `notifications` Edge Function emails + hardcoded `৳` currency**
   - **Evidence:** `supabase/functions/notifications/index.ts:84-93, 126-139, 175-188` interpolates user-editable `categories.name` directly into HTML (`<strong>${categoryName}</strong>`, `<li>${name}: ...</li>`) and email subjects without escaping. Additionally _(newly found)_, line 24 hardcodes `formatBDT()` (`৳`) for all users instead of respecting `profiles.currency`.

4. **[High — Verified] Non-constant-time `CRON_SECRET` comparison & unsafe non-null env assertions in Edge Function**
   - **Evidence:** `supabase/functions/notifications/index.ts:16-20, 200-203` uses `Deno.env.get('CRON_SECRET')!` and `if (authHeader !== \`Bearer \${CRON_SECRET}\`)`. If `CRON_SECRET`is unset in the environment,`Authorization: Bearer undefined`passes authentication; string`!==` is also vulnerable to timing side-channels.

5. **[High — Newly Found] Soft-deleted accounts (`deleted_at IS NOT NULL`) can sign back in and use the app without restriction or restore flow**
   - **Evidence:**
     - `src/pages/SettingsPage.tsx:668-673` soft-deletes an account by setting `profiles.deleted_at = new Date().toISOString()` and signing out, promising a "30-day recovery window" (line 733).
     - However, `src/App.tsx:55-62` (`loadProfile`) fetches `profiles` without checking `deleted_at`, and `supabase/migrations/001_initial_schema.sql:23-24` has no `deleted_at IS NULL` check in RLS.
     - If a soft-deleted user signs in during the 30-day window, the app lets them use FinTrack normally while `deleted_at` remains set—meaning `purge_deleted_users()` will still permanently wipe their account and newly added data when the 30 days expire!
   - **Remediation:** Detect `profile.deleted_at != null` on session load in `src/App.tsx` and show a dedicated "Account Scheduled for Deletion" recovery screen allowing the user to either **Restore Account** (clearing `deleted_at = null`) or **Sign Out**.

6. **[High — Newly Found] Missing `PASSWORD_RECOVERY` auth event handling in `App.tsx` & broken post-reset navigation in `ResetPasswordPage.tsx`**
   - **Evidence:**
     - `src/App.tsx:86-101` only handles `SIGNED_IN` and `SIGNED_OUT`. If a Supabase recovery link redirects to `/` (fallback site URL), `SIGNED_IN` fires while on `/` (`AUTH_PATHS.includes('/')`) and redirects the user to `/dashboard` instead of `/reset-password`.
     - `src/pages/auth/ResetPasswordPage.tsx:82-88` renders a "Back to sign in" button (`navigate({ to: '/login' })`) while the recovery session is still active; `loginRoute.beforeLoad` (`src/App.tsx:167`) immediately redirects active sessions to `/dashboard`.
   - **Remediation:** Handle `if (event === 'PASSWORD_RECOVERY') router.navigate({ to: '/reset-password', replace: true })` in `src/App.tsx`, and either sign out after password update or navigate directly to `/dashboard` on `ResetPasswordPage.tsx`.

7. **[Medium — Verified] React Query cache and `authStore` profile not cleared on sign-out**
   - **Evidence:** `src/App.tsx:87, 98-100` calls `setSession(session)` (which only updates `session` and `user` in `src/stores/authStore.ts:21`, leaving `profile` populated!) and never calls `queryClient.clear()`. If User B logs in after User A on the same tab, User A's cached queries (`['expenses']`, `['persons']`, `['investments']`) and `profile` remain in memory until refetched.

8. **[Medium — Verified] Client-side Groq API key storage & raw prompt interpolation**
   - **Evidence:** `src/lib/groq.ts:4-6` reads `localStorage.getItem('groq_api_key')`, which is never cleared on sign-out or account deletion (`SettingsPage.tsx:664-678`). `src/hooks/useAICategorySuggest.ts:26` and `src/components/ai/AIHub.tsx:286` interpolate user input directly into prompts without structural delimiters.

9. **[Low — Verified] External `xlsx` tarball in `package.json` & CSV formula injection in `export.ts`**
   - **Evidence:** `package.json:40` installs `xlsx` from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. `src/lib/export.ts:5-37, 49-105` exports user descriptions/notes without neutralizing leading `=`, `+`, `-`, `@`, `\t`, `\r` formula characters.

---

### B. Database Schema, Migrations & Supabase

10. **[Critical — Verified] PostgreSQL `CHECK` constraint violations on `payment_method` and `account` across all 5 financial tables**
    - **Evidence:**
      - `supabase/migrations/001_initial_schema.sql` (lines 96–102, 144–150, 172–178) and `002_investment_fixes.sql` (lines 26–32, 48–56) restrict `account` to `('Cash', 'bKash', 'Nagad', 'Rocket', 'BRAC Bank Savings', 'Prime Bank', 'Islami Bank', 'Other')` and `payment_method` to `('Cash', 'MFS - bKash', 'MFS - Nagad', 'MFS - Rocket', 'Bank Transfer', 'Card')`.
      - `src/lib/constants.ts:57, 67` includes `'Dutch Bangla Bank'` as a built-in default bank account!
      - `src/components/common/PaymentMethodPicker.tsx:67-83` and `src/pages/DataSettingsPage.tsx:445-510` allow users to add custom MFS providers and custom bank accounts.
      - Any transaction, ledger entry, ledger payment, investment payment, or investment return using `'Dutch Bangla Bank'` or any custom MFS/bank account fails with PostgreSQL error `23514` (`check_violation`).

11. **[Critical — Verified] PostgreSQL `CHECK` constraint violation on `persons.relationship`**
    - **Evidence:** `supabase/migrations/001_initial_schema.sql:120-122` restricts `relationship` to 6 hardcoded strings, while `src/components/ledger/PersonForm.tsx:86-98` and `src/components/ledger/QuickLedgerEntry.tsx:311-328` provide a `"Custom"` text input (`"e.g. Cousin, Mentor, Neighbour…"`). Submitting any custom relationship fails at the DB level.

12. **[Critical — Newly Found] Orphaned `ledger_payments` when deleting Lent/Debt entries in `SettingsPage` Danger Zone or `PersonDetailPage`**
    - **Evidence:**
      - Migration `003_ledger_aggregate_payments.sql` removed `ledger_id` from `ledger_payments` and attached payments to `(person_id, ledger_type)` (`REFERENCES public.persons(id) ON DELETE CASCADE`).
      - In `src/pages/SettingsPage.tsx:642-650` (`DangerSection.handleDeleteLogs`), clicking **"Delete lent entries"** or **"Delete debt entries"** only deletes from `person_ledger` (`supabase.from('person_ledger').delete().eq('user_id', userId!).eq('ledger_type', 'Lent')`) and **never deletes matching rows from `ledger_payments`**!
      - Similarly, deleting all `'Lent'` or `'Debt'` entries for a person in `src/pages/PersonDetailPage.tsx:49-52` leaves `ledger_payments` rows behind.
      - In `src/hooks/useLedger.ts:26-38` (`aggregateForType`), orphaned payments with `entries.length === 0` cause `overpaid = paid`, keep ghost rows in `LedgerPaymentLogs`, and automatically subtract from any future loan created for that person!
    - **Remediation:**
      1. In `SettingsPage.tsx` (`handleDeleteLogs`), also delete from `ledger_payments` for the corresponding `ledger_type` (`Lent` or `Debt`) and invalidate `['person']` as well as `['persons']`.
      2. Add a database trigger (or clean up in `useDeleteLedgerEntry`) so that when the last `person_ledger` row for a `(person_id, ledger_type)` is deleted, associated `ledger_payments` for that `(person_id, ledger_type)` are also cleaned up (or prompted).

13. **[High — Verified] Silent 1,000-row data truncation in PostgREST queries**
    - **Evidence:** `src/hooks/useExpenses.ts:31-46`, `src/hooks/useLedger.ts:90-108`, `src/hooks/useInvestments.ts:40-45`, and `supabase/functions/notifications/index.ts:62-67, 117-120, 165-168` execute unbounded `.select()` queries. PostgREST silently truncates responses at 1,000 rows, corrupting all-time exports, yearly totals, streaks, and ledger balances once a user passes 1,000 records.

14. **[High — Verified] RLS policies missing explicit `WITH CHECK` & `budget_alert_log` grants**
    - **Evidence:** All 9 user tables in `001_initial_schema.sql`, `002_investment_fixes.sql`, and `003_ledger_aggregate_payments.sql` use `FOR ALL USING (...)` without explicit `WITH CHECK (...)`. `budget_alert_log` (`004_currency_and_notifications.sql:27-38`) has RLS enabled with no policies; revoking privileges from `anon, authenticated` makes service-role-only access explicit.

15. **[Medium — Verified] `seed_default_categories` `ON CONFLICT DO NOTHING` has no backing `UNIQUE` constraint**
    - **Evidence:** `supabase/migrations/001_initial_schema.sql:54-63, 242-269` defines `categories` without `UNIQUE (user_id, name, type)`, so `ON CONFLICT DO NOTHING` only checks `id` (which is a fresh `gen_random_uuid()`), inserting duplicate default categories if invoked more than once.

16. **[Medium — Verified] `purge_deleted_users()` is never scheduled in `pg_cron`**
    - **Evidence:** `001_initial_schema.sql:274-288` defines `public.purge_deleted_users()`, but `005_schedule_notification_crons.sql` only schedules the 3 email jobs. Soft-deleted accounts are never purged after 30 days.

17. **[Medium — Verified] `useUpdateCategory` / `useDeleteCategory` missing `.eq('user_id', userId!)` & `useBudgets` missing `guardDemo()` + error toasts**
    - **Evidence:** `src/hooks/useCategories.ts:70, 89` omit `.eq('user_id', userId!)`. `src/hooks/useBudgets.ts:27-60` (`useUpsertBudget`, `useDeleteBudget`) never call `guardDemo()` and have no `onError` toast handlers.

---

### C. Financial Logic, Forms & Data Integrity Bugs

18. **[Critical — Newly Found] `SmartAmountInput` silently submits partial/stale numbers when the user submits an incomplete or invalid expression**
    - **Evidence:** `src/components/common/SmartAmountInput.tsx:47-58`:
      ```ts
      function commit(text: string) {
        const result = evaluate(text)
        if (result.ok) { ... onChange(rounded) }
        else if (result.reason === 'empty') { ... onChange(undefined) }
        // 'invalid' | 'div-by-zero': leave the last committed value alone
      }
      ```
      When a user types `100`, `onChange(100)` is emitted. If they continue typing `100+` or `100/0` and press Enter (submitting `ExpenseForm`), `evaluate('100+')` returns `{ ok: false, reason: 'invalid' }`, leaving `field.value` at `100`. Zod sees `100` (a valid positive number) and saves the transaction with the wrong amount!
    - **Remediation:** Emit `undefined` (or `NaN`) to `onChange` whenever `result.ok === false` so that incomplete expressions (`100+`) or division by zero (`100/0`) fail form validation on submit while `rawText` preserves what the user is typing in the input box.

19. **[Critical — Newly Found] `PaymentMethodPicker` integration across all 6 forms either forces `'Cash'` on `undefined` or fails validation silently with no error message**
    - **Evidence:**
      - `src/components/ledger/LedgerEntryForm.tsx:153-154`, `src/components/ledger/PaymentForm.tsx:110-111`, `src/components/ledger/QuickLedgerEntry.tsx:401-402` pass:
        `onMethodChange={(m) => setValue('payment_method', m ?? 'Cash')}` and `onAccountChange={(a) => setValue('account', a ?? 'Cash')}`.
      - `src/components/investments/InvestmentPaymentForm.tsx:132-133` and `src/components/investments/ReturnForm.tsx:122-123` pass `v ?? lastMethod` and `v ?? lastAccount`.
      - Whenever the user clicks `📱 MFS`, `💳 Card`, `🏦 Bank Transfer`, or `None` in `PaymentMethodPicker` (`src/components/common/PaymentMethodPicker.tsx:46-57`), the picker passes `undefined` to clear the sub-selection, and those 5 forms immediately overwrite `undefined` with `'Cash'` or `lastMethod`!
      - Furthermore, `PaymentMethodPicker` has a `"None"` chip (`line 93`), and the DB columns are nullable, yet all 6 forms require `payment_method: z.string().min(1)` and `account: z.string().min(1)` in Zod **and none of the 6 forms render `errors.payment_method` or `errors.account` in the UI** (`ExpenseForm.tsx:237-255`). Clicking "Save" in `ExpenseForm` after selecting `"None"` (or selecting `"MFS"` without a provider, or `"Card"` without a bank) silently blocks submission with zero error feedback!
    - **Remediation:**
      1. Pass `setValue('payment_method', m ?? '', { shouldValidate: true })` / `setValue('account', a ?? '', { shouldValidate: true })` (without `?? 'Cash'` fallback) in all forms.
      2. Either allow `"None"` (`optional()` / `nullable()` when group is `None`) or remove the `"None"` chip if payment method is mandatory, and display validation errors (`errors.payment_method` / `errors.account`) directly inside `PaymentMethodPicker`.

20. **[Critical — Newly Found] `getMethodGroup()` in `constants.ts` fails for all custom MFS providers**
    - **Evidence:** `src/lib/constants.ts:99-105` checks `(cfg.methods as readonly string[]).includes(method)` against the static `PAYMENT_METHOD_GROUPS`. Custom MFS providers are stored as `'MFS - <Name>'` in `localStorage` (`PaymentMethodPicker.tsx:70`, `DataSettingsPage.tsx:488`). When editing a transaction that used a custom MFS provider (or when `lastMethod` is a custom MFS provider), `getMethodGroup(method)` returns `null`, so `PaymentMethodPicker` highlights `"None"` instead of `"📱 MFS"`!
    - **Remediation:** Update `getMethodGroup()` in `src/lib/constants.ts` to also return `'MFS'` when `method.startsWith('MFS - ')`.

21. **[Critical — Verified] Stale `useMemo` dependency in `ExpensesPage.tsx` & filter-corrupted Budget Progress bars**
    - **Evidence:**
      - `src/pages/ExpensesPage.tsx:66-81` computes `totalExpense`, `totalIncome`, and `categorySpend` from `transactions`, but declares `[displayedTransactions]` as its dependency array.
      - Additionally _(newly found)_, `transactions` on `ExpensesPage.tsx:42-48` is filtered by `typeFilter` and `methodFilter` at the query level. When a user filters by `Type = Income` or `Payment Method = Cash`, `categorySpend` (lines 74, 83–86) only sums the filtered subset, causing the monthly `BudgetIndicator` progress bars to drop to `৳0` or show false partial spending!
    - **Remediation:** Fix the `useMemo` dependency array to `[transactions]`, and compute `categorySpend` for `budgetsWithSpend` from an unfiltered month query (or filter `typeFilter`/`methodFilter` client-side from the month query so full-month budget progress and streak stay accurate).

22. **[Critical — Verified] Unconfirmed, unawaited investment deletion in `InvestmentDetailPage.tsx`**
    - **Evidence:** `src/pages/InvestmentDetailPage.tsx:140-145` executes `onClick={() => { deleteInvestment(inv.id); navigate({ to: '/investments' }) }}` with no confirmation dialog, cascading to delete all `investment_payments` and `investment_returns`, and navigating away before the mutation resolves (even in demo mode or on network error).

23. **[High — Newly Found] `profile.currency` setting is completely ignored across the entire app**
    - **Evidence:**
      - `src/pages/ProfilePage.tsx:165-169` lets users choose their currency (`BDT`, `USD`, `EUR`, `GBP`, `SGD`, `AED`, `INR`) and saves it to `profiles.currency`.
      - However, `src/lib/utils.ts:8` defines `export function formatCurrency(amount: number, currency = 'BDT'): string`, and **no component or page in the entire codebase passes `profile?.currency` to `formatCurrency()` or `<AnimatedNumber />`**!
      - `src/components/common/AnimatedNumber.tsx:14-17` only prepends `৳` for `'BDT'` and formats other currencies as plain numbers without any currency symbol, while stripping decimals (`maximumFractionDigits: 0`).
      - `src/pages/AnalyticsPage.tsx:21-25, 556` hardcodes `৳` in `fmtK` and calendar tooltips; `src/lib/aiContext.ts` hardcodes default `formatCurrency(v)`; `supabase/functions/notifications/index.ts:24` hardcodes `formatBDT`.
    - **Remediation:** Default `currency` in `formatCurrency()` and `AnimatedNumber` to `useAuthStore.getState().profile?.currency ?? 'BDT'`, add a `getCurrencySymbol(currency)` helper for form labels and `fmtK`, and use `Intl.NumberFormat` in `AnimatedNumber` and the Edge Function.

24. **[High — Verified + Expanded] `useNoSpendStreak` returns 1–2 days for brand-new users with 0 transactions, parses `earliest` as UTC, and is called on filtered transactions in `ExpensesPage`**
    - **Evidence:**
      - `src/hooks/useNoSpendStreak.ts:17-20`: When `transactions` is `[]`, `earliest` is `toISODateString(today)`, `new Date(earliest)` parses as UTC midnight (`06:00 AM` in `Asia/Dhaka`), and `maxDays = Math.ceil((today.getTime() - new Date(earliest).getTime()) / 86400000) + 2` evaluates to `3` (or `2`), returning a **2-day (or 1-day) no-spend streak for an empty account**!
      - Even when transactions exist, `+ 2` iterates past `earliest`, counting days before the user's first transaction.
      - `src/pages/ExpensesPage.tsx:51` passes single-month/filtered `transactions` to `useNoSpendStreak(transactions)` instead of all-time transactions.

25. **[High — Newly Found] Unvalidated inline payment/return edits & missing CSS classes in `InvestmentDetailPage.tsx`**
    - **Evidence:**
      - `src/pages/InvestmentDetailPage.tsx:283-291` and `370-380` pass `amount: parseFloat(paymentEditDraft.amount)` and `payment_date: paymentEditDraft.payment_date` directly to `updatePayment` / `updateReturn` without checking `isNaN(amount) || amount <= 0 || !payment_date`, and close the edit form (`setEditingPaymentId(null)`) without awaiting the mutation.
      - Classes `.idp-row-edit-btn`, `.idp-inline-edit`, `.idp-inline-input`, `.idp-inline-actions`, `.idp-inline-save`, `.idp-inline-cancel`, and `.idp-action-delete` used on lines 141, 254, 264–294, 332, 342–384 have **no CSS rules** in `InvestmentDetailPage.tsx` or `globals.css`!

26. **[High — Verified] CSV Import lacks `Type`, `Payment Method`, and `Account` validation & batching**
    - **Evidence:** `src/pages/SettingsPage.tsx:322-344` coerces any `Type !== 'Income'` (including lowercase `'income'`) to `'Expense'`, passes unvalidated `Payment Method` and `Account` values to Supabase, and inserts all rows in a single `.insert(txns)` call.

27. **[Medium — Newly Found] `Sidebar.tsx` operator precedence bug causes user avatar fallback to always render `'D'`**
    - **Evidence:** `src/components/layout/Sidebar.tsx:142` writes:
      `<span>{(profile?.full_name ?? isDemo ? 'D' : '?')[0].toUpperCase()}</span>`
      Because `??` has higher precedence than `? :`, JavaScript evaluates `(profile?.full_name ?? isDemo) ? 'D' : '?'`. Whenever a signed-in user has a non-null `profile.full_name`, the condition is truthy and evaluates to `'D'` instead of the first letter of their name!

28. **[Medium — Newly Found] Double currency symbol `৳৳` in `InvestmentPaymentForm.tsx`**
    - **Evidence:** `src/components/investments/InvestmentPaymentForm.tsx:99` writes `<p className="ipf-remaining">৳{formatCurrency(remaining)} remaining to pay</p>`. Since `formatCurrency()` already prefixes `৳`, this renders `৳৳3,00,000 remaining to pay`.

29. **[Medium — Verified + Expanded] `PersonForm.tsx` and `QuickLedgerEntry.tsx` custom `onChange` overrides `register()` on relationship `<select>`, plus duplicate person creation on retry**
    - **Evidence:**
      - `src/components/ledger/PersonForm.tsx:100-108` and `src/components/ledger/QuickLedgerEntry.tsx:331-339` _(newly found)_ spread `{...register(...)}` on `<select>` and then define a custom `onChange` after it, overwriting `react-hook-form`'s change handler! Also, selecting `'__custom__'` leaves the field value as `'__custom__'` until the user types in the input.
      - In `QuickLedgerEntry.tsx:128-152` _(newly found)_, `onSubmit` creates a new person via `await createPerson(...)` and then calls `await createEntry(...)`. If `createEntry` fails and the user clicks submit again, `values.person_id` is still `undefined`, creating a duplicate person!

30. **[Medium — Verified] `PaymentMethodPicker.tsx` stale `selectedGroup` state & duplicate custom entries**
    - **Evidence:** `src/components/common/PaymentMethodPicker.tsx:26-28` initializes `selectedGroup` only once on mount and never syncs when `method` prop changes; lines 67–83 (`saveCustomMethod`, `saveCustomAccount`) and `DataSettingsPage.tsx:364-376` append items without deduplication.

31. **[Medium — Verified + Expanded] Raw `<a href>` links in `AIHub.tsx` and `AppShell.tsx` trigger full browser reloads**
    - **Evidence:** `src/components/ai/AIHub.tsx:136` (`<a href="/settings">`) and `src/components/layout/AppShell.tsx:31` (`<a href="/signup">` in demo banner, _newly found_) trigger full document reloads instead of using TanStack Router navigation (and `exitDemo()` before `/signup`).

32. **[Medium — Verified] `InvestmentsPage` / `useInvestments` Net P&L & ROI ignore `market_value` and `InvestmentPaymentForm` lacks overpayment warning**
    - **Evidence:** `src/hooks/useInvestments.ts:15-16` computes `profit_loss = total_returned - committed` without considering `market_value` or `total_paid`. `InvestmentPaymentForm.tsx` does not warn or guard when `amount > remaining`.

33. **[Medium — Verified] `usePerson` uses `.single()` instead of `.maybeSingle()`**
    - **Evidence:** `src/hooks/useLedger.ts:141-147` uses `.single()`, throwing `PGRST116` on non-existent `personId` so `PersonDetailPage.tsx` renders `ErrorBanner` instead of `"Person not found."`.

34. **[Medium — Verified] Missing `numeric(12,2)` upper bound (`9_999_999_999.99`) across amount schemas & `end_date >= start_date` validation in `InvestmentForm.tsx`**
    - **Evidence:** None of the 7 Zod schemas cap amounts at `9_999_999_999.99`, and `InvestmentForm.tsx:18-19` allows `end_date < start_date`. Also _(newly found)_, `InvestmentForm.tsx:124` marks `Committed amount` with a required `<span className="req">*</span>` even though the schema (`line 17`) marks it optional.

35. **[Medium — Newly Found] `ProfilePage.tsx` form does not sync when `profile` finishes loading asynchronously**
    - **Evidence:** `src/pages/ProfilePage.tsx:39-47` passes `defaultValues` from `profile` on mount, but does not pass `values` or call `reset()` in a `useEffect` when `profile` updates in `useAuthStore`.

36. **[Medium — Newly Found] `useAICategorySuggest.ts` race condition on in-flight requests**
    - **Evidence:** `src/hooks/useAICategorySuggest.ts:20-40` only cancels the debounce timer (`clearTimeout`), not the in-flight `groqChat` promise. If the user selects a category while the request is in flight, the resolved promise still sets `suggestedId`.

37. **[Medium — Newly Found] `exportFullExcel` in `src/lib/export.ts` omits Investments, Investment Payments, and Investment Returns**
    - **Evidence:** `src/lib/export.ts:39-105` (`exportFullExcel`) only exports Transactions, Monthly Summary, Persons, Ledger Entries, and Ledger Payments—omitting all 3 Investment tables! Also, `SettingsPage.tsx:757-762` (account deletion export prompt) only exports transactions instead of full account data.

---

### D. Build, Tooling, GitHub & Accessibility

38. **[Critical — Verified via CLI] `pnpm lint` fails immediately (`ESLint: 9.39.4` missing `eslint.config.js`)**
    - **Evidence:** Running `pnpm lint` exits with code 2: `ESLint couldn't find an eslint.config.(js|mjs|cjs) file.` and `package.json:10` passes legacy `--ext ts,tsx` flags removed in ESLint v9.

39. **[High — Verified via CLI] `supabase/.temp/` tracked in git (exposes project ref, org ID, and pooler URL)**
    - **Evidence:** `git ls-files supabase/.temp` shows 10 tracked files, including `supabase/.temp/linked-project.json` and `supabase/.temp/pooler-url` (`postgresql://postgres.pqaehnscdhmgnwiqapiy@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`).

40. **[High — Verified via CLI] 2.07 MB monolithic JS bundle (`dist/assets/index-*.js` = 2,072.32 kB)**
    - **Evidence:** Running `pnpm build` outputs a single `2,072.32 kB` JS chunk (`2,023.75 KiB`), just 24 KiB below Workbox's 2,048 KiB (`2 MiB`) default `maximumFileSizeToCacheInBytes` limit, because `src/App.tsx:20-35` eagerly imports all 16 pages (`recharts`, `xlsx`, `papaparse`, `framer-motion`).

41. **[High — Verified] Missing `.github/workflows/ci.yml` & Dependabot / `SECURITY.md`**
    - **Evidence:** No `.github/` directory exists in the repository.

42. **[Medium — Verified] Modals lack `role="dialog"`, `aria-modal="true"`, `Escape` key handler, and focus management; icon-only buttons lack `aria-label`**
    - **Evidence:** `ConfirmDialog.tsx`, `ExpenseForm.tsx`, `CategoryManagerModal.tsx`, `PersonForm.tsx`, `LedgerEntryForm.tsx`, `PaymentForm.tsx`, `QuickLedgerEntry.tsx`, `InvestmentForm.tsx`, `InvestmentPaymentForm.tsx`, and `ReturnForm.tsx` are custom `<div>` overlays without `Escape` listeners or ARIA dialog attributes (even though `@radix-ui/react-dialog` is already installed in `package.json:17`).

43. **[Low — Verified] `uiStore.ts` `addToast` does not clear `setTimeout` when `removeToast` is called manually**
    - **Evidence:** `src/stores/uiStore.ts:58-70`.

---

## Part 2 — Phase-by-Phase Remediation Plan (Ready for Next Session)

> Each phase is self-contained, ordered by risk and dependency, and includes exact file targets and verification criteria.

---

### Phase 1: Critical Security, Auth Lifecycle & Edge Function Hardening

**Goal:** Eliminate XSS vectors, harden Edge Function authentication and email rendering, fix soft-deleted account & password recovery auth flows, and prevent cross-session cache leaks.

- [x] **1.1 Safe URL validation & rendering (`http:` / `https:` only)**
  - **Files:** `src/lib/utils.ts`, `src/components/ledger/LedgerEntryForm.tsx`, `src/components/ledger/QuickLedgerEntry.tsx`, `src/components/investments/InvestmentForm.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/InvestmentsPage.tsx`, `src/pages/InvestmentDetailPage.tsx`, `src/pages/PersonDetailPage.tsx`
  - **Tasks:**
    - Add `export function isSafeHttpUrl(raw: string | null | undefined): boolean` in `src/lib/utils.ts` that parses with `new URL(raw)` and checks `protocol === 'http:' || protocol === 'https:'`.
    - Replace `.url('Enter a valid URL')` in `LedgerEntryForm.tsx`, `QuickLedgerEntry.tsx`, `InvestmentForm.tsx`, and `ProfilePage.tsx` with `.refine((v) => !v || isSafeHttpUrl(v), 'Enter a valid http(s) URL')`.
    - Guard `<a href={...}>` in `InvestmentsPage.tsx`, `InvestmentDetailPage.tsx`, and `PersonDetailPage.tsx` with `isSafeHttpUrl(...)`.
- [x] **1.2 Clear React Query cache, auth profile, and sensitive state on sign-out**
  - **Files:** `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/pages/SettingsPage.tsx`
  - **Tasks:**
    - In `src/App.tsx` (`onAuthStateChange`), on `SIGNED_OUT`, call `useAuthStore.getState().clear()` (so `profile` is also reset to `null`) and `queryClient.clear()`.
    - In `SettingsPage.tsx` (`handleDeleteAccount`), clear `localStorage.removeItem('groq_api_key')` and `queryClient.clear()` before signing out.
- [x] **1.3 Handle `PASSWORD_RECOVERY` event and soft-deleted (`deleted_at`) accounts on sign-in**
  - **Files:** `src/App.tsx`, `src/pages/auth/ResetPasswordPage.tsx`
  - **Tasks:**
    - In `src/App.tsx` (`onAuthStateChange`), handle `if (event === 'PASSWORD_RECOVERY') { router.navigate({ to: '/reset-password', replace: true }); return }`.
    - In `src/App.tsx` (`Root`), if `profile?.deleted_at` is non-null, render an account-recovery gate allowing the user to either **Restore My Account** (`supabase.from('profiles').update({ deleted_at: null }).eq('id', profile.id)`) or **Sign Out** instead of silently entering the dashboard while queued for deletion.
    - In `ResetPasswordPage.tsx`, after password update succeeds, either call `await supabase.auth.signOut()` before navigating to `/login` or change the CTA to navigate to `/dashboard`.
- [x] **1.4 Harden `supabase/functions/notifications/index.ts`**
  - **Files:** `supabase/functions/notifications/index.ts`
  - **Tasks:**
    - Add `escapeHtml(str: string)` and escape `categoryName` and `monthLabel` in all HTML templates and subjects.
    - Validate that `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `CRON_SECRET` are non-empty strings before processing requests (fail closed with HTTP 500/401).
    - Compare `Authorization` header against `Bearer ${CRON_SECRET}` using constant-time byte comparison (`crypto.subtle.timingSafeEqual` or SHA-256 HMAC digest comparison).
    - Select `currency` from `profiles` (`select('id, email, currency')`) and format email amounts using the user's currency instead of hardcoding `formatBDT`.
- [x] **1.5 Add HTTP security headers in `vercel.json` & sanitize AI prompts**
  - **Files:** `vercel.json`, `src/hooks/useAICategorySuggest.ts`, `src/components/ai/AIHub.tsx`
  - **Tasks:**
    - Add `headers` block in `vercel.json` with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Content-Security-Policy`.
    - Wrap untrusted transaction descriptions and chat questions in `<user_input>...</user_input>` delimiters with system instructions to ignore embedded instructions.

---

### Phase 2: Database Schema Migration (`007`) & Supabase Data Layer

**Goal:** Fix all PostgreSQL `CHECK` constraint failures, orphaned `ledger_payments`, missing unique indexes, unscheduled cron jobs, RLS policies, and PostgREST 1,000-row truncation.

- [x] **2.1 Author `supabase/migrations/007_audit_fixes.sql`**
  - **Files:** `supabase/migrations/007_audit_fixes.sql`
  - **Tasks:**
    - Drop restrictive `CHECK` constraints on `payment_method` and `account` across `transactions`, `person_ledger`, `ledger_payments`, `investment_payments`, and `investment_returns`; replace with `CHECK (payment_method IS NULL OR length(trim(payment_method)) BETWEEN 1 AND 100)` and `CHECK (account IS NULL OR length(trim(account)) BETWEEN 1 AND 100)`.
    - Drop restrictive `CHECK` constraint on `persons.relationship`; replace with `CHECK (relationship IS NULL OR length(trim(relationship)) BETWEEN 1 AND 60)`.
    - Deduplicate any existing duplicate `(user_id, name, type)` rows in `categories` and add `ALTER TABLE public.categories ADD CONSTRAINT categories_user_name_type_key UNIQUE (user_id, name, type);` so `seed_default_categories()` `ON CONFLICT DO NOTHING` works properly.
    - Re-assert RLS policies on all user tables with explicit `USING (...) WITH CHECK (...)`, and `REVOKE ALL ON public.budget_alert_log FROM anon, authenticated;`.
    - Schedule `purge_deleted_users()` daily via `pg_cron` (`select cron.schedule('purge-deleted-users', '0 4 * * *', $$ select public.purge_deleted_users() $$);`).
    - Clean up any existing orphaned `ledger_payments` where no matching `person_ledger` rows exist for `(person_id, ledger_type)`, and add a trigger on `person_ledger` `AFTER DELETE` that deletes `ledger_payments` for `(OLD.person_id, OLD.ledger_type)` when no `person_ledger` rows remain for that `(person_id, ledger_type)`.
- [x] **2.2 Fix orphaned `ledger_payments` in `SettingsPage.tsx` Danger Zone & harden hooks**
  - **Files:** `src/pages/SettingsPage.tsx`, `src/hooks/useCategories.ts`, `src/hooks/useBudgets.ts`, `src/hooks/useLedger.ts`
  - **Tasks:**
    - In `SettingsPage.tsx` (`handleDeleteLogs`), when `type === 'lent'` or `'debt'`, also delete from `ledger_payments` (`.eq('user_id', userId!).eq('ledger_type', ...)`), and invalidate both `['persons']` and `['person']`.
    - Add `.eq('user_id', userId!)` to `useUpdateCategory` and `useDeleteCategory` in `src/hooks/useCategories.ts`.
    - Add `guardDemo()`, `DemoBlockedError` handling, and `onError` toast notifications to `useUpsertBudget` and `useDeleteBudget` in `src/hooks/useBudgets.ts`.
    - Change `.single()` to `.maybeSingle()` in `usePerson` (`src/hooks/useLedger.ts:146`).
- [x] **2.3 Prevent PostgREST 1,000-row silent truncation**
  - **Files:** `src/hooks/useExpenses.ts`, `src/hooks/useLedger.ts`, `src/hooks/useInvestments.ts`
  - **Tasks:**
    - Add a paginated fetch helper `fetchAllPages()` using `.range(from, to)` (page size 1,000) for unbounded/multi-month queries in `useExpenses`, `usePersons` (`person_ledger` and `ledger_payments`), and `useInvestments`.

---

### Phase 3: Critical Financial Logic, Form Validation & Currency Support

**Goal:** Fix all financial calculation bugs, broken form inputs (`SmartAmountInput`, `PaymentMethodPicker`, `PersonForm`, `QuickLedgerEntry`), and wire up `profile.currency` across the entire app.

- [x] **3.1 Fix `SmartAmountInput.tsx` incomplete/invalid expression submission bug**
  - **Files:** `src/components/common/SmartAmountInput.tsx`
  - **Tasks:**
    - In `commit(text)`, when `result.ok === false` (`'empty'`, `'invalid'`, or `'div-by-zero'`), emit `onChange(undefined)` so `react-hook-form` + Zod blocks submission of incomplete expressions like `100+` or `500/0` instead of silently submitting the last valid prefix (`100` or `500`).
    - On blur, if `!result.ok && rawText.trim().length > 0`, keep `rawText` visible and show an explicit error hint (`"Invalid expression — finish typing or clear"`).
- [x] **3.2 Fix `PaymentMethodPicker` state sync, custom MFS group detection, and form bindings**
  - **Files:** `src/lib/constants.ts`, `src/components/common/PaymentMethodPicker.tsx`, `src/components/expenses/ExpenseForm.tsx`, `src/components/ledger/LedgerEntryForm.tsx`, `src/components/ledger/PaymentForm.tsx`, `src/components/ledger/QuickLedgerEntry.tsx`, `src/components/investments/InvestmentPaymentForm.tsx`, `src/components/investments/ReturnForm.tsx`, `src/pages/DataSettingsPage.tsx`
  - **Tasks:**
    - In `src/lib/constants.ts`, update `getMethodGroup(method)` to return `'MFS'` for any `method.startsWith('MFS - ')`.
    - In `PaymentMethodPicker.tsx`, sync `selectedGroup` when `method` prop changes externally, deduplicate custom MFS providers and custom bank accounts (case-insensitive) in both `PaymentMethodPicker.tsx` and `DataSettingsPage.tsx`, and accept/render `methodError` / `accountError` props.
    - Remove the broken `m ?? 'Cash'` / `v ?? lastMethod` fallbacks in `LedgerEntryForm.tsx`, `PaymentForm.tsx`, `QuickLedgerEntry.tsx`, `InvestmentPaymentForm.tsx`, and `ReturnForm.tsx` so selecting `MFS`, `Card`, `Bank Transfer`, or `None` works properly, and display validation errors when an MFS provider or bank account is required but unselected.
- [x] **3.3 Wire `profile.currency` across all pages, components, and AI context**
  - **Files:** `src/lib/utils.ts`, `src/components/common/AnimatedNumber.tsx`, `src/components/common/CurrencyDisplay.tsx`, `src/pages/AnalyticsPage.tsx`, `src/lib/aiContext.ts`
  - **Tasks:**
    - Add `getUserCurrency()` and `getCurrencySymbol(currency?)` in `src/lib/utils.ts` reading `useAuthStore.getState().profile?.currency ?? 'BDT'`.
    - Default `formatCurrency(amount, currency = getUserCurrency())` so all existing `formatCurrency(x)` calls automatically respect the user's selected currency!
    - Update `AnimatedNumber.tsx` to use `formatCurrency(v, currency)` (preserving currency symbol for non-BDT currencies and decimals when present) and update `fmtK` / calendar tooltips in `AnalyticsPage.tsx`.
    - Fix the double `৳৳` typo in `src/components/investments/InvestmentPaymentForm.tsx:99`.
- [x] **3.4 Fix `useNoSpendStreak` & `ExpensesPage` totals/budget/streak bugs**
  - **Files:** `src/hooks/useNoSpendStreak.ts`, `src/pages/ExpensesPage.tsx`, `src/lib/utils.ts`
  - **Tasks:**
    - Export `parseDate` from `src/lib/utils.ts`.
    - In `useNoSpendStreak.ts`: return `0` immediately when `transactions.length === 0`; parse `earliest` via `parseDate(earliest)` (local midnight, not UTC); cap the loop at the number of days since `earliest` (no `+ 2` overshoot before `earliest`).
    - In `ExpensesPage.tsx`:
      - Query full-month transactions (`{ from, to }`) and apply `typeFilter`, `methodFilter`, and `groupFilter` client-side in `displayedTransactions` so `totalExpense`, `totalIncome`, and `categorySpend` (`BudgetIndicator` progress bars) always reflect true full-month numbers even when filters are active!
      - Fix `useMemo` dependency array from `[displayedTransactions]` to `[transactions]`.
      - Compute `streak` from the all-time query (`{ from: '2000-01-01', to: toISODateString(new Date()) }`) matching `DashboardPage`.
- [x] **3.5 Fix `InvestmentDetailPage`, `InvestmentsPage`, `PersonForm`, `QuickLedgerEntry`, `Sidebar`, and `ProfilePage` bugs**
  - **Files:** `src/pages/InvestmentDetailPage.tsx`, `src/pages/InvestmentsPage.tsx`, `src/hooks/useInvestments.ts`, `src/components/investments/InvestmentForm.tsx`, `src/components/investments/InvestmentPaymentForm.tsx`, `src/components/ledger/PersonForm.tsx`, `src/components/ledger/QuickLedgerEntry.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/AppShell.tsx`, `src/components/ai/AIHub.tsx`, `src/pages/ProfilePage.tsx`, `src/hooks/useAICategorySuggest.ts`
  - **Tasks:**
    - `InvestmentDetailPage.tsx`: Wrap investment Delete button with `useConfirmStore` confirmation and `await mutateAsync(inv.id)` before `navigate({ to: '/investments' })` (catching `DemoBlockedError`); validate inline payment/return edits (`amount > 0`, valid date) before calling `updatePayment`/`updateReturn`; add missing `.idp-row-edit-btn`, `.idp-inline-*`, and `.idp-action-delete` CSS rules.
    - `useInvestments.ts` / `InvestmentsPage.tsx` / `InvestmentDetailPage.tsx`: Distinguish realized Cashflow P&L vs. Total Return (including `market_value` when set); add overpayment warning/validation in `InvestmentPaymentForm.tsx`.
    - Add `.max(9999999999.99, 'Amount exceeds maximum limit')` to all 7 Zod money schemas and `.refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, ...)` in `InvestmentForm.tsx`.
    - Fix `PersonForm.tsx` and `QuickLedgerEntry.tsx` custom relationship `<select>` so `react-hook-form`'s `onChange` is preserved and selecting `'__custom__'` clears the field value via `setValue(..., '')`. In `QuickLedgerEntry.tsx`, call `setValue('person_id', newPerson.id)` immediately after `createPerson` succeeds so retries never duplicate the person.
    - Fix `Sidebar.tsx:142` avatar initial precedence bug to `(isDemo ? 'D' : (profile?.full_name?.[0] ?? '?')).toUpperCase()`.
    - Replace raw `<a href="/settings">` in `AIHub.tsx` and `<a href="/signup">` in `AppShell.tsx` with TanStack Router `<Link>` / `navigate()`.
    - Sync `ProfilePage.tsx` form with `useEffect(() => { if (profile) reset(...) }, [profile, reset])`.
    - Fix `useAICategorySuggest.ts` stale-response race condition with a `cancelled` flag in the `useEffect` cleanup.

---

### Phase 4: Data Import / Export Hardening & Completeness

**Goal:** Make CSV import resilient and validated, protect exports against CSV/Excel formula injection, and include Investments in Full Export.

- [x] **4.1 Harden CSV Import in `SettingsPage.tsx`**
  - **Files:** `src/pages/SettingsPage.tsx`
  - **Tasks:**
    - Case-insensitively validate `Type` (`'expense'` / `'income'`), rejecting or reporting rows with invalid types instead of silently coercing typos to `'Expense'`.
    - Validate `Amount` (`> 0` and `<= 9999999999.99`), `Date` (`isValidIsoDate`), and `Payment Method` / `Account` lengths.
    - Chunk `.insert(txns)` calls into batches of 200 rows and surface detailed error messages if a batch fails.
- [x] **4.2 Sanitize CSV/Excel exports against formula injection & add Investments to Full Export**
  - **Files:** `src/lib/export.ts`, `src/pages/SettingsPage.tsx`
  - **Tasks:**
    - Add `sanitizeSpreadsheetCell(val)` in `src/lib/export.ts` prefixing string values starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with `'`.
    - Update `exportFullExcel` in `src/lib/export.ts` and `SettingsPage.tsx` (`ExportSection` and `DangerSection`) to also include `Investments`, `Investment Payments`, and `Investment Returns` sheets.

---

### Phase 5: Build Optimization, ESLint v9, Git Hygiene & CI/CD

**Goal:** Fix broken `pnpm lint`, untrack `supabase/.temp/`, split the 2.07 MB bundle so initial load is fast and well below Workbox's 2 MiB precache limit, and add GitHub Actions CI + Vitest unit tests.

- [x] **5.1 Fix ESLint v9 flat config & `pnpm lint`**
  - **Files:** `eslint.config.js`, `package.json`
  - **Tasks:**
    - Install `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, and `globals` (or configure flat config with installed packages), create `eslint.config.js`, update `"lint": "eslint . --max-warnings 0"` in `package.json`, and ensure `pnpm lint` exits with `0`.
- [x] **5.2 Untrack `supabase/.temp/` and update `.gitignore`**
  - **Files:** `.gitignore`, `supabase/.temp/*`
  - **Tasks:**
    - Add `supabase/.temp/` to `.gitignore` and run `git rm -r --cached supabase/.temp`.
- [x] **5.3 Code-split routes in `src/App.tsx` and configure `manualChunks` in `vite.config.ts`**
  - **Files:** `src/App.tsx`, `vite.config.ts`
  - **Tasks:**
    - Lazy-load route page components in `src/App.tsx` with `React.lazy` + `<Suspense>`.
    - Configure `build.rollupOptions.output.manualChunks` in `vite.config.ts` to separate `recharts`, `xlsx`, `supabase`, and `framer-motion` into dedicated vendor chunks so no chunk exceeds 500 kB.
- [x] **5.4 Add GitHub Actions CI, Dependabot, `SECURITY.md`, and Vitest unit tests**
  - **Files:** `.github/workflows/ci.yml`, `.github/dependabot.yml`, `SECURITY.md`, `package.json`, `src/lib/__tests__/calculator.test.ts`, `src/lib/__tests__/utils.test.ts`, `src/hooks/__tests__/useNoSpendStreak.test.ts`
  - **Tasks:**
    - Add `.github/workflows/ci.yml` running `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, and `pnpm build`.
    - Add `.github/dependabot.yml` and `SECURITY.md`.
    - Add `vitest` and unit tests covering `calculator.ts`, `utils.ts` (`round2`, `parseDate`, `isSafeHttpUrl`), and `useNoSpendStreak.ts`.

---

### Phase 6: Accessibility (a11y) & UX Polish

**Goal:** Bring modals, icon-only controls, and toast timers up to production accessibility standards.

- [x] **6.1 Modal keyboard (`Escape`), `role="dialog"`, `aria-modal="true"`, and focus management**
  - **Files:** `src/components/common/ConfirmDialog.tsx`, `src/components/expenses/ExpenseForm.tsx`, `src/components/expenses/CategoryManagerModal.tsx`, `src/components/ledger/PersonForm.tsx`, `src/components/ledger/LedgerEntryForm.tsx`, `src/components/ledger/PaymentForm.tsx`, `src/components/ledger/QuickLedgerEntry.tsx`, `src/components/investments/InvestmentForm.tsx`, `src/components/investments/InvestmentPaymentForm.tsx`, `src/components/investments/ReturnForm.tsx`
  - **Tasks:**
    - Add a shared `useModalA11y(onClose)` hook (or `<Modal>` wrapper) that handles `Escape` key closing, body scroll lock, and `role="dialog"` + `aria-modal="true"` across all 10 modal components.
- [x] **6.2 Add `aria-label` to all icon-only buttons & clean up `uiStore` toast timers**
  - **Files:** `src/stores/uiStore.ts`, `src/components/common/DeleteButton.tsx`, `src/components/common/FloatingCalculatorPanel.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/DataSettingsPage.tsx`, `src/pages/PeoplePage.tsx`, `src/pages/InvestmentsPage.tsx`
  - **Tasks:**
    - Track toast timeout IDs in a `Map<string, ReturnType<typeof setTimeout>>` in `src/stores/uiStore.ts` and clear on `removeToast`.
    - Add descriptive `aria-label` attributes to all icon-only buttons (`DeleteButton`, modal close `X` buttons, password visibility toggles, reorder/edit/delete icons).

---

### Phase 7: Feature Enhancements & Product Improvements

**Goal:** High-impact user-facing improvements to existing FinTrack modules.

- [x] **7.1 Search & description filter on `ExpensesPage.tsx`**
  - **Files:** `src/pages/ExpensesPage.tsx`
  - **Tasks:** Add a search bar on `ExpensesPage` to filter transactions in real time by description, category name, main group, payment method, or account.
- [x] **7.2 Interactive Demo Mode CRUD across all modules**
  - **Files:** `src/stores/demoStore.ts`, `src/hooks/useExpenses.ts`, `src/hooks/useBudgets.ts`, `src/hooks/useCategories.ts`, `src/hooks/useLedger.ts`, `src/hooks/useInvestments.ts`
  - **Tasks:** Extend `demoStore` with in-memory update/delete/create actions for expenses, budgets, categories, persons, ledger entries/payments, and investments so visitors trying the live demo can experience full app interactivity.
- [x] **7.3 Richer `LedgerPayment` & `Investment` inline/modal editing**
  - **Files:** `src/components/ledger/LedgerPaymentLogs.tsx`, `src/pages/InvestmentDetailPage.tsx`
  - **Tasks:** Allow editing `payment_date`, `payment_method`, `account`, and `notes` (not just `amount`) when editing an existing `LedgerPayment` or `InvestmentPayment`/`InvestmentReturn`.
- [x] **7.4 Account-to-account Transfers & per-account balance summary (Future Feature)**
  - **Tasks:** Support `Transfer` transactions (e.g., Bank → bKash cash-in, ATM withdrawal) so internal transfers don't inflate monthly expenses/income.
- [x] **7.5 Recurring transactions & Investment valuation history (Future Feature)**
  - **Tasks:** Add recurring bill/salary templates and timestamped `investment_valuations` history for portfolio growth charts.

---

## Part 3 — Feature Enhancement, Stability & Correctness Audit (Categories 1–6)

> Tracked remediation of the 23 logical errors, validation gaps, and UI/UX issues identified across all feature modules. Each category is implemented, tested, and merged via its own branch and Pull Request.

### Category 1: Shared Forms & Common Components (`fix/cat-1-shared-forms`)

- [x] **1.1 `SmartAmountInput` + optional fields (`InvestmentForm`) invalid expression handling & error display**
  - **Files:** `src/components/common/SmartAmountInput.tsx`, `src/components/investments/InvestmentForm.tsx`
  - Emit `Number.NaN` on invalid/incomplete expressions (`100+`, `500/0`) while keeping `undefined` for empty inputs; use `Object.is` in `SmartAmountInput` sync effect; remove `.or(z.nan().transform(() => undefined))` in `InvestmentForm` and render `errors.market_value`.
- [x] **1.2 `PaymentMethodPicker` auto-select on MFS group & custom provider creation**
  - **Files:** `src/components/common/PaymentMethodPicker.tsx`
  - Auto-select the first MFS/Wallet provider when clicking the MFS group chip, and auto-select newly created custom providers in `saveCustomMethod()`.
- [x] **1.3 `ConfirmDialog` support for `config.confirmLabel`**
  - **Files:** `src/components/common/ConfirmDialog.tsx`
  - Honor `config.confirmLabel` on Step 1 & Step 2 buttons and adjust Step 2 copy for non-delete confirmations.
- [x] **1.4 `CurrencyDisplay` active currency default**
  - **Files:** `src/components/common/CurrencyDisplay.tsx`
  - Remove hardcoded `= 'BDT'` default so omitting `currency` uses `formatCurrency`'s `getActiveCurrency()` default.

### Category 2: Lent & Debt / People (`fix/cat-2-ledger-people`)

- [x] **2.1 `LedgerPaymentLogs` same-date sort order & intermediate balance clamping**
  - **Files:** `src/components/ledger/LedgerPaymentLogs.tsx`
- [x] **2.2 `QuickLedgerEntry` & `PersonForm` combobox duplicate person prevention, new person details & RHF handler fixes**
  - **Files:** `src/components/ledger/QuickLedgerEntry.tsx`, `src/components/ledger/PersonForm.tsx`
- [x] **2.3 `LedgerEntryForm` notes field & `PersonDetailPage` notes/account metadata + Edit person button**
  - **Files:** `src/components/ledger/LedgerEntryForm.tsx`, `src/pages/PersonDetailPage.tsx`
- [x] **2.4 `LedgerSummaryTab`, `LedgerPage` & `PeoplePage` activity dates, empty state, navigation & custom relationships filter**
  - **Files:** `src/components/ledger/LedgerSummaryTab.tsx`, `src/pages/LedgerPage.tsx`, `src/pages/PeoplePage.tsx`
- [x] **2.5 Mobile CSS selector mismatches in `globals.css` & duplicate CSS rules in `PersonDetailPage.css`**
  - **Files:** `src/styles/globals.css`, `src/pages/PersonDetailPage.css`

### Category 3: Household (`fix/cat-3-household`)

- [x] **3.1 Interactive Demo Mode CRUD for Household**
  - **Files:** `src/stores/demoStore.ts`, `src/hooks/useHousehold.ts`
- [x] **3.2 `SharedExpenseForm` & `SettleForm`: `SmartAmountInput`, `useModalA11y`, date/max validation & negative share check**
  - **Files:** `src/components/household/SharedExpenseForm.tsx`, `src/components/household/SettleForm.tsx`
- [x] **3.3 Confirmation dialogs in `MembersPanel` (remove member & rotate invite code)**
  - **Files:** `src/components/household/MembersPanel.tsx`
- [x] **3.4 Edit recorded settlements in `SettlementList` & `SettleForm`**
  - **Files:** `supabase/migrations/019_household_settlement_update.sql`, `src/hooks/useHousehold.ts`, `src/components/household/SettleForm.tsx`, `src/components/household/SharedExpenseList.tsx`, `src/pages/HouseholdPage.tsx`
- [x] **3.5 `HouseholdSetup` currency default & async profile sync**
  - **Files:** `src/components/household/HouseholdSetup.tsx`

### Category 4: Expenses & Recurring (`fix/cat-4-expenses-recurring`)

- [x] **4.1 `ExpenseCard` mobile touch tap bug & immediate delete with `toastWithUndo`**
  - **Files:** `src/components/expenses/ExpenseCard.tsx`, `src/hooks/useExpenses.ts`
- [x] **4.2 `ExpensesPage` filter consistency, stale category IDs, dynamic method choices & filter-aware empty state**
  - **Files:** `src/pages/ExpensesPage.tsx`
- [x] **4.3 `RecurringRuleForm` category reset on type toggle & `end_date >= start_date` validation**
  - **Files:** `src/pages/RecurringPage.tsx`

### Category 5: Investments (`fix/cat-5-investments`)

- [ ] **5.1 Open-ended investments (`committed_amount == null`) display fixes**
  - **Files:** `src/pages/InvestmentDetailPage.tsx`, `src/components/investments/InvestmentTransactionLogs.tsx`
- [ ] **5.2 `InvestmentPaymentForm` overpayment warning on edit**
  - **Files:** `src/components/investments/InvestmentPaymentForm.tsx`
- [ ] **5.3 Investment detail & transaction logs CSS, same-date sort order & payment method metadata**
  - **Files:** `src/pages/InvestmentDetailPage.css`, `src/pages/InvestmentDetailPage.tsx`, `src/components/investments/InvestmentTransactionLogs.css`, `src/components/investments/InvestmentTransactionLogs.tsx`

### Category 6: Navigation, Analytics & Settings (`fix/cat-6-nav-analytics-settings`)

- [ ] **6.1 `Sidebar` active state on nested `/settings/*` routes**
  - **Files:** `src/components/layout/Sidebar.tsx`
- [ ] **6.2 `AnalyticsPage` elapsed-days daily average & formatted payment method labels**
  - **Files:** `src/pages/AnalyticsPage.tsx`
- [ ] **6.3 `BudgetSection` in `SettingsPage.tsx` use `SmartAmountInput`**
  - **Files:** `src/pages/SettingsPage.tsx`
