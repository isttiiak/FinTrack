// Shown while a lazily-split route's JS chunk is still downloading (TODO.md
// §4.1). TanStack Router only renders this after its own default pending
// delay, so a fast/cached chunk load never flashes it.
export default function RoutePendingFallback() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          border: '2px solid rgba(79, 169, 129, 0.3)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'route-pending-spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes route-pending-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
