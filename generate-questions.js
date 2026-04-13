const fs = require('fs');
const path = require('path');

const extractedQuestions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'extracted-questions.json'), 'utf8')
);

const categories = [
  {
    id: 'personal-background',
    nameEn: 'Personal Background & Self-Awareness',
    nameZh: '个人背景与自我认知',
    subcategories: [
      { id: 'self-awareness', nameEn: 'Self-Awareness', nameZh: '自我认知', questions: [1, 2, 3, 4] },
      { id: 'team-fit', nameEn: 'Team Fit', nameZh: '团队适配', questions: [5, 6, 7] },
      { id: 'background-experience', nameEn: 'Background & Experience', nameZh: '背景与经验', questions: [8, 9, 10, 11, 12, 13, 14] },
    ],
  },
  {
    id: 'motivation-fit',
    nameEn: 'Job Motivation & Position Fit',
    nameZh: '求职动机与岗位匹配',
    subcategories: [
      { id: 'resignation-reasons', nameEn: 'Resignation Reasons (Experienced Only)', nameZh: '离职原因（社招专有）', questions: [15, 16, 17] },
      { id: 'company-industry', nameEn: 'Company / Industry Selection', nameZh: '公司/行业选择', questions: [18, 19, 20, 21, 22] },
      { id: 'position-fit', nameEn: 'Position Fit', nameZh: '岗位适配', questions: [23, 24, 25, 26, 27, 28, 29, 30] },
      { id: 'career-values', nameEn: 'Career Values', nameZh: '职业价值观', questions: [31, 32, 33, 34, 35, 36, 37] },
    ],
  },
  {
    id: 'cultural-fit',
    nameEn: 'Cultural Fit & Professional Ethics',
    nameZh: '文化适配与职业道德',
    subcategories: [
      { id: 'cultural-fit-main', nameEn: 'Cultural Fit & Professional Ethics', nameZh: '文化适配与职业道德', questions: [38, 39, 40, 41, 42, 43] },
    ],
  },
  {
    id: 'behavioral',
    nameEn: 'Behavioral Interview & Core Competencies',
    nameZh: '行为面试 & 核心能力评估',
    subcategories: [
      { id: 'task-management', nameEn: 'Task Management', nameZh: '任务管理', questions: [44, 45, 46, 47, 48] },
      { id: 'stress-management', nameEn: 'Stress Management', nameZh: '抗压能力', questions: [49, 50, 51, 52, 53, 54] },
      { id: 'problem-solving', nameEn: 'Problem Solving', nameZh: '问题解决', questions: [55, 56, 57, 58, 59, 60, 61, 62] },
      { id: 'leadership', nameEn: 'Leadership', nameZh: '领导力', questions: [63, 64, 65, 66] },
      { id: 'teamwork', nameEn: 'Teamwork', nameZh: '团队协作', questions: [67, 68, 69, 70, 71] },
      { id: 'adaptability-innovation', nameEn: 'Adaptability & Innovation', nameZh: '适应与创新', questions: [72, 73, 74, 75, 76, 77, 78] },
      { id: 'communication', nameEn: 'Communication', nameZh: '沟通能力', questions: [79, 80, 81, 82, 83] },
      { id: 'learning', nameEn: 'Learning', nameZh: '学习能力', questions: [84, 85, 86] },
    ],
  },
  {
    id: 'situational',
    nameEn: 'Situational Interview',
    nameZh: '情景模拟',
    subcategories: [
      { id: 'resource-optimization', nameEn: 'Resource Optimization', nameZh: '资源优化', questions: [87, 88] },
      { id: 'conflict-resolution', nameEn: 'Conflict Resolution', nameZh: '冲突解决', questions: [89, 90, 91, 92] },
      { id: 'business-insight', nameEn: 'Business Insight', nameZh: '商业洞察', questions: [93] },
    ],
  },
  {
    id: 'career-planning',
    nameEn: 'Career Planning',
    nameZh: '职业规划',
    subcategories: [
      { id: 'short-term', nameEn: 'Short-Term Planning', nameZh: '短期规划', questions: [94, 95] },
      { id: 'long-term', nameEn: 'Long-Term Vision', nameZh: '长期愿景', questions: [96, 97] },
      { id: 'skill-development', nameEn: 'Skill Development', nameZh: '能力提升', questions: [98, 99] },
      { id: 'team-contribution', nameEn: 'Team Contribution', nameZh: '团队贡献', questions: [100, 101] },
      { id: 'success-criteria', nameEn: 'Success Criteria', nameZh: '成功标准', questions: [102, 103] },
    ],
  },
  {
    id: 'hiring-communication',
    nameEn: 'Hiring Communication',
    nameZh: '录用沟通',
    subcategories: [
      { id: 'salary-negotiation', nameEn: 'Salary & Benefits', nameZh: '薪资与福利', questions: [104] },
      { id: 'availability', nameEn: 'Availability & Logistics', nameZh: '入职时间与安排', questions: [105, 106, 107] },
      { id: 'closing', nameEn: 'Closing Questions', nameZh: '结束语', questions: [108] },
    ],
  },
];

