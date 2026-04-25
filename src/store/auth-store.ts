import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { AnswerHistoryItem } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  // 三态：initializing | authenticated | unauthenticated
  authStatus: 'initializing' | 'authenticated' | 'unauthenticated'
  user: User | null
  credits: number
  accessToken: string | null
  answerHistory: AnswerHistoryItem[]
  historyLoading: boolean
  
  setUser: (user: User | null) => void
  setAuthStatus: (status: 'initializing' | 'authenticated' | 'unauthenticated') => void
  setCredits: (credits: number) => void
  setAccessToken: (token: string | null) => void
  setAnswerHistory: (history: AnswerHistoryItem[]) => void
  setHistoryLoading: (loading: boolean) => void
  addAnswerHistory: (item: AnswerHistoryItem) => void
  removeAnswerHistory: (id: string) => void
  clearAnswerHistory: () => void
  fetchAnswerHistory: (userId?: string) => Promise<void>
  refreshCredits: (userId?: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  authStatus: 'initializing', // 明确三态
  user: null,
  credits: 0,
  accessToken: null,
  answerHistory: [],
  historyLoading: false,

  setUser: (user) => {
    console.log('[AuthStore] setUser called', user ? user.id : 'null')
    set({ user })
  },

  setAuthStatus: (status) => {
    console.log('[AuthStore] setAuthStatus:', status)
    set({ authStatus: status })
  },

  setCredits: (credits) => {
    console.log('[AuthStore] setCredits called', credits)
    set({ credits })
  },

  setAccessToken: (token) => {
    console.log('[AuthStore] setAccessToken called', token ? 'has token' : 'no token')
    set({ accessToken: token })
  },

  setAnswerHistory: (history) => set({ answerHistory: history }),

  setHistoryLoading: (loading) => set({ historyLoading: loading }),

  addAnswerHistory: (item) =>
    set((state) => ({
      answerHistory: [item, ...state.answerHistory],
    })),

  removeAnswerHistory: (id) =>
    set((state) => ({
      answerHistory: state.answerHistory.filter((item) => item.id !== id),
    })),

  clearAnswerHistory: () => set({ answerHistory: [] }),

  fetchAnswerHistory: async (userId?: string) => {
    const targetUserId = userId || get().user?.id
    if (!targetUserId) {
      set({ answerHistory: [], historyLoading: false })
      return
    }

    set({ historyLoading: true })

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(
        `/api/answer-history?userId=${encodeURIComponent(targetUserId)}`,
        {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error('Failed to fetch answer history:', response.status)
        return
      }

      const data = await response.json()
      set({ answerHistory: data.history || [] })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('Fetch answer history timeout')
      } else {
        console.error('Error fetching answer history:', error)
      }
    } finally {
      set({ historyLoading: false })
    }
  },

  refreshCredits: async (userId?: string) => {
    const targetUserId = userId || get().user?.id
    if (!targetUserId) return

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', targetUserId)
        .single()

      clearTimeout(timeoutId)

      if (!error && data) {
        set({ credits: (data as any).credits || 0 })
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('Refresh credits timeout')
      } else {
        console.error('Error refreshing credits:', error)
      }
    }
  },
}))
