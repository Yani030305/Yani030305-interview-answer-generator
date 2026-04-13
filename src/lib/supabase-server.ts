import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { NextRequest } from 'next/server'

export const createServerClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const getCurrentUser = async (request?: NextRequest) => {
  // 由于使用服务端角色密钥，我们无法获取会话信息
  // 对于需要认证的 API，我们从请求体或查询参数中获取 userId
  console.log('getCurrentUser: Authentication is handled via request parameters')
  return null
}