const tagMapping = {
  1: ['self-introduction'], 2: ['self-introduction', 'strengths-weaknesses'], 3: ['strengths-weaknesses'], 4: ['strengths-weaknesses'],
  5: ['teamwork'], 6: ['teamwork'], 7: ['teamwork'],
  8: ['background'], 9: ['background'], 10: ['background'], 11: ['background'], 12: ['background', 'learning'], 13: ['background'], 14: ['background'],
  15: ['motivation-fit'], 16: ['motivation-fit'], 17: ['motivation-fit'],
  18: ['motivation-fit'], 19: ['motivation-fit'], 20: ['motivation-fit'], 21: ['motivation-fit'], 22: ['motivation-fit'],
  23: ['motivation-fit'], 24: ['motivation-fit'], 25: ['motivation-fit'], 26: ['motivation-fit'], 27: ['motivation-fit'], 28: ['motivation-fit'], 29: ['motivation-fit'], 30: ['motivation-fit'],
  31: ['motivation-fit'], 32: ['motivation-fit'], 33: ['motivation-fit'], 34: ['motivation-fit'], 35: ['motivation-fit', 'career-planning'], 36: ['motivation-fit'], 37: ['motivation-fit'],
  38: ['cultural-fit'], 39: ['cultural-fit', 'teamwork'], 40: ['cultural-fit', 'communication'], 41: ['cultural-fit', 'adaptability'], 42: ['cultural-fit'], 43: ['cultural-fit'],
  44: ['behavioral', 'problem-solving'], 45: ['behavioral'], 46: ['behavioral'], 47: ['behavioral'], 48: ['behavioral', 'problem-solving'],
  49: ['stress'], 50: ['stress'], 51: ['stress', 'problem-solving'], 52: ['stress', 'learning'], 53: ['stress'], 54: ['stress', 'communication'],
  55: ['problem-solving'], 56: ['problem-solving'], 57: ['problem-solving', 'adaptability'], 58: ['problem-solving'], 59: ['problem-solving', 'stress'], 60: ['problem-solving'], 61: ['problem-solving', 'communication', 'teamwork'], 62: ['problem-solving', 'background'],
  63: ['leadership'], 64: ['leadership', 'teamwork'], 65: ['leadership', 'teamwork'], 66: ['leadership'],
  67: ['teamwork'], 68: ['teamwork', 'communication'], 69: ['teamwork', 'communication'], 70: ['teamwork'], 71: ['teamwork'],
  72: ['adaptability'], 73: ['adaptability'], 74: ['adaptability'], 75: ['problem-solving'], 76: ['adaptability'], 77: ['background'], 78: ['problem-solving'],
  79: ['communication'], 80: ['communication'], 81: ['communication'], 82: ['communication'], 83: ['communication'],
  84: ['learning'], 85: ['learning'], 86: ['learning', 'problem-solving'],
  87: ['problem-solving'], 88: ['problem-solving'],
  89: ['communication', 'problem-solving'], 90: ['communication', 'problem-solving'], 91: ['teamwork', 'communication'], 92: ['communication'],
  93: ['motivation-fit'],
  94: ['career-planning'], 95: ['career-planning'], 96: ['career-planning'], 97: ['career-planning', 'motivation-fit'], 98: ['career-planning', 'learning'], 99: ['career-planning', 'learning'], 100: ['career-planning', 'teamwork'], 101: ['career-planning', 'adaptability'], 102: ['career-planning'], 103: ['career-planning'],
  104: ['salary-negotiation'], 105: ['salary-negotiation'], 106: ['salary-negotiation'], 107: ['salary-negotiation'], 108: ['motivation-fit'],
};

