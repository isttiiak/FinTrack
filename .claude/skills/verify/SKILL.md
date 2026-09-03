---
name: verify
description: Run FinTrack's build gate — typecheck, production build, and dependency audit. Use after any code change, before any commit, and whenever asked to "check it builds", "verify", or "make sure nothing broke".
---

# Verify

The gate every change must pass before it is committed.

## Environment quirk — read this first

`pnpm` is **not on the default PATH** on this Windows machine. It was installed via
`npm i -g pnpm` and lives in `%APPDATA%\npm`. Every command below must be run with it
prepended, or `pnpm` will not be found:

```powershell
$env:Path = "$env:APPDATA\npm;$env:Path"
```

Do not waste turns rediscovering this. Do not `corepack enable` — it needs admin on this
machine and fails with EPERM.

## The gate

Run in order. Stop at the first failure and fix it before continuing.

```powershell
$env:Path = "$env:APPDATA\npm;$env:Path"
pnpm exec tsc -b          # 1. typecheck — must be 0 errors
pnpm build                # 2. production build — must exit 0
```

`pnpm lint` **does not work** — there is no `eslint.config.js` in this repo (TODO.md §4.2).
Do not try to run it and do not report its failure as a regression. If §4.2 has been
completed, add it to this gate.

There are **no tests** yet (TODO.md §4.3). If Vitest has since been added, run `pnpm test`
as step 3 and add it here.

## When the change touches dependencies

```powershell
pnpm audit
```

Baseline as of 2026-09-03 is **16 open advisories** (1 critical `seroval`, 14 high, 1
moderate) — all in the dependency tree, and the critical one is verified tree-shaken out
of `dist/`. Report only whether your change moved that number, not the raw count.

## When the change is user-visible

A green build is not proof the feature works. For anything that changes rendered output or
behaviour, also boot the app and look at it:

```powershell
$env:Path = "$env:APPDATA\npm;$env:Path"
pnpm dev     # http://localhost:5173 — run in background, then check the page
```

Demo mode (`Try demo` on the landing page) needs no Supabase credentials and is the fastest
path to a populated UI. Note that demo state is in-memory only — a reload wipes it.

## Reporting

State plainly what passed and what did not. If a step failed, show the actual output. Never
report "verified" for a step you skipped.
