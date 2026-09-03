# FinTrack — Future Updates (deferred)

> Features moved out of `TODO.md`'s active backlog on 2026-09-04 at the user's request —
> not needed right now, kept here so the detail isn't lost. Move an item back into
> `TODO.md` §5 whenever it's picked up again; nothing here has been started.

---

## Savings goals & account balances

_(was TODO.md §5.2)_

The app tracks flow (income/expense) but never _stock_ — you can't answer "how much money
do I actually have right now?", which is the first question anyone asks a finance app.

- [ ] `accounts` table with an opening balance per account (Cash, bKash, each bank)
- [ ] Running balance per account, derived from transactions
- [ ] Net-worth card: accounts + investments (at market value) − outstanding debt
- [ ] `savings_goals`: name, target, deadline, linked account; progress ring on the dashboard
- [ ] Reconciliation: _"bKash says ৳4,200, FinTrack says ৳4,350 — add an adjustment?"_

## Debt ↔ Investment link

_(was TODO.md §5.6)_

Carried from Phase 4 and still unbuilt. Schema note already exists in `CLAUDE.md`.

- [ ] `person_ledger.investment_id` FK (nullable)
- [ ] Optional "this debt funds an investment" dropdown on the ledger entry form
- [ ] Show the linked investment's ROI next to the debt's cost — the whole point is seeing
      whether the borrowed money is actually earning more than it costs

## Web Push notifications

_(was TODO.md §5.8)_

Phase 8 item — and Phase 7 shipped the service worker, so the hard prerequisite is done.
The Edge Function + cron infra from Phase 4 already exists.

- [ ] `push_subscriptions` table, VAPID keys, permission prompt in Settings
- [ ] Reuse the existing notification triggers, add push as a second channel

## Notification email deliverability

_(was TODO.md §5.9)_

Carried from Phase 8: only `isttiiak@gmail.com` is verified with Resend, so notifications
cannot be enabled for anyone else. Free-account limitation, not a technical blocker —
deferred because it needs a paid domain, and the goal for now is free tooling only.

- [ ] Verify a sending domain with Resend before enabling notifications for all users

## Bulk edit / bulk delete / bulk recategorize on the expenses list

_(was part of TODO.md §5.11)_

- [ ] Multi-select on the expenses table, with a bulk action bar
- [ ] Bulk edit (category, payment method, account), bulk delete, bulk recategorize
