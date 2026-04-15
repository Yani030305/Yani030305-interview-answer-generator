import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { AnswerHistoryItem } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  isLoading: boolean
  credits: number
  answerHistory: AnswerHistoryItem[]
  historyLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setCredits: (credits: number) => void
  setAnswerHistory: (history: AnswerHistoryItem[]) => void
  setHistoryLoading: (loading: boolean) => void
  addAnswerHistory: (item: AnswerHistoryItem) => void
  removeAnswerHistory: (id: string) => void
  clearAnswerHistory: () => void
  fetchAnswerHistory: (userId?: string) => Promise<void>
  refreshCredits: (userId?: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: false,
  credits: 0,
  answerHistory: [],
  historyLoading: false,

  setUser: (user) => set({ user }),

  setLoading: (loading) => set({ isLoading: loading }),

  setCredits: (credits) => set({ credits }),

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
      // 添加超时处理
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

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
        // 不重置历史记录，保持当前值
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
      // 不重置历史记录，保持当前值
    } finally {
      set({ historyLoading: false })
    }
  },

  refreshCredits: async (userId?: string) => {
    const targetUserId = userId || get().user?.id
    if (!targetUserId) return

    try {
      // 添加超时处理
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', targetUserId)
        .single()

      clearTimeout(timeoutId)

      if (!error && data) {
        set({ credits: (data as any).credits ?? 0 })
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('Refresh credits timeout')
      } else {
        console.error('Error refreshing credits:', error)
      }
      // 不重置积分，保持当前值
    }
  },
}))