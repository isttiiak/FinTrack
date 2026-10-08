// Household invite links: /household?join=<code>. A signed-out visitor is
// sent to /login first, so the code is stashed in localStorage (not
// sessionStorage — email-confirmation signups come back in a new tab) and
// picked up again once they land on the Household page.

const LS_PENDING = 'fintrack_pending_invite'

// Invite codes are lowercase hex. Accepts a pasted invite link too, and
// forgives the capital first letter phone keyboards add.
export function normalizeInviteCode(input: string): string {
  const trimmed = input.trim()
  const fromLink = /[?&]join=([^&#\s]+)/.exec(trimmed)?.[1]
  return (fromLink ?? trimmed).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/household?join=${encodeURIComponent(code)}`
}

export function inviteCodeFromUrl(): string | null {
  if (window.location.pathname !== '/household') return null
  const code = new URLSearchParams(window.location.search).get('join')
  return code ? normalizeInviteCode(code) : null
}

// Call before redirecting a signed-out visitor to /login.
export function stashPendingInvite(): void {
  const code = inviteCodeFromUrl()
  if (code) {
    try { localStorage.setItem(LS_PENDING, code) } catch { /* private mode — link just won't survive login */ }
  }
}

export function getPendingInvite(): string | null {
  try { return localStorage.getItem(LS_PENDING) } catch { return null }
}

export function clearPendingInvite(): void {
  try { localStorage.removeItem(LS_PENDING) } catch { /* nothing stored */ }
}
