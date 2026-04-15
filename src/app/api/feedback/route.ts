import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, content, userId, userEmail } = body

    if (!content || !type) {
      return NextResponse.json({ error: '反馈类型和内容是必填的' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 使用类型断言绕过类型检查
    const { error } = await (supabase as any)
      .from('feedback')
      .insert({
        user_id: userId || null,
        user_email: userEmail || null,
        type,
        content: content.trim(),
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to submit feedback:', error)
      return NextResponse.json({ error: '提交失败，请重试' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json({ error: '提交失败，请重试' }, { status: 500 })
  }
}
