import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  isLoading: boolean
  credits: number
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setCredits: (credits: number) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,
  credits: 0,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCredits: (credits) => set({ credits }),
}))
