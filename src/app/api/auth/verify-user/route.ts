import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phoneNumber } = body

    if (!email || !phoneNumber) {
      return NextResponse.json(
        { error: '请提供邮箱和手机号码' },
        { status: 400 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 查询 profiles 表，验证邮箱和手机号是否匹配
    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('phone_number', phoneNumber)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: '邮箱和手机号码不匹配，请检查后重试' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true,
      userId: profile.id
    })
  } catch (error) {
    console.error('Error in verify user:', error)
    return NextResponse.json(
      { error: '验证失败，请稍后重试' },
      { status: 500 }
    )
  }
}
