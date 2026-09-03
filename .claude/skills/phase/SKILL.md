---
name: phase
description: Implement one numbered work package from TODO.md end-to-end — scope it, plan it, build it, verify it, commit it. Use when asked to "do phase N", "implement work package N", "start on TODO section X", or to work through the audit backlog.
---

# Phase

Implements one work package from `TODO.md` as a complete, shippable unit.

Argument is a work-package number (`1`–`8`) from TODO.md's **"Suggested order of work"**,
or a section id (`2.1`, `3.4`) to do a single item.

## Work packages

| WP | Covers | Theme |
|----|--------|-------|
| 1 | §1.1 + §1.2 | Revive the AI features (dead Groq model) |
| 2 | §2.1 + §2.2 + §2.3 | Database RPC lockdown + leaked CLI scratch files |
| 3 | §3.1 + §3.2 | The bugs that make the app display wrong numbers |
| 4 | §2.4 + §2.6 | Security headers + dependency bumps |
| 5 | §4.2 + §4.3 | ESLint config + Vitest on the money-critical functions |
| 6 | §4.1 | Bundle splitting (2.07 MB → target <200 KB gzip initial) |
| 7 | §5.1 | Recurring transactions |
| 8 | remainder | By appetite |

## Procedure

### 1. Scope — read before you write

Read **only** the relevant `TODO.md` section, then the specific files it names. Do not
re-audit the codebase; the audit is already written down. Do not read `docs/PROJECT_HISTORY.md`
unless the task turns out to depend on why something was built the way it was.

State the scope back in two or three lines before touching anything: which section, which
files, what "done" means.

### 2. Check the assumptions

Several TODO items are asserted from static reading, not live verification — they are
flagged as such in the file. If the item carries a verification step (e.g. §2.1's SQL
query), surface it to the user and get the answer before writing a fix built on a guess.

If reading the code shows the finding is wrong or already fixed, **say so and stop** rather
than implementing a fix for a non-problem. An audit note is a lead, not a fact.

### 3. Build it

Follow the existing conventions in the file you are editing — this codebase is internally
consistent and that consistency is load-bearing:

- TypeScript only, `.ts`/`.tsx`, never `.js`/`.jsx`
- Colors come from the CSS tokens in `globals.css`, never hardcoded hex — **except** the
  three curated categorical palettes (`AnalyticsPage` `CHART_COLORS`, `PersonCard`/`PeoplePage`
  `RELATIONSHIP_COLORS`, `AIHub` accents), which are deliberate
- Every mutation hook calls `useDemoGuard()` at the top of its `mutationFn`
- Every `mutateAsync` call site is wrapped in `try/catch`
- Every page that runs a query renders `ErrorBanner` on `isError`
- Money maths goes through `round2()`; date-only strings never go through bare `new Date()`

### 4. Verify

Invoke the **verify** skill. Do not skip it, and do not commit on a red build.

### 5. Commit

Commit **each meaningful, self-contained change as it completes** — not one commit at the
end of the work package. A good commit is one reviewable idea: one bug fixed, one migration
added, one config introduced.

```
<type>: <imperative summary, lowercase, no trailing period>

<why it changed, and anything non-obvious about how. Wrap at 72.>

Refs: TODO.md §<section>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Types: `feat` `fix` `perf` `refactor` `chore` `docs` `style` `test`

Rules:
- **Never push here.** Pushing is the `wrap` skill's job, at the end of a session, after review.
- Never commit `.env.local`, or anything under `RAWDATA/`.
- `TODO.md` is currently gitignored on purpose — it documents unpatched security issues on a
  public repo. It stops being ignored once WP2 is done.
- Check `git status` before committing so nothing unrelated is swept in.

### 6. Close the loop

When the work package is done:

- Tick the `- [ ]` boxes in `TODO.md` for what actually shipped. Leave unticked anything you
  deferred, and add a line saying why.
- If the change altered architecture, schema, or a convention, add a row to the Decisions Log
  in `CLAUDE.md` — date, what, why. Skip this for routine fixes; it is for decisions, not diffs.
- Report what shipped, what you skipped and why, and what the user still has to do themselves
  (rotating a password, running a migration, verifying a query).

## Anything requiring a human

These cannot be done from here and must be handed back explicitly, not silently skipped:

- Applying a migration to the live Supabase project
- Rotating the database password (§2.3)
- Setting Edge Function secrets
- Verifying live RPC grants (§2.1)
