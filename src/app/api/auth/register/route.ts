import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { getIpAddress, getUserAgent } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getIpAddress(request)
    const userAgent = getUserAgent(request)
    
    const { email, password, phoneNumber } = await request.json()

    if (!email || !password || !phoneNumber) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if email already exists
    const { data: existingUserByEmail, error: emailError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (emailError && emailError.code !== 'PGRST116') {
      console.error('Email check error:', emailError)
      return NextResponse.json(
        { error: '服务器错误，请稍后重试' },
        { status: 500 }
      )
    }

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: '这个邮箱已经注册过了' },
        { status: 400 }
      )
    }

    // Check if phone number already exists
    const { data: existingUserByPhone, error: phoneError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle()

    if (phoneError && phoneError.code !== 'PGRST116') {
      console.error('Phone check error:', phoneError)
      return NextResponse.json(
        { error: '服务器错误，请稍后重试' },
        { status: 500 }
      )
    }

    if (existingUserByPhone) {
      return NextResponse.json(
        { error: '这个电话已经注册过了' },
        { status: 400 }
      )
    }

    // Call Supabase auth signUp
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/`,
        data: {
          phone_number: phoneNumber || null,
        },
      },
    })

    if (error) {
      console.error('Signup error:', error)
      
      // Handle database unique constraint errors
      if (error.message.includes('duplicate key value violates unique constraint')) {
        if (error.message.includes('email')) {
          return NextResponse.json(
            { error: '这个邮箱已经注册过了' },
            { status: 400 }
          )
        }
        if (error.message.includes('phone_number') || error.message.includes('phone')) {
          return NextResponse.json(
            { error: '这个电话已经注册过了' },
            { status: 400 }
          )
        }
      }

      // Handle password validation errors
      if (error.message.includes('Password should contain at least one character of each')) {
        return NextResponse.json(
          { error: '密码必须包含大小写字母和数字' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: error.message || '注册失败，请稍后重试' },
        { status: 400 }
      )
    }

    // Check if user has valid CUHK email (9-digit student ID)
    // Note: handle_new_user() already gives appropriate credits based on email type
    const emailPrefix = email.split('@')[0]
    const isValidCUHKEmail = email.endsWith('@link.cuhk.edu.cn') && /^\d{9}$/.test(emailPrefix)

    return NextResponse.json({
      success: true,
      message: isValidCUHKEmail ? '注册成功！已赠送500积分。' : '注册成功！',
      user: data.user,
    })
  } catch (error) {
    console.error('Unexpected error in register:', error)
    return NextResponse.json(
      { error: '服务器内部错误，请稍后重试' },
      { status: 500 }
    )
  }
}
