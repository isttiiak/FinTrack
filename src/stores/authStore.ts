import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/database.types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ session: null, user: null, profile: null }),
}))
