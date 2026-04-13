import { create } from 'zustand'
import {
  AppState,
  UserMode,
  UILanguage,
  UploadedDocument,
  AnswerItem,
  QuestionTag,
  AnswerStatus,
} from '@/types'

interface AppStore extends AppState {
  setUserMode: (mode: UserMode) => void
  setUILanguage: (lang: UILanguage) => void
  addDocument: (doc: UploadedDocument) => void
  removeDocument: (id: string) => void
  clearDocuments: () => void
  setJobDescription: (doc: UploadedDocument | null) => void
  clearJobDescription: () => void
  setAnswer: (questionId: string, answer: AnswerItem) => void
  updateAnswer: (questionId: string, updates: Partial<AnswerItem>) => void
  setAnswerStatus: (questionId: string, status: AnswerStatus) => void
  setIsGenerating: (isGenerating: boolean, questionId?: string | null) => void
  setStopGeneration: (stop: boolean) => void
  setShowFilteredQuestions: (show: boolean) => void
  setSelectedTags: (tags: QuestionTag[]) => void
  toggleTag: (tag: QuestionTag) => void
  setSearchQuery: (query: string) => void
  toggleCategory: (categoryId: string) => void
  expandAllCategories: () => void
  collapseAllCategories: () => void
  getAnswer: (questionId: string) => AnswerItem | undefined
  getGeneratedCount: () => number
  clearAllAnswers: () => void
}

const initialExpandedCategories = [
  'personal-background',
  'motivation-fit',
  'behavioral',
]

export const useAppStore = create<AppStore>()((set, get) => ({
  userMode: 'campus',
  uiLanguage: 'zh',
  documents: [],
  jobDescription: null,
  answers: {},
  isGenerating: false,
  currentGeneratingId: null,
  stopGeneration: false,
  showFilteredQuestions: false,
  selectedTags: [],
  searchQuery: '',
  expandedCategories: initialExpandedCategories,

  setUserMode: (mode) => set({ userMode: mode }),

  setUILanguage: (lang) => set({ uiLanguage: lang }),

  addDocument: (doc) =>
    set((state) => ({
      documents: [...state.documents, doc],
    })),

  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    })),

  clearDocuments: () => set({ documents: [] }),

  setJobDescription: (doc) => set({ jobDescription: doc }),

  clearJobDescription: () => set({ jobDescription: null }),

  setAnswer: (questionId, answer) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: answer,
      },
    })),

  updateAnswer: (questionId, updates) =>
    set((state) => {
      const existing = state.answers[questionId]
      if (!existing) return state
      return {
        answers: {
          ...state.answers,
          [questionId]: { ...existing, ...updates },
        },
      }
    }),

  setAnswerStatus: (questionId, status) =>
    set((state) => {
      const existing = state.answers[questionId]
      return {
        answers: {
          ...state.answers,
          [questionId]: {
            ...existing,
            questionId,
            status,
            updatedAt: new Date().toISOString(),
          },
        },
      }
    }),

  setIsGenerating: (isGenerating, questionId = null) =>
    set({
      isGenerating,
      currentGeneratingId: questionId,
      stopGeneration: false,
    }),

  setStopGeneration: (stop) => set({ stopGeneration: stop }),

  setShowFilteredQuestions: (show) =>
    set({ showFilteredQuestions: show }),

  setSelectedTags: (tags) => set({ selectedTags: tags }),

  toggleTag: (tag) =>
    set((state) => {
      const isSelected = state.selectedTags.includes(tag)
      return {
        selectedTags: isSelected
          ? state.selectedTags.filter((t) => t !== tag)
          : [...state.selectedTags, tag],
      }
    }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleCategory: (categoryId) =>
    set((state) => {
      const isExpanded = state.expandedCategories.includes(categoryId)
      return {
        expandedCategories: isExpanded
          ? state.expandedCategories.filter((id) => id !== categoryId)
          : [...state.expandedCategories, categoryId],
      }
    }),

  expandAllCategories: () =>
    set({
      expandedCategories: [
        'personal-background',
        'motivation-fit',
        'cultural-fit',
        'behavioral',
        'situational',
        'career-planning',
        'hiring-communication',
      ],
    }),

  collapseAllCategories: () => set({ expandedCategories: [] }),

  getAnswer: (questionId) => get().answers[questionId],

  getGeneratedCount: () => {
    const answers = get().answers
    return Object.values(answers).filter((a) => a.status === 'done').length
  },

  clearAllAnswers: () => set({ answers: {} }),
}))