import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, newPassword, confirmPassword } = body

    if (!userId || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: '两次输入的密码不一致' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少为6位' },
        { status: 400 }
      )
    }

    // 验证密码强度：必须包含大小写字母和数字
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(newPassword)) {
      return NextResponse.json(
        { error: '密码必须包含大小写字母和数字' },
        { status: 400 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 使用 admin API 更新用户密码
    try {
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      )

      if (error) {
        console.error('Failed to update password:', error)
        return NextResponse.json(
          { error: `密码重置失败: ${error.message}` },
          { status: 500 }
        )
      }
      
      console.log('Password updated successfully')
    } catch (updateError) {
      console.error('Exception when updating password:', updateError)
      return NextResponse.json(
        { error: `密码重置失败: ${updateError instanceof Error ? updateError.message : '未知错误'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: '密码重置成功！请使用新密码登录'
    })
  } catch (error) {
    console.error('Error in reset password:', error)
    return NextResponse.json(
      { error: '密码重置失败，请稍后重试' },
      { status: 500 }
    )
  }
}
