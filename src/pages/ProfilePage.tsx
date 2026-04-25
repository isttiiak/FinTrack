import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'

export default function ProfilePage() {
  const { profile } = useAuthStore()
  const isDemo = useDemoStore((s) => s.isDemo)

  const displayName = isDemo ? 'Demo User' : (profile?.full_name ?? 'You')
  const displayEmail = isDemo ? 'demo@fintrack.app' : (profile?.email ?? '')

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your name, avatar, currency and timezone</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          {profile?.avatar_url && !isDemo ? (
            <img src={profile.avatar_url} alt={displayName} />
          ) : (
            <span>{displayName[0].toUpperCase()}</span>
          )}
        </div>
        <div>
          <div className="profile-name">{displayName}</div>
          <div className="profile-email">{displayEmail}</div>
        </div>
      </div>

      <div className="settings-placeholder" style={{ marginTop: 16 }}>
        Profile editing — name, avatar, currency, timezone — coming soon.
      </div>

      <style>{`.page-container{max-width:700px}.page-title{font-size:28px;font-weight:700;color:var(--text-primary);margin:0 0 4px}.page-subtitle{font-size:14px;color:var(--text-secondary);margin:0}.profile-card{display:flex;align-items:center;gap:16px;padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:16px}.profile-avatar{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6C63FF,#A855F7);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden}.profile-avatar img{width:100%;height:100%;object-fit:cover}.profile-name{font-size:18px;font-weight:600;color:var(--text-primary)}.profile-email{font-size:13px;color:var(--text-secondary)}.settings-placeholder{padding:20px;background:var(--bg-elevated);border:1px dashed var(--border);border-radius:12px;font-size:13px;color:var(--text-muted)}`}</style>
    </motion.div>
  )
}