const campusApplicable = { 11: false, 12: false, 13: false, 14: false, 15: false, 16: false, 17: false, 45: false, 66: false, 105: false, 106: false };

function getQuestionByNum(num) {
  return extractedQuestions.find(q => q.num === num);
}

function escapeStr(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function generateQuestion(num, catId, subId) {
  const q = getQuestionByNum(num);
  if (!q) return '';
  
  const tags = tagMapping[num] || [];
  const isCampus = campusApplicable[num] !== false;
  const similarArr = q.similarQuestions ? q.similarQuestions.split('\n\n').filter(s => s.trim()) : [];
  
  let obj = `          {
            id: 'q${num}',
            category: '${catId}',
            subcategory: '${subId}',
            questionEn: '${escapeStr(q.questionEn)}',
            questionZh: '${escapeStr(q.questionZh)}',
            tags: ${JSON.stringify(tags)},
            isCampusApplicable: ${isCampus},`;
  
  if (similarArr.length > 0) obj += `\n            similarQuestions: ${JSON.stringify(similarArr)},`;
  if (q.questionIntent) obj += `\n            questionIntent: '${escapeStr(q.questionIntent)}',`;
  if (q.answerStrategy) obj += `\n            answerStrategy: '${escapeStr(q.answerStrategy)}',`;
  if (q.notes) obj += `\n            notes: '${escapeStr(q.notes)}',`;
  
  obj += `\n          }`;
  return obj;
}

let content = `import { QuestionCategory, QuestionTag, QuestionItem, UserMode } from '@/types'

export const questionCategories: QuestionCategory[] = [
`;

categories.forEach(cat => {
  content += `  {
    id: '${cat.id}',
    nameEn: '${cat.nameEn}',
    nameZh: '${cat.nameZh}',
    subcategories: [
`;
  cat.subcategories.forEach(sub => {
    content += `      {
        id: '${sub.id}',
        nameEn: '${sub.nameEn}',
        nameZh: '${sub.nameZh}',
        questions: [
${sub.questions.map(n => generateQuestion(n, cat.id, sub.id)).join(',\n')}
        ],
      },
`;
  });
  content += `    ],
  },
`;
});

content += `]

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

export const allTags: QuestionTag[] = [
  'self-introduction',
  'strengths-weaknesses',
  'motivation-fit',
  'behavioral',
  'teamwork',
  'stress',
  'leadership',
  'career-planning',
  'salary-negotiation',
  'background',
  'problem-solving',
  'communication',
  'learning',
  'adaptability',
  'cultural-fit',
]

export const tagLabels: Record<QuestionTag, { en: string; zh: string }> = {
  'self-introduction': { en: 'Self Introduction', zh: '自我介绍' },
  'strengths-weaknesses': { en: 'Strengths & Weaknesses', zh: '优势弱点' },
  'motivation-fit': { en: 'Motivation & Fit', zh: '动机匹配' },
  behavioral: { en: 'Behavioral', zh: '行为面试' },
  teamwork: { en: 'Teamwork', zh: '团队协作' },
  stress: { en: 'Stress Management', zh: '抗压能力' },
  leadership: { en: 'Leadership', zh: '领导力' },
  'career-planning': { en: 'Career Planning', zh: '职业规划' },
  'salary-negotiation': { en: 'Salary & Hiring', zh: '薪资录用' },
  background: { en: 'Background', zh: '背景经历' },
  'problem-solving': { en: 'Problem Solving', zh: '问题解决' },
  communication: { en: 'Communication', zh: '沟通能力' },
  learning: { en: 'Learning', zh: '学习能力' },
  adaptability: { en: 'Adaptability', zh: '适应能力' },
  'cultural-fit': { en: 'Cultural Fit', zh: '文化适配' },
}
`;

fs.writeFileSync(path.join(__dirname, 'src/data/questions.ts'), content, 'utf8');
console.log('Generated questions.ts with detailed info for all 108 questions');
