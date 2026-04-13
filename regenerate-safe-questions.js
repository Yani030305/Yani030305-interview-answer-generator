const fs = require('fs');
const path = require('path');

const extractedPath = path.join(__dirname, 'extracted-questions.json');
const outputPath = path.join(__dirname, 'src', 'data', 'questions.ts');

const extractedData = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

// Create a map for easy lookup
const questionMap = {};
extractedData.forEach(q => {
  questionMap[q.id] = q;
});

// Original structure (we'll keep the structure and just update the content)
const originalContent = fs.readFileSync(outputPath, 'utf8');

// Function to escape string for TypeScript
function escapeTsString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

// Generate a safe TypeScript file
let result = `import { QuestionCategory, QuestionTag, QuestionItem, UserMode } from '@/types'

export const questionCategories: QuestionCategory[] = [
`;

// Let's reconstruct the file properly using the extracted data
// First, let's define the categories structure manually with safe string handling
const categories = [
  {
    id: 'personal-background',
    nameEn: 'Personal Background & Self-Awareness',
    nameZh: '个人背景与自我认知',
    subcategories: [
      { id: 'self-awareness', nameEn: 'Self-Awareness', nameZh: '自我认知', questions: ['q1', 'q2', 'q3', 'q4'] },
      { id: 'team-fit', nameEn: 'Team Fit', nameZh: '团队适配', questions: ['q5', 'q6', 'q7'] },
      { id: 'background-experience', nameEn: 'Background & Experience', nameZh: '背景与经验', questions: ['q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14'] },
    ]
  },
  {
    id: 'motivation-fit',
    nameEn: 'Job Motivation & Position Fit',
    nameZh: '求职动机与岗位匹配',
    subcategories: [
      { id: 'resignation-reasons', nameEn: 'Resignation Reasons (Experienced Only)', nameZh: '离职原因（社招专有）', questions: ['q15', 'q16', 'q17'] },
      { id: 'company-industry', nameEn: 'Company / Industry Selection', nameZh: '公司/行业选择', questions: ['q18', 'q19', 'q20', 'q21', 'q22'] },
      { id: 'position-fit', nameEn: 'Position Fit', nameZh: '岗位适配', questions: ['q23', 'q24', 'q25', 'q26', 'q27', 'q28', 'q29', 'q30'] },
      { id: 'career-values', nameEn: 'Career Values', nameZh: '职业价值观', questions: ['q31', 'q32', 'q33', 'q34', 'q35', 'q36', 'q37'] },
    ]
  },
  {
    id: 'cultural-fit',
    nameEn: 'Cultural Fit & Ethics',
    nameZh: '文化适配与职业道德',
    subcategories: [
      { id: 'cultural-fit', nameEn: 'Cultural Fit', nameZh: '文化适配', questions: ['q38', 'q39', 'q40', 'q41'] },
      { id: 'ethics', nameEn: 'Ethics', nameZh: '职业道德', questions: ['q42', 'q43'] },
    ]
  },
  {
    id: 'behavioral',
    nameEn: 'Behavioral Interview & Core Competencies',
    nameZh: '行为面试 & 核心能力评估',
    subcategories: [
      { id: 'task-management', nameEn: 'Task Management', nameZh: '任务管理', questions: ['q44', 'q45', 'q46', 'q47', 'q48'] },
      { id: 'stress-resilience', nameEn: 'Stress & Resilience', nameZh: '抗压能力', questions: ['q49', 'q50', 'q51', 'q52', 'q53', 'q54'] },
      { id: 'problem-solving', nameEn: 'Problem Solving', nameZh: '问题解决', questions: ['q55', 'q56', 'q57', 'q58', 'q59', 'q60', 'q61', 'q62'] },
      { id: 'leadership', nameEn: 'Leadership', nameZh: '领导力', questions: ['q63', 'q64', 'q65', 'q66'] },
      { id: 'teamwork', nameEn: 'Team Collaboration', nameZh: '团队协作', questions: ['q67', 'q68', 'q69', 'q70', 'q71'] },
      { id: 'adaptation-innovation', nameEn: 'Adaptation & Innovation', nameZh: '适应与创新', questions: ['q72', 'q73', 'q74', 'q75', 'q76', 'q77', 'q78'] },
      { id: 'communication', nameEn: 'Communication Skills', nameZh: '沟通能力', questions: ['q79', 'q80', 'q81', 'q82', 'q83'] },
      { id: 'learning', nameEn: 'Learning Ability', nameZh: '学习能力', questions: ['q84', 'q85', 'q86'] },
    ]
  },
  {
    id: 'situational',
    nameEn: 'Situational Questions',
    nameZh: '情景模拟',
    subcategories: [
      { id: 'resource-optimization', nameEn: 'Resource Optimization', nameZh: '资源优化', questions: ['q87', 'q88'] },
      { id: 'conflict-resolution', nameEn: 'Conflict Resolution', nameZh: '冲突解决', questions: ['q89', 'q90', 'q91', 'q92'] },
      { id: 'business-insight', nameEn: 'Business Insight', nameZh: '商业洞察', questions: ['q93'] },
    ]
  },
  {
    id: 'career-planning',
    nameEn: 'Career Planning',
    nameZh: '职业规划',
    subcategories: [
      { id: 'short-term', nameEn: 'Short-term Goals', nameZh: '短期规划', questions: ['q94', 'q95'] },
      { id: 'long-term', nameEn: 'Long-term Vision', nameZh: '长期愿景', questions: ['q96', 'q97'] },
      { id: 'skill-development', nameEn: 'Skill Development', nameZh: '能力提升', questions: ['q98', 'q99'] },
      { id: 'team-contribution', nameEn: 'Team Contribution', nameZh: '团队贡献', questions: ['q100', 'q101'] },
      { id: 'success-criteria', nameEn: 'Success Criteria', nameZh: '成功标准', questions: ['q102', 'q103'] },
    ]
  },
  {
    id: 'hiring-communication',
    nameEn: 'Hiring Communication',
    nameZh: '录用沟通',
    subcategories: [
      { id: 'salary-negotiation', nameEn: 'Salary & Benefits', nameZh: '薪资与福利', questions: ['q104'] },
      { id: 'availability', nameEn: 'Availability & Logistics', nameZh: '入职时间与安排', questions: ['q105', 'q106', 'q107'] },
      { id: 'closing', nameEn: 'Closing Questions', nameZh: '结束语', questions: ['q108'] },
    ]
  },
];

