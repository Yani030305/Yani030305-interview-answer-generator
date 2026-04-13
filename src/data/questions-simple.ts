import { QuestionCategory, QuestionTag, QuestionItem, UserMode } from '@/types'

export const questionCategories: QuestionCategory[] = [
  {
    id: 'personal-background',
    nameEn: 'Personal Background & Self-Awareness',
    nameZh: '个人背景与自我认知',
    subcategories: [
      {
        id: 'self-awareness',
        nameEn: 'Self-Awareness',
        nameZh: '自我认知',
        questions: [
          {
            id: 'q1',
            category: 'personal-background',
            subcategory: 'self-awareness',
            questionEn: 'Tell me about yourself.',
            questionZh: '跟我介绍一下你自己',
            tags: ['self-introduction'],
            isCampusApplicable: true,
          },
        ],
      },
    ],
  },
]

export const tagLabels: Record<QuestionTag, { en: string; zh: string }> = {
  'self-introduction': { en: 'Self Introduction', zh: '自我介绍' },
  'strengths-weaknesses': { en: 'Strengths & Weaknesses', zh: '优缺点' },
  'motivation-fit': { en: 'Motivation & Fit', zh: '动机与匹配度' },
  'behavioral': { en: 'Behavioral', zh: '行为面试' },
  'teamwork': { en: 'Teamwork', zh: '团队协作' },
  'stress': { en: 'Stress Management', zh: '抗压能力' },
  'leadership': { en: 'Leadership', zh: '领导力' },
  'career-planning': { en: 'Career Planning', zh: '职业规划' },
  'salary-negotiation': { en: 'Salary Negotiation', zh: '薪资谈判' },
  'background': { en: 'Background', zh: '背景经历' },
  'problem-solving': { en: 'Problem Solving', zh: '问题解决' },
  'communication': { en: 'Communication', zh: '沟通能力' },
  'learning': { en: 'Learning', zh: '学习能力' },
  'adaptability': { en: 'Adaptability', zh: '适应能力' },
  'cultural-fit': { en: 'Cultural Fit', zh: '文化适配' },
  'situational': { en: 'Situational', zh: '情景模拟' },
}

export function getAllQuestions(): QuestionItem[] {
  const questions: QuestionItem[] = []
  questionCategories.forEach((category) => {
    category.subcategories.forEach((subcategory) => {
      questions.push(...subcategory.questions)
    })
  })
  return questions
}

export function getQuestionsByCategory(categoryId: string): QuestionItem[] {
  const category = questionCategories.find((c) => c.id === categoryId)
  if (!category) return []
  const questions: QuestionItem[] = []
  category.subcategories.forEach((subcategory) => {
    questions.push(...subcategory.questions)
  })
  return questions
}

export function filterQuestionsByMode(
  questions: QuestionItem[],
  mode: UserMode,
  showFiltered: boolean
): QuestionItem[] {
  if (mode === 'experienced' || showFiltered) {
    return questions
  }
  return questions.filter((q) => q.isCampusApplicable)
}

export function filterQuestionsByTags(
  questions: QuestionItem[],
  tags: QuestionTag[]
): QuestionItem[] {
  if (tags.length === 0) return questions
  return questions.filter((q) => q.tags.some((tag) => tags.includes(tag)))
}

export function searchQuestions(
  questions: QuestionItem[],
  query: string
): QuestionItem[] {
  if (!query.trim()) return questions
  const lowerQuery = query.toLowerCase()
  return questions.filter(
    (q) =>
      q.questionEn.toLowerCase().includes(lowerQuery) ||
      q.questionZh.toLowerCase().includes(lowerQuery)
  )
}