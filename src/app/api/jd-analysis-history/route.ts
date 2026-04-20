import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { verifyAuth } from '@/lib/request-utils'

function getServerSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyAuth(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '请先登录' },
        { status: 401 }
      )
    }

    const supabase = getServerSupabase()
    const { searchParams } = new URL(request.url)

    // 检查是否请求单个分析历史
    const id = searchParams.get('id')
    if (id) {
      const { data, error } = await supabase
        .from('jd_analysis_history')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Get JD analysis history by id error:', error)
        return NextResponse.json(
          { error: '获取分析历史失败' },
          { status: 500 }
        )
      }

      if (!data) {
        return NextResponse.json(
          { error: '分析历史不存在' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    // 分页参数
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // 搜索参数
    const company = searchParams.get('company')
    const position = searchParams.get('position')
    const city = searchParams.get('city')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 构建查询
    let query = supabase
      .from('jd_analysis_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 应用筛选条件
    if (company) {
      query = query.ilike('company', `%${company}%`)
    }
    if (position) {
      query = query.ilike('position', `%${position}%`)
    }
    if (city) {
      query = query.ilike('city', `%${city}%`)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // 应用分页
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Get JD analysis history error:', error)
      return NextResponse.json(
        { error: '获取分析历史失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyAuth(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '请先登录' },
        { status: 401 }
      )
    }

    const supabase = getServerSupabase()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少分析历史 ID' },
        { status: 400 }
      )
    }

    // 验证分析历史是否属于当前用户
    const { data: history, error: getError } = await (supabase as any)
      .from('jd_analysis_history')
      .select('user_id')
      .eq('id', id)
      .single()

    if (getError || !history || (history as any).user_id !== user.id) {
      return NextResponse.json(
        { error: '分析历史不存在或无权限' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from('jd_analysis_history')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete JD analysis history error:', deleteError)
      return NextResponse.json(
        { error: '删除分析历史失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    )
  }
}