// Tag mapping
const tagMapping = {
  'q1': ['self-introduction'],
  'q2': ['self-introduction', 'strengths-weaknesses'],
  'q3': ['strengths-weaknesses'],
  'q4': ['strengths-weaknesses'],
  'q5': ['teamwork'],
  'q6': ['teamwork'],
  'q7': ['teamwork'],
  'q8': ['background'],
  'q9': ['background'],
  'q10': ['background'],
  'q11': ['background'],
  'q12': ['background', 'learning'],
  'q13': ['background'],
  'q14': ['background'],
  'q15': ['motivation-fit'],
  'q16': ['motivation-fit'],
  'q17': ['motivation-fit'],
  'q18': ['motivation-fit'],
  'q19': ['motivation-fit'],
  'q20': ['motivation-fit'],
  'q21': ['motivation-fit'],
  'q22': ['motivation-fit'],
  'q23': ['motivation-fit'],
  'q24': ['motivation-fit'],
  'q25': ['motivation-fit'],
  'q26': ['motivation-fit'],
  'q27': ['motivation-fit'],
  'q28': ['motivation-fit'],
  'q29': ['motivation-fit'],
  'q30': ['motivation-fit'],
  'q31': ['motivation-fit'],
  'q32': ['motivation-fit'],
  'q33': ['motivation-fit'],
  'q34': ['motivation-fit'],
  'q35': ['motivation-fit'],
  'q36': ['motivation-fit'],
  'q37': ['motivation-fit'],
  'q38': ['cultural-fit'],
  'q39': ['cultural-fit'],
  'q40': ['cultural-fit'],
  'q41': ['cultural-fit'],
  'q42': ['cultural-fit'],
  'q43': ['cultural-fit'],
  'q44': ['behavioral'],
  'q45': ['behavioral'],
  'q46': ['behavioral'],
  'q47': ['behavioral'],
  'q48': ['behavioral'],
  'q49': ['stress'],
  'q50': ['stress'],
  'q51': ['stress'],
  'q52': ['stress'],
  'q53': ['stress'],
  'q54': ['stress'],
  'q55': ['problem-solving'],
  'q56': ['problem-solving'],
  'q57': ['problem-solving', 'adaptability'],
  'q58': ['problem-solving'],
  'q59': ['problem-solving', 'stress'],
  'q60': ['problem-solving'],
  'q61': ['problem-solving', 'communication', 'teamwork'],
  'q62': ['problem-solving', 'background'],
  'q63': ['leadership'],
  'q64': ['leadership', 'teamwork'],
  'q65': ['leadership'],
  'q66': ['leadership'],
  'q67': ['teamwork'],
  'q68': ['teamwork'],
  'q69': ['teamwork'],
  'q70': ['teamwork'],
  'q71': ['teamwork'],
  'q72': ['adaptability'],
  'q73': ['adaptability'],
  'q74': ['adaptability'],
  'q75': ['adaptability'],
  'q76': ['adaptability'],
  'q77': ['adaptability'],
  'q78': ['adaptability'],
  'q79': ['communication'],
  'q80': ['communication'],
  'q81': ['communication'],
  'q82': ['communication'],
  'q83': ['communication'],
  'q84': ['learning'],
  'q85': ['learning'],
  'q86': ['learning'],
  'q87': ['situational'],
  'q88': ['situational'],
  'q89': ['situational'],
  'q90': ['situational'],
  'q91': ['situational'],
  'q92': ['situational'],
  'q93': ['situational'],
  'q94': ['career-planning'],
  'q95': ['career-planning'],
  'q96': ['career-planning'],
  'q97': ['career-planning'],
  'q98': ['career-planning'],
  'q99': ['career-planning'],
  'q100': ['career-planning'],
  'q101': ['career-planning', 'adaptability'],
  'q102': ['career-planning'],
  'q103': ['career-planning'],
  'q104': ['salary-negotiation'],
  'q105': ['salary-negotiation'],
  'q106': ['salary-negotiation'],
  'q107': ['salary-negotiation'],
  'q108': ['motivation-fit'],
};

