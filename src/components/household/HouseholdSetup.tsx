import { useEffect, useRef, useState } from 'react'
import { Home, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useCreateHousehold, useJoinHousehold, lookupInvite } from '@/hooks/useHousehold'
import { CURRENCIES } from '@/lib/constants'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import { normalizeInviteCode } from '@/lib/householdInvite'

interface HouseholdSetupProps {
  // From an invite link — looked up straight away
  initialCode?: string | null
  onDone: (householdId: string | null) => void
}

// Shown when the user has no household (or wants another): create one, or
// join one with an invite code.
export default function HouseholdSetup({ initialCode, onDone }: HouseholdSetupProps) {
  const profileCurrency = useAuthStore((s) => s.profile?.currency)
  const isDemo = useDemoStore((s) => s.isDemo)
  const { mutateAsync: create, isPending: creating } = useCreateHousehold()
  const { mutateAsync: join, isPending: joining } = useJoinHousehold()

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<string>(profileCurrency ?? 'USD')

  const [code, setCode] = useState(initialCode ?? '')
  const [invite, setInvite] = useState<{ name: string; members: { id: string; name: string }[] } | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [looking, setLooking] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      onDone((await create({ name: name.trim(), currency })) as string)
    } catch (err) {
      if (err instanceof DemoBlockedError) return
    }
  }

  async function lookup(raw: string) {
    const normalized = normalizeInviteCode(raw)
    if (!normalized) return
    setCode(normalized)
    if (isDemo) {
      setLookupError('Joining a household needs an account — sign up, then open the invite again.')
      return
    }
    setLooking(true)
    setLookupError('')
    try {
      setInvite(await lookupInvite(normalized))
    } catch (err) {
      setInvite(null)
      setLookupError((err as { message?: string }).message ?? 'Could not look up that code')
    } finally {
      setLooking(false)
    }
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    lookup(code)
  }

  const autoLooked = useRef(false)
  useEffect(() => {
    if (initialCode && !autoLooked.current) {
      autoLooked.current = true
      lookup(initialCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, for the invite link
  }, [initialCode])

  async function handleJoin(memberId: string | null) {
    try {
      onDone((await join({ code: normalizeInviteCode(code), memberId })) as string)
    } catch (err) {
      if (err instanceof DemoBlockedError) return
    }
  }

  const currencies = Array.from(new Set([currency, ...CURRENCIES]))

  return (
    <div className="hh-setup">
      <form className="hh-panel" onSubmit={handleCreate}>
        <h2 className="hh-panel-title"><Home size={13} style={{ verticalAlign: -2 }} /> Create a household</h2>
        <p className="hh-note">A shared space for family or flatmates to log shared costs, split them, and settle up. Your personal finances stay private.</p>
        <div className="hh-field">
          <label className="hh-label" htmlFor="hh-name">Name</label>
          <input id="hh-name" className="hh-input" placeholder="e.g. Flat 4B, Family support" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div className="hh-field">
          <label className="hh-label" htmlFor="hh-currency">Currency</label>
          <select id="hh-currency" className="hh-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <p className="hh-note">One currency per household — everyone’s shares are in it.</p>
        </div>
        <button className="btn-primary" disabled={creating || !name.trim()}>{creating ? 'Creating…' : 'Create household'}</button>
      </form>

      <div className="hh-panel">
        <h2 className="hh-panel-title"><KeyRound size={13} style={{ verticalAlign: -2 }} /> Join with a code</h2>
        {!invite ? (
          <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="hh-note">Paste the invite link or code a member shared from their Members tab.</p>
            <input className="hh-input" placeholder="Invite code or link" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Invite code"
              autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} />
            {lookupError && <p className="hh-error">{lookupError}</p>}
            <button className="btn-primary" disabled={looking || !code.trim()}>{looking ? 'Checking…' : 'Continue'}</button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="hh-note">Joining <strong>{invite.name}</strong>.{invite.members.length > 0 && ' Are you one of these people?'}</p>
            {invite.members.map((m) => (
              <button key={m.id} className="hh-ghost-btn" disabled={joining} onClick={() => handleJoin(m.id)}>I’m {m.name}</button>
            ))}
            <button className="btn-primary" disabled={joining} onClick={() => handleJoin(null)}>
              {invite.members.length > 0 ? 'None of these — add me as new' : 'Join household'}
            </button>
            <button className="hh-ghost-btn" onClick={() => setInvite(null)}>Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
