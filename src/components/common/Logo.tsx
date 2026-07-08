type LogoProps = { size?: number; withWordmark?: boolean; className?: string }

export function Logo({ size = 32, withWordmark = false, className }: LogoProps) {
  const gradId = 'ftShieldGrad'
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="FinTrack">
        <defs>
          <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#3E9B72" />
            <stop offset="0.6" stopColor="#4FA981" />
            <stop offset="1" stopColor="#C2A24E" />
          </linearGradient>
        </defs>
        <path
          d="M50 16 L82 28 V52 C82 72 68 84 50 90 C32 84 18 72 18 52 V28 Z"
          fill="none" stroke={`url(#${gradId})`} strokeWidth={5.5} strokeLinejoin="round"
        />
        <polyline
          points="33,59 45,47 55,55 69,37"
          fill="none" stroke={`url(#${gradId})`} strokeWidth={5.5}
          strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="69" cy="37" r="4.5" fill="#C2A24E" />
      </svg>
      {withWordmark && (
        <span
          className="logo-wordmark"
          style={{ fontSize: size * 0.9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1, whiteSpace: 'nowrap' }}
        >
          Fin<span className="text-grad">Track</span>
        </span>
      )}
    </span>
  )
}
