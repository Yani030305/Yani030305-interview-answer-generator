import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export function getIpAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown'
}

export async function verifyAuth(request: NextRequest): Promise<{
  user: { id: string; email: string } | null
  error?: string
}> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: '未提供认证令牌' }
    }

    const token = authHeader.substring(7)
    
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { user: null, error: '认证令牌无效或已过期' }
    }

    return { user: { id: user.id, email: user.email || '' } }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { user: null, error: '认证验证失败' }
  }
}

export function createErrorResponse(
  message: string,
  statusCode: number,
  errorCode?: string
) {
  return new Response(
    JSON.stringify({
      error: message,
      errorCode: errorCode || 'UNKNOWN_ERROR',
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

export function createSuccessResponse(data: any, statusCode: number = 200) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  })
}
