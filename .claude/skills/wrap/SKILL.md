---
name: wrap
description: End-of-session close-out for FinTrack — verify the build, commit anything outstanding, push to GitHub, and summarise what shipped. Use when asked to "wrap up", "finish the session", "push my work", or "we're done for today".
---

# Wrap

The end-of-session routine. This is the **only** place that pushes.

## 1. Take stock

```bash
git status --short
git log --oneline origin/main..HEAD
```

Report what is uncommitted and what is committed-but-unpushed, before doing anything to it.

## 2. Verify

Invoke the **verify** skill. A red build does not get pushed — fix it, or leave the work
unpushed and say so.

## 3. Commit the remainder

Anything left uncommitted gets committed following the message format in the **phase** skill.
If the leftovers are unrelated to each other, make separate commits rather than one bundle.

Before committing, look at what is actually staged:

```bash
git diff --cached --stat
```

Never sweep in `.env.local`, `RAWDATA/`, `dist/`, or `node_modules/`. `TODO.md` stays
gitignored until WP2 (the security work package) is complete.

## 4. Push

FinTrack is a **public repository** and `main` is the deploy branch — a push goes straight to
production on Vercel. So:

- Show the user the exact list of commits about to go out, and ask before pushing.
- Never `--force`. Never `--no-verify`.
- If the push is rejected as non-fast-forward, pull with rebase and re-verify before retrying.

```bash
git push origin main
```

### Credentials

The remote is `https://isttiiak@github.com/isttiiak/FinTrack.git`, and this repo has
repo-local git identity set to `Istiak Islam <isttiiak@gmail.com>`. The machine's *global*
git account is a different one (`izhaaannn`) — that is deliberate, leave it alone.

On the first push of a session, Windows Credential Manager may prompt. It must authenticate
as **isttiiak**. If it silently uses the wrong account the push will 403 — the fix is
Control Panel → Credential Manager → Windows Credentials → remove the `git:https://github.com`
entry, then push again.

If a commit was made with the wrong author, fix it before pushing:

```bash
git commit --amend --author="Istiak Islam <isttiiak@gmail.com>" --no-edit
```

## 5. Summarise

Close with a short report:

- What shipped this session (one line per commit)
- What was deferred, and why
- **What the user must do themselves** — apply a migration, rotate a secret, verify a query,
  check the Vercel deploy
- Suggested next work package

Keep it to something readable in fifteen seconds. Do not restate the whole diff.
