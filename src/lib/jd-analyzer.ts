import { UploadedDocument } from '@/types'

export interface AnalyzeJDRequest {
  company: string
  position: string
  jdText: string
  industry?: string
  businessDirection?: string
  city?: string
  userDocuments?: UploadedDocument[]
  userMode?: 'campus' | 'experienced'
}

export interface JDAnalysisResult {
  oneLinerJudgment: {
    essence: string
    category: string
  }
  jdBreakdown: Array<{
    original: string
    realMeaning: string
  }>
  dailyWorkProfile: {
    typicalTasks: string[]
    typicalDay: string
    typicalWeek: string
    collaborators: string[]
    deliverables: string[]
  }
  keyCapabilities: {
    required: string[]
    preferred: string[]
    overlooked: string[]
  }
  commonPitfalls: Array<{
    issue: string
    description: string
    solution: string
  }>
  userMatchAnalysis: {
    matchingPoints: Array<{
      userExperience: string
      matchLevel: 'high' | 'medium' | 'low'
      explanation: string
    }>
    weakPoints: string[]
    keyStories: string[]
  }
  suitabilityAssessment: {
    overall: 'high' | 'medium' | 'low'
    reasoning: string
    suggestions: string[]
    ifNotReady: string[]
  }
  interviewPrep: {
    likelyQuestions: string[]
    keyStories: string[]
    campusPrep: string[]
    experiencedPrep: string[]
  }
}

const JD_ANALYSIS_SYSTEM_PROMPT = `你是一个在互联网/科技行业工作了5-10年的资深岗位分析师，也像一个做过这个岗位、带过新人的老员工。

你的任务不是复述JD，而是把岗位拆解成真实工作场景，帮助候选人理解：
1. 这个岗位本质上在做什么
2. 入职后日常到底在忙什么
3. 哪些能力是面试官真正想确认的
4. 用户自己的经历里哪些点能匹配上
5. 用户还缺什么、该怎么准备

输出要求：
- 必须只输出合法 JSON
- 不要输出 markdown 代码块
- 不要输出“好的，以下是分析”之类前缀
- 不要输出任何 JSON 以外的解释文字

表达要求：
- 像真实业务老员工在讲，不像官方JD解释
- 更具体、更业务化、更接近真实工作语境
- 少空话、少套话、少模糊表述
- 多讲真实日常、协作对象、交付物、踩坑点、面试重点`

function truncateText(text: string, maxLength: number) {
  if (!text) return ''
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n...[内容已截断]`
}

function buildJDAnalysisPrompt(request: AnalyzeJDRequest): string {
  const userDocsContent =
    request.userDocuments && request.userDocuments.length > 0
      ? request.userDocuments
          .slice(0, 3)
          .map((doc) => `=== ${doc.name} ===\n${truncateText(doc.extractedText || '', 2500)}`)
          .join('\n\n')
      : '未提供用户背景材料'

  return `请分析以下岗位，并输出完整岗位拆解报告。

【公司信息】
公司名称：${request.company}
岗位名称：${request.position}
行业/业务方向：${request.industry || '未提供'}
城市：${request.city || '未提供'}

【JD原文】
${truncateText(request.jdText, 6000)}

【用户背景材料】
${userDocsContent}

【用户模式】
${request.userMode === 'campus' ? '校招候选人（应届生/在校学生）' : '社招候选人（有工作经验）'}

请严格输出以下 JSON 结构，不要输出任何额外文字：

{
  "oneLinerJudgment": {
    "essence": "一句话说明这个岗位本质是做什么的",
    "category": "执行/分析/协调/策略/销售/用户/产品/运营/市场/技术等中的一种或组合"
  },
  "jdBreakdown": [
    {
      "original": "JD原文中的某一条职责",
      "realMeaning": "把这条职责翻译成真实工作语境：日常可能在做什么、怎么做、为什么难"
    }
  ],
  "dailyWorkProfile": {
    "typicalTasks": ["高频任务1", "高频任务2", "高频任务3"],
    "typicalDay": "描述典型工作日",
    "typicalWeek": "描述典型工作周",
    "collaborators": ["协作对象1", "协作对象2", "协作对象3"],
    "deliverables": ["常见交付物1", "常见交付物2", "常见交付物3"]
  },
  "keyCapabilities": {
    "required": ["必备能力1", "必备能力2", "必备能力3"],
    "preferred": ["加分能力1", "加分能力2"],
    "overlooked": ["容易被忽略但实际重要的能力1"]
  },
  "commonPitfalls": [
    {
      "issue": "常见问题",
      "description": "这个问题在真实工作里怎么出现",
      "solution": "怎么应对"
    }
  ],
  "userMatchAnalysis": {
    "matchingPoints": [
      {
        "userExperience": "用户经历中的具体片段",
        "matchLevel": "high",
        "explanation": "为什么匹配"
      }
    ],
    "weakPoints": ["用户还不够强的地方1", "地方2"],
    "keyStories": ["最值得重点准备的故事1", "故事2"]
  },
  "suitabilityAssessment": {
    "overall": "high",
    "reasoning": "整体匹配判断理由",
    "suggestions": ["建议1", "建议2"],
    "ifNotReady": ["优先补足1", "优先补足2"]
  },
  "interviewPrep": {
    "likelyQuestions": ["问题1", "问题2", "问题3", "问题4", "问题5"],
    "keyStories": ["重点准备经历1", "重点准备经历2"],
    "campusPrep": ["校招准备建议1", "校招准备建议2"],
    "experiencedPrep": ["社招准备建议1", "社招准备建议2"]
  }
}

如果用户没有提供足够背景材料，也要正常输出 userMatchAnalysis，但可以明确写“用户材料有限，只能做初步判断”。`
}

function extractJsonString(raw: string): string {
  const trimmed = raw.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const withoutMarkdown = trimmed
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  if (withoutMarkdown.startsWith('{') && withoutMarkdown.endsWith('}')) {
    return withoutMarkdown
  }

  const match = withoutMarkdown.match(/\{[\s\S]*\}/)
  if (match) {
    return match[0]
  }

  throw new Error('模型返回中未找到合法 JSON')
}

function safeParseAnalysis(raw: string): JDAnalysisResult {
  const jsonString = extractJsonString(raw)
  const parsed = JSON.parse(jsonString)

  return parsed as JDAnalysisResult
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 60000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timer)
  }
}

export async function analyzeJobDescription(
  request: AnalyzeJDRequest
): Promise<JDAnalysisResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured')
  }

  const userPrompt = buildJDAnalysisPrompt(request)

  const response = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: JD_ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2600,
        response_format: { type: 'json_object' },
      }),
    },
    60000
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('JD analysis upstream error:', response.status, errorText)
    throw new Error(`JD_ANALYSIS_API_FAILED_${response.status}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (!content || typeof content !== 'string') {
    console.error('Empty or invalid model content:', data)
    throw new Error('模型返回为空')
  }

  try {
    return safeParseAnalysis(content)
  } catch (error) {
    console.error('Failed to parse JD analysis result')
    console.error('Raw content preview:', content.slice(0, 2000))
    console.error('Parse error:', error)
    throw new Error('JD_ANALYSIS_PARSE_FAILED')
  }
}
