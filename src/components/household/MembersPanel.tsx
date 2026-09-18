import { useState } from 'react'
import { Copy, Check, UserPlus, RefreshCw } from 'lucide-react'
import { useAddMember, useRemoveMember, useRotateInviteCode } from '@/hooks/useHousehold'
import { useUIStore } from '@/stores/uiStore'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import type { Household, HouseholdMember } from '@/types/household.types'

interface MembersPanelProps {
  household: Household
  members: HouseholdMember[]
  meId: string | null
  isOwner: boolean
  onLeave: (m: HouseholdMember) => void
  onDeleteHousehold: () => void
}

export default function MembersPanel({ household, members, meId, isOwner, onLeave, onDeleteHousehold }: MembersPanelProps) {
  const { mutateAsync: addMember, isPending: adding } = useAddMember()
  const { mutateAsync: removeMember } = useRemoveMember()
  const { mutateAsync: rotate, isPending: rotating } = useRotateInviteCode()
  const addToast = useUIStore((s) => s.addToast)

  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await addMember({ household_id: household.id, name })
      setName('')
    } catch (err) {
      if (err instanceof DemoBlockedError) setName('')
    }
  }

  async function handleRemove(m: HouseholdMember) {
    try {
      await removeMember({ id: m.id, household_id: household.id })
    } catch { /* toast shown by the hook */ }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(household.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      addToast({ type: 'info', message: 'Select the code and copy it manually' })
    }
  }

  async function handleRotate() {
    try {
      await rotate({ household_id: household.id })
    } catch { /* toast shown by the hook */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hh-list">
        {members.map((m) => (
          <div key={m.id} className="hh-member">
            <span className="hh-member-name">
              {m.name}
              {m.id === meId && <span className="hh-badge">You</span>}
              {m.role === 'owner' && <span className="hh-badge">Owner</span>}
              {m.user_id === null && <span className="hh-badge">No account</span>}
            </span>
            {m.id === meId
              ? !isOwner && <button className="hh-ghost-btn hh-danger" onClick={() => onLeave(m)}>Leave</button>
              : isOwner && <button className="hh-ghost-btn hh-danger" onClick={() => handleRemove(m)}>Remove</button>}
          </div>
        ))}
      </div>

      <form className="hh-panel" onSubmit={handleAdd}>
        <h3 className="hh-panel-title">Add someone without an account</h3>
        <p className="hh-note">For a parent, partner or flatmate who won’t use FinTrack. They can be paid for and share costs; if they sign up later they can join and claim their name.</p>
        <div className="hh-inline">
          <input className="hh-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Member name" />
          <button className="btn-primary" disabled={adding || !name.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserPlus size={14} /> Add
          </button>
        </div>
      </form>

      <div className="hh-panel">
        <h3 className="hh-panel-title">Invite people with an account</h3>
        <p className="hh-note">Share this code. They choose “Join with a code” on the Household page. Anyone with the code can join, so replace it if it gets shared too widely.</p>
        <div className="hh-inline">
          <div className="hh-code">{household.invite_code}</div>
          <button className="hh-ghost-btn" onClick={copyCode}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}</button>
          {isOwner && <button className="hh-ghost-btn" onClick={handleRotate} disabled={rotating}><RefreshCw size={14} /> Replace</button>}
        </div>
      </div>

      {isOwner && (
        <button className="hh-ghost-btn hh-danger" style={{ alignSelf: 'flex-start' }} onClick={onDeleteHousehold}>Delete this household</button>
      )}
    </div>
  )
}
