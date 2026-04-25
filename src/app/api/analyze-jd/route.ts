import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { UploadedDocument } from '@/types'
import { analyzeJobDescription } from '@/lib/jd-analyzer'
import { verifyAuth } from '@/lib/request-utils'

export interface JDAnalysisRequest {
  company: string
  position: string
  jdText: string
  industry?: string
  businessDirection?: string
  city?: string
  userDocuments?: UploadedDocument[]
  userMode?: 'campus' | 'experienced'
}

function getServerSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function validateInputQuality(company: string, position: string, jdText: string): { valid: boolean; error?: string } {
  const trimmedJd = jdText.trim()
  
  // 1. 检测重复字符（超过50%是同一个字符）
  const charCount: Record<string, number> = {}
  for (const char of trimmedJd) {
    charCount[char] = (charCount[char] || 0) + 1
  }
  const maxCharCount = Math.max(...Object.values(charCount))
  if (maxCharCount / trimmedJd.length > 0.5) {
    return { valid: false, error: '岗位描述看起来内容质量较低，请提供真实的岗位描述' }
  }
  
  // 2. 岗位关键词检测
  const jdKeywords = [
    '职责', '要求', '负责', '岗位', '职位', '工作', '经验',
    '学历', '专业', '技能', '能力', '负责', '参与', '协助',
    'responsibilities', 'requirements', 'experience', 'skills'
  ]
  const hasJdKeyword = jdKeywords.some(keyword => trimmedJd.toLowerCase().includes(keyword.toLowerCase()))
  
  if (!hasJdKeyword) {
    return { valid: false, error: '请提供包含岗位信息的真实描述（如职责、要求等）' }
  }
  
  // 3. 有效字符比例（至少50%是中文或英文字母）
  const validChars = /[\u4e00-\u9fa5a-zA-Z]/g
  const validCharCount = (trimmedJd.match(validChars) || []).length
  if (validCharCount / trimmedJd.length < 0.5) {
    return { valid: false, error: '岗位描述内容质量较低，请提供真实的岗位描述' }
  }
  
  // 4. 检测公司名称和岗位名称是否合理（不能太短或全是数字）
  const companyTrimmed = company.trim()
  const positionTrimmed = position.trim()
  
  if (/^\d+$/.test(companyTrimmed) || companyTrimmed.length < 2) {
    return { valid: false, error: '请输入有效的公司名称' }
  }
  
  if (/^\d+$/.test(positionTrimmed) || positionTrimmed.length < 2) {
    return { valid: false, error: '请输入有效的岗位名称' }
  }
  
  return { valid: true }
}

function normalizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('DEEPSEEK_API_KEY')) {
    return 'AI 服务密钥未配置'
  }

  if (message.includes('JD_ANALYSIS_API_FAILED_')) {
    return 'AI 分析服务调用失败，请稍后重试'
  }

  if (message.includes('JD_ANALYSIS_PARSE_FAILED')) {
    return 'AI 返回格式异常，请稍后重试'
  }

  if (message.toLowerCase().includes('aborted')) {
    return '分析超时，请稍后重试'
  }

  return '分析失败，请稍后重试'
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now()
  console.log('[API] JD analysis request received')

  const supabase = getServerSupabase()
  let user: { id: string; email?: string } | null = null
  let isAuthenticated = false

  try {
    const body: JDAnalysisRequest = await request.json()

    if (!body.company?.trim() || !body.position?.trim() || !body.jdText?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: '公司名称、岗位名称和JD原文为必填项',
        },
        { status: 400 }
      )
    }

    if (body.jdText.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'JD内容太短，请提供更完整的岗位描述',
        },
        { status: 400 }
      )
    }

    console.log('[API] Starting input quality validation')
    const qualityCheck = validateInputQuality(body.company, body.position, body.jdText)
    if (!qualityCheck.valid) {
      console.log('[API] Input quality validation failed:', qualityCheck.error)
      return NextResponse.json(
        {
          success: false,
          error: qualityCheck.error || '输入内容质量检测未通过',
        },
        { status: 400 }
      )
    }
    console.log('[API] Input quality validation passed')

    const authStartTime = Date.now()
    const { user: authUser, error: authError } = await verifyAuth(request)
    console.log('[API] Auth verification duration:', Date.now() - authStartTime, 'ms')

    if (authError || !authUser) {
      return NextResponse.json(
        {
          success: false,
          error: authError || '请先登录',
        },
        { status: 401 }
      )
    }

    user = authUser
    isAuthenticated = true

    const profileStartTime = Date.now()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()
    console.log('[API] Get profile duration:', Date.now() - profileStartTime, 'ms')

    if (profileError || !profile) {
      console.error('Get profile failed:', profileError)
      return NextResponse.json(
        {
          success: false,
          error: '获取用户信息失败',
        },
        { status: 500 }
      )
    }

    const credits = (profile as any).credits || 0

    if (credits < 50) {
      return NextResponse.json(
        {
          success: false,
          error: '积分不足，需要50积分进行分析',
        },
        { status: 400 }
      )
    }

    const creditStartTime = Date.now()
    const { error: creditError } = await (supabase as any).rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: 50,
      p_description: 'JD 分析',
    })
    console.log('[API] Credit deduction duration:', Date.now() - creditStartTime, 'ms')

    if (creditError) {
      console.error('Credit deduction error:', creditError)
      return NextResponse.json(
        {
          success: false,
          error: '积分扣除失败',
        },
        { status: 500 }
      )
    }

    const analysisStartTime = Date.now()
    console.log('[API] Starting AI analysis...')
    const analysisResult = await analyzeJobDescription({
      company: body.company.trim(),
      position: body.position.trim(),
      jdText: body.jdText.trim(),
      industry: body.industry?.trim(),
      businessDirection: body.businessDirection?.trim(),
      city: body.city?.trim(),
      userDocuments: body.userDocuments || [],
      userMode: body.userMode || 'campus',
    })
    console.log('[API] AI analysis duration:', Date.now() - analysisStartTime, 'ms')

    const historyStartTime = Date.now()
    if (isAuthenticated && user) {
      const { error: historyError } = await (supabase as any)
        .from('jd_analysis_history')
        .insert({
          user_id: user.id,
          company: body.company.trim(),
          position: body.position.trim(),
          city: body.city?.trim() || null,
          jd_text: body.jdText.trim(),
          analysis_result: analysisResult,
          metadata: {
            industry: body.industry?.trim() || null,
            businessDirection: body.businessDirection?.trim() || null,
            userMode: body.userMode || 'campus',
            documentCount: body.userDocuments?.length || 0,
          },
        })

      if (historyError) {
        console.error('Save analysis history error:', historyError)
      }
    }
    console.log('[API] Save history duration:', Date.now() - historyStartTime, 'ms')

    const totalDuration = Date.now() - requestStartTime
    console.log('[API] Total request duration:', totalDuration, 'ms')

    return NextResponse.json({
      success: true,
      data: analysisResult,
    })
  } catch (error) {
    console.error('[API] JD analysis route error:', error)
    console.error('[API] Total duration before error:', Date.now() - requestStartTime, 'ms')

    return NextResponse.json(
      {
        success: false,
        error: normalizeErrorMessage(error),
      },
      { status: 500 }
    )
  }
}