// Campus applicable
const campusApplicable = {
  'q11': false, 'q12': false, 'q13': false, 'q14': false,
  'q15': false, 'q16': false, 'q17': false,
  'q105': false, 'q106': false,
};

// Build the categories
categories.forEach((cat, catIndex) => {
  result += `  {
    id: '${cat.id}',
    nameEn: '${cat.nameEn}',
    nameZh: '${cat.nameZh}',
    subcategories: [
`;
  cat.subcategories.forEach((subcat, subcatIndex) => {
    result += `      {
        id: '${subcat.id}',
        nameEn: '${subcat.nameEn}',
        nameZh: '${subcat.nameZh}',
        questions: [
`;
    subcat.questions.forEach((qId, qIndex) => {
      const q = questionMap[qId];
      const tags = tagMapping[qId] || [];
      const isCampus = campusApplicable[qId] !== false;
      const similarArr = q.similarQuestions ? q.similarQuestions.split(/\n\s*\n/).filter(s => s.trim()) : [];
      
      result += `          {
            id: '${qId}',
            category: '${cat.id}',
            subcategory: '${subcat.id}',
            questionEn: \`${escapeTsString(q.questionEn)}\`,
            questionZh: \`${escapeTsString(q.questionZh)}\`,
            tags: ${JSON.stringify(tags)},
            isCampusApplicable: ${isCampus},`;
      
      if (similarArr.length > 0) {
        result += `\n            similarQuestions: ${JSON.stringify(similarArr)},`;
      }
      if (q.questionIntent) {
        result += `\n            questionIntent: \`${escapeTsString(q.questionIntent)}\`,`;
      }
      if (q.answerStrategy) {
        result += `\n            answerStrategy: \`${escapeTsString(q.answerStrategy)}\`,`;
      }
      if (q.notes) {
        result += `\n            notes: \`${escapeTsString(q.notes)}\`,`;
      }
      
      result += `\n          }`;
      if (qIndex < subcat.questions.length - 1) result += ',';
      result += '\n';
    });
    result += `        ]
      }`;
    if (subcatIndex < cat.subcategories.length - 1) result += ',';
    result += '\n';
  });
  result += `    ],
  }`;
  if (catIndex < categories.length - 1) result += ',';
  result += '\n';
});

result += `]

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
`;

fs.writeFileSync(outputPath, result, 'utf8');
console.log('Generated safe questions.ts successfully!');
console.log('Output:', outputPath);