import { useAuthStore } from '@/stores/authStore'

// Demo mode has no real `profiles` row, so it's never expenses-only — the
// fixed demo dataset always shows the full income+expenses experience.
export function useIsExpensesOnly() {
  return useAuthStore((s) => s.profile?.transaction_mode === 'expenses_only')
}
