interface SkeletonCardProps {
  lines?: number
  height?: number
}

export default function SkeletonCard({ lines = 3, height = 80 }: SkeletonCardProps) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      height,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      justifyContent: 'center',
    }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: 12,
            borderRadius: 6,
            width: i === 0 ? '60%' : i === lines - 1 ? '40%' : '85%',
          }}
        />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} height={68} />
      ))}
    </div>
  )
}
