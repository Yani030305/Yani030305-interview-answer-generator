import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AnswerHistoryItem } from '@/types'
import { Database } from '@/types/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const questionId = searchParams.get('questionId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabase
      .from('answer_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (questionId) {
      query = query.eq('question_id', questionId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching answer history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Remove duplicate records based on answer content
    const uniqueHistory = removeDuplicates(data)

    const history: AnswerHistoryItem[] = uniqueHistory.map((item) => ({
      id: item.id,
      userId: item.user_id,
      questionId: item.question_id,
      answerZh: item.answer_zh || '',
      answerEn: item.answer_en || '',
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error in answer history GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to remove duplicate records
function removeDuplicates(records: any[]): any[] {
  const seen = new Set<string>()
  return records.filter((record) => {
    // 确保处理 null 或 undefined 的情况
    const questionId = record.question_id || ''
    const answerZh = record.answer_zh || ''
    const answerEn = record.answer_en || ''
    const key = `${questionId}-${answerZh}-${answerEn}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, questionId, answerZh, answerEn } = body

    if (!userId || !questionId) {
      return NextResponse.json(
        { error: 'User ID and Question ID are required' },
        { status: 400 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if a similar record already exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('answer_history')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .eq('answer_zh', answerZh)
      .eq('answer_en', answerEn)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // Only throw error if it's not a "not found" error
      console.error('Error checking existing record:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    // If a similar record already exists, return it instead of creating a new one
    if (existingRecord) {
      const { data: fullRecord, error: fetchError } = await supabase
        .from('answer_history')
        .select('*')
        .eq('id', (existingRecord as { id: string }).id)
        .single()

      if (fetchError) {
        console.error('Error fetching existing record:', fetchError)
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
      }

      if (!fullRecord) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 })
      }

      const history: AnswerHistoryItem = {
        id: (fullRecord as any).id,
        userId: (fullRecord as any).user_id,
        questionId: (fullRecord as any).question_id,
        answerZh: (fullRecord as any).answer_zh || '',
        answerEn: (fullRecord as any).answer_en || '',
        createdAt: (fullRecord as any).created_at,
        updatedAt: (fullRecord as any).updated_at,
      }

      return NextResponse.json({ history })
    }

    const { data, error } = await (supabase
      .from('answer_history') as any)
      .insert({
        user_id: userId,
        question_id: questionId,
        answer_zh: answerZh,
        answer_en: answerEn,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating answer history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
    }

    const history: AnswerHistoryItem = {
      id: (data as any).id,
      userId: (data as any).user_id,
      questionId: (data as any).question_id,
      answerZh: (data as any).answer_zh || '',
      answerEn: (data as any).answer_en || '',
      createdAt: (data as any).created_at,
      updatedAt: (data as any).updated_at,
    }

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error in answer history POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'History ID is required' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('answer_history')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting answer history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in answer history DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
