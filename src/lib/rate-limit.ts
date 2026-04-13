import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

interface RateLimitConfig {
  maxRequests: number
  windowMinutes: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/generate-answer': { maxRequests: 10, windowMinutes: 1 },
  '/api/orders': { maxRequests: 20, windowMinutes: 1 },
  '/api/payment/callback': { maxRequests: 100, windowMinutes: 1 },
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  const config = RATE_LIMITS[endpoint] || { maxRequests: 60, windowMinutes: 1 }
  
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: config.maxRequests,
      p_window_minutes: config.windowMinutes,
    })

    if (error) {
      console.error('Rate limit check error:', error)
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000),
      }
    }

    const windowStart = new Date()
    const resetTime = new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000)

    return {
      allowed: data as boolean,
      remaining: Math.max(0, config.maxRequests - (data ? 1 : 0)),
      resetTime,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000),
    }
  }
}

export function getRateLimitHeaders(
  allowed: boolean,
  remaining: number,
  resetTime: Date,
  config: RateLimitConfig
) {
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetTime.getTime() / 1000).toString(),
    'X-RateLimit-Reset-After': Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString(),
  }
}

export function createRateLimitResponse(remaining: number, resetTime: Date) {
  const config = { maxRequests: 10, windowMinutes: 1 }
  const headers = getRateLimitHeaders(false, remaining, resetTime, config)
  
  return new Response(
    JSON.stringify({
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        'Retry-After': Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString(),
      },
    }
  )
}
