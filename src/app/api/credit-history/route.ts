import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Fetching credit transactions for userId:', userId)
    
    // 尝试获取所有交易记录，看看是否能查询到数据
    const { data: allTransactions, error: allError } = await (supabase as any)
      .from('credit_transactions')
      .select('*')
      .limit(10)
    
    console.log('All transactions count:', allTransactions?.length || 0)
    if (allTransactions && allTransactions.length > 0) {
      console.log('Sample transaction user_ids:', allTransactions.slice(0, 3).map((t: any) => t.user_id))
      console.log('Current userId:', userId)
      console.log('Match check:', allTransactions.slice(0, 3).map((t: any) => ({ 
        transaction_user_id: t.user_id, 
        current_user_id: userId, 
        match: t.user_id === userId 
      })))
    }
    
    // 然后按用户ID查询
    const { data: transactions, error } = await (supabase as any)
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch credit transactions:', error)
      return NextResponse.json({ error: '获取积分记录失败' }, { status: 500 })
    }

    console.log('Fetched transactions for userId:', userId, 'count:', transactions?.length || 0)
    return NextResponse.json({ transactions, allTransactions: allTransactions?.slice(0, 3) })
  } catch (error) {
    console.error('Unexpected error in GET credit history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    )
  }
}
