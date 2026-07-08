import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'

// Thrown by a mutationFn when isDemo blocks the write — onError handlers
// check for this type and swallow it (the toast was already shown here),
// instead of surfacing it as a generic error.
export class DemoBlockedError extends Error {
  constructor() {
    super('Demo mode — changes are not saved')
    this.name = 'DemoBlockedError'
  }
}

// Call the returned function at the top of a mutationFn. Throws
// DemoBlockedError (which rejects the mutation) after showing the toast,
// so the real Supabase call is never reached in demo mode.
export function useDemoGuard() {
  const isDemo = useDemoStore((s) => s.isDemo)
  const addToast = useUIStore((s) => s.addToast)

  return function guardDemo() {
    if (isDemo) {
      addToast({ type: 'info', message: 'Demo mode — changes are not saved' })
      throw new DemoBlockedError()
    }
  }
}
