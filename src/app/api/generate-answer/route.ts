import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAnswer, regenerateAnswer } from '@/services/ai-service'
import { QuestionItem, UploadedDocument, UserMode } from '@/types'
import { Database } from '@/types/supabase'
import { logger, getIpAddress, getUserAgent } from '@/lib/logger'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'

const CREDITS_PER_GENERATION = 10

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | undefined
  let ipAddress: string | undefined
  let userAgent: string | undefined

  try {
    console.log('=== generate-answer API called ===')
    ipAddress = getIpAddress(request)
    userAgent = getUserAgent(request)

    console.log('About to parse request body...')
    const body = await request.json()
    console.log('Request body parsed successfully')
    
    const { question, documents, userMode, style, adjustments, jobDescription, userId: bodyUserId } = body as {
      question: QuestionItem
      documents: UploadedDocument[]
      userMode: UserMode
      style?: 'concise' | 'professional' | 'storytelling' | 'custom'
      adjustments?: string
      jobDescription?: UploadedDocument | null
      userId?: string
    }
    
    userId = bodyUserId
    console.log('User ID from body:', userId)
    console.log('Question:', question?.id)
    console.log('Documents count:', documents?.length)

    if (!userId || !question || !documents || documents.length === 0) {
      await logger.warn('Missing required fields', {
        userId,
        endpoint: '/api/generate-answer',
        method: 'POST',
        ipAddress,
        userAgent,
        requestBody: { hasQuestion: !!question, documentsCount: documents?.length, hasUserId: !!userId },
      })

      return NextResponse.json(
        { error: '缺少必要参数', errorCode: 'MISSING_PARAMS' },
        { status: 400 }
      )
    }

    const rateLimitResult = await checkRateLimit(userId, '/api/generate-answer')
    if (!rateLimitResult.allowed) {
      await logger.warn('Rate limit exceeded', {
        userId,
        endpoint: '/api/generate-answer',
        method: 'POST',
        ipAddress,
        userAgent,
      })

      return createRateLimitResponse(rateLimitResult.remaining, rateLimitResult.resetTime)
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single()

    if (profileError) {
      await logger.error('Failed to fetch user profile', {
        userId,
        endpoint: '/api/generate-answer',
        method: 'POST',
        ipAddress,
        userAgent,
        errorMessage: profileError.message,
      })

      return NextResponse.json(
        { error: '获取用户信息失败', errorCode: 'PROFILE_FETCH_ERROR' },
        { status: 500 }
      )
    }

    if (!profile || (profile as any).credits < CREDITS_PER_GENERATION) {
      await logger.warn('Insufficient credits', {
        userId,
        endpoint: '/api/generate-answer',
        method: 'POST',
        ipAddress,
        userAgent,
        requestBody: { requiredCredits: CREDITS_PER_GENERATION, currentCredits: (profile as any)?.credits || 0 },
      })

      return NextResponse.json(
        { 
          error: `积分不足！需要 ${CREDITS_PER_GENERATION} 积分，当前 ${(profile as any)?.credits || 0} 积分`,
          errorCode: 'INSUFFICIENT_CREDITS',
          requiredCredits: CREDITS_PER_GENERATION,
          currentCredits: (profile as any)?.credits || 0,
        },
        { status: 402 }
      )
    }

    const { data: deductResult, error: deductError } = await (supabase as any).rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: CREDITS_PER_GENERATION,
      p_description: style ? '重新生成回答' : '生成回答',
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    })

    if (deductError || !deductResult) {
      await logger.error('Failed to deduct credits', {
        userId,
        endpoint: '/api/generate-answer',
        method: 'POST',
        ipAddress,
        userAgent,
        errorMessage: deductError?.message,
      })

      return NextResponse.json(
        { error: '扣除积分失败，请重试', errorCode: 'DEDUCT_CREDITS_ERROR' },
        { status: 500 }
      )
    }

    let result
    try {
      if (style) {
        result = await regenerateAnswer(question, documents, userMode, style, adjustments, jobDescription)
      } else {
        result = await generateAnswer(question, documents, userMode, jobDescription)
      }
    } catch (aiError) {
      await logger.error('AI generation failed, refunding credits', {
        userId,
        endpoint: '/api/generate-answer',
        method: 'POST',
        ipAddress,
        userAgent,
        errorMessage: aiError instanceof Error ? aiError.message : 'Unknown error',
      })

      const { data: refundResult, error: refundError } = await (supabase as any).rpc('refund_credits', {
        p_user_id: userId,
        p_amount: CREDITS_PER_GENERATION,
        p_description: 'AI 生成失败，退还积分',
      })

      if (refundError) {
        await logger.error('Failed to refund credits after AI error', {
          userId,
          endpoint: '/api/generate-answer',
          method: 'POST',
          ipAddress,
          userAgent,
          errorMessage: refundError.message,
        })
      }

      return NextResponse.json(
        { 
          error: 'AI 生成失败，积分已退还', 
          errorCode: 'AI_GENERATION_ERROR',
          details: aiError instanceof Error ? aiError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    const { error: historyError } = await (supabase
      .from('answer_history') as any)
      .insert({
        user_id: userId,
        question_id: question.id,
        answer_zh: result.answerZh,
        answer_en: result.answerEn,
      })

    if (historyError) {
      await logger.error('Failed to save answer history', {
        userId,
        endpoint: '/api/generate-answer',
        method: 'POST',
        ipAddress,
        userAgent,
        errorMessage: historyError.message,
        requestBody: { questionId: question.id },
      })
    }

    const responseTime = Date.now() - startTime

    await logger.info('Answer generated successfully', {
      userId,
      endpoint: '/api/generate-answer',
      method: 'POST',
      ipAddress,
      userAgent,
      responseStatus: 200,
      responseTimeMs: responseTime,
      requestBody: { questionId: question.id, style },
    })

    return NextResponse.json(result)
  } catch (error) {
    const responseTime = Date.now() - startTime

    console.error('Full error stack:', error)
    await logger.error('Unexpected error in generate-answer', {
      userId,
      endpoint: '/api/generate-answer',
      method: 'POST',
      ipAddress,
      userAgent,
      responseStatus: 500,
      responseTimeMs: responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        stack: error instanceof Error ? error.stack : undefined,
      },
    })

    return NextResponse.json(
      { 
        error: '服务器内部错误', 
        errorCode: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
