export type QuestionTag =
  | 'self-introduction'
  | 'strengths-weaknesses'
  | 'motivation-fit'
  | 'behavioral'
  | 'teamwork'
  | 'stress'
  | 'leadership'
  | 'career-planning'
  | 'salary-negotiation'
  | 'background'
  | 'problem-solving'
  | 'communication'
  | 'learning'
  | 'adaptability'
  | 'cultural-fit'
  | 'situational'

export interface QuestionItem {
  id: string
  category: string
  subcategory: string
  questionEn: string
  questionZh: string
  tags: QuestionTag[]
  isCampusApplicable: boolean
  similarQuestions?: string[]
  questionIntent?: string
  questionIntentZh?: string
  questionIntentEn?: string
  answerStrategy?: string
  notes?: string
}

export interface QuestionCategory {
  id: string
  nameEn: string
  nameZh: string
  subcategories: QuestionSubcategory[]
}

export interface QuestionSubcategory {
  id: string
  nameEn: string
  nameZh: string
  questions: QuestionItem[]
}

export type AnswerStatus = 'idle' | 'generating' | 'done' | 'error' | 'cancelled'

export interface AnswerItem {
  questionId: string
  answerZh: string
  answerEn: string
  editedZh?: string
  editedEn?: string
  status: AnswerStatus
  sourceHighlights?: string[]
  highlightsZh?: string[]
  highlightsEn?: string[]
  updatedAt?: string
  error?: string
}

export interface UploadedDocument {
  id: string
  name: string
  type: string
  size: number
  extractedText: string
  uploadedAt: string
}

export type UserMode = 'campus' | 'experienced'

export type UILanguage = 'zh' | 'en'

export type DisplayLanguage = 'zh' | 'en'

export interface AppState {
  userMode: UserMode
  uiLanguage: UILanguage
  documents: UploadedDocument[]
  jobDescription: UploadedDocument | null
  answers: Record<string, AnswerItem>
  isGenerating: boolean
  currentGeneratingId: string | null
  stopGeneration: boolean
  showFilteredQuestions: boolean
  selectedTags: QuestionTag[]
  searchQuery: string
  expandedCategories: string[]
}

export interface GenerateAnswerRequest {
  question: QuestionItem
  userDocuments: UploadedDocument[]
  userMode: UserMode
  displayLanguage: DisplayLanguage
}

export interface GenerateAnswerResponse {
  answerZh: string
  answerEn: string
  highlightsZh: string[]
  highlightsEn: string[]
}

export interface ExportData {
  userMode: UserMode
  documents: UploadedDocument[]
  questions: QuestionItem[]
  answers: Record<string, AnswerItem>
  exportedAt: string
}

export interface AnswerHistoryItem {
  id: string
  userId: string
  questionId: string
  answerZh: string
  answerEn: string
  createdAt: string
  updatedAt: string
}
