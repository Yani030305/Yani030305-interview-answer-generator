import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exportToDocx, exportToMarkdown } from '@/services/export-service'
import { UserMode, UploadedDocument, AnswerItem } from '@/types'
import { Database } from '@/types/supabase'

const CREDITS_PER_EXPORT = 50

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userMode, documents, answers, format, userId } = body as {
      userMode: UserMode
      documents: UploadedDocument[]
      answers: Record<string, AnswerItem>
      format: 'docx' | 'markdown'
      userId: string
    }

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
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

    if (profileError) throw profileError

    if (!profile || (profile as any).credits < CREDITS_PER_EXPORT) {
      return NextResponse.json(
        { error: `积分不足！导出需要 ${CREDITS_PER_EXPORT} 积分，当前 ${(profile as any)?.credits || 0} 积分` },
        { status: 402 }
      )
    }

    const { error: deductError } = await (supabase as any).rpc('deduct_credits', {
      user_id: userId,
      amount: CREDITS_PER_EXPORT,
      description: '导出回答文档',
    })

    if (deductError) throw deductError

    if (format === 'docx') {
      const buffer = await exportToDocx(userMode, documents, answers)
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer
      return new Response(arrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': 'attachment; filename="interview-answers.docx"',
        },
      })
    } else {
      const content = await exportToMarkdown(userMode, documents, answers)
      return new Response(content, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="interview-answers.md"',
        },
      })
    }
  } catch (error) {
    console.error('Error exporting:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export' },
      { status: 500 }
    )
  }
}
