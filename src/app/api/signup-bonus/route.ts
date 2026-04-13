import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { logger, getIpAddress, getUserAgent } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | undefined
  let ipAddress: string | undefined
  let userAgent: string | undefined

  try {
    ipAddress = getIpAddress(request)
    userAgent = getUserAgent(request)

    const body = await request.json()
    const { userId: bodyUserId } = body as { userId: string }

    userId = bodyUserId

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录', errorCode: 'NOT_AUTHENTICATED' },
        { status: 401 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 调用数据库函数赠送注册积分（幂等）
    const { data, error } = await (supabase as any).rpc('give_signup_bonus', {
      user_id: userId,
    })

    if (error) {
      await logger.error('Failed to give signup bonus', {
        userId,
        endpoint: '/api/signup-bonus',
        method: 'POST',
        ipAddress,
        userAgent,
        errorMessage: error.message,
      })

      return NextResponse.json(
        { error: '赠送注册积分失败', errorCode: 'SIGNUP_BONUS_ERROR' },
        { status: 500 }
      )
    }

    const responseTime = Date.now() - startTime

    if (data) {
      await logger.info('Signup bonus given successfully', {
        userId,
        endpoint: '/api/signup-bonus',
        method: 'POST',
        ipAddress,
        userAgent,
        responseStatus: 200,
        responseTimeMs: responseTime,
      })

      return NextResponse.json({
        success: true,
        message: '注册积分已到账',
        credits: 100,
      })
    } else {
      await logger.info('Signup bonus already given', {
        userId,
        endpoint: '/api/signup-bonus',
        method: 'POST',
        ipAddress,
        userAgent,
        responseStatus: 200,
        responseTimeMs: responseTime,
      })

      return NextResponse.json({
        success: false,
        message: '注册积分已领取过',
      })
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    await logger.error('Unexpected error in signup bonus', {
      userId,
      endpoint: '/api/signup-bonus',
      method: 'POST',
      ipAddress,
      userAgent,
      responseStatus: 500,
      responseTimeMs: responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: '服务器内部错误', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
