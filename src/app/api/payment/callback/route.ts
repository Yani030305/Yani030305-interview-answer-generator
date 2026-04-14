import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { logger, getIpAddress, getUserAgent } from '@/lib/logger'
import { createZPay, ZPayCallbackParams } from '@/lib/zpay'

// 处理回调参数的通用函数
async function handleCallback(request: NextRequest, method: 'POST' | 'GET') {
  const startTime = Date.now()
  const ipAddress = getIpAddress(request)
  const userAgent = getUserAgent(request)

  try {
    let callbackParams: ZPayCallbackParams

    if (method === 'POST') {
      const contentType = request.headers.get('content-type') || ''

      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData()
        callbackParams = Object.fromEntries(formData.entries()) as ZPayCallbackParams
      } else {
        const body = await request.json()
        callbackParams = body as ZPayCallbackParams
      }
    } else {
      const { searchParams } = new URL(request.url)
      callbackParams = Object.fromEntries(searchParams.entries()) as ZPayCallbackParams
    }

    const { out_trade_no, money, trade_no, trade_status, sign } = callbackParams

    if (!out_trade_no || !money || !trade_no || !trade_status || !sign) {
      await logger.warn('Missing ZPAY callback parameters', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        requestBody: callbackParams,
      })

      return new NextResponse('fail', { status: 400 })
    }

    let zpay
    try {
      zpay = createZPay()
    } catch (error) {
      await logger.error('ZPAY configuration error', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      return new NextResponse('fail', { status: 500 })
    }

    // 验签
    const isValidSign = zpay.verifySign(callbackParams)
    if (!isValidSign) {
      await logger.error('ZPAY signature verification failed', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        requestBody: callbackParams,
      })

      return new NextResponse('fail', { status: 400 })
    }

    // 支付状态校验
    if (trade_status !== 'TRADE_SUCCESS') {
      await logger.warn('ZPAY trade status is not success', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        requestBody: callbackParams,
      })

      return new NextResponse('fail', { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .select('*')
      .eq('id', out_trade_no)
      .single()

    if (orderError || !order) {
      await logger.error('Order not found in ZPAY callback', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        errorMessage: orderError?.message,
        requestBody: { out_trade_no, trade_no },
      })

      return new NextResponse('fail', { status: 404 })
    }

    // 幂等处理：已支付直接返回 success
    if ((order as any).status === 'paid') {
      await logger.info('Order already paid, skipping (idempotent)', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        requestBody: { out_trade_no, trade_no, status: (order as any).status },
      })

      return new NextResponse('success', { status: 200 })
    }

    if ((order as any).status !== 'pending') {
      await logger.warn('Invalid order status for payment', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        requestBody: { out_trade_no, trade_no, status: (order as any).status },
      })

      return new NextResponse('fail', { status: 400 })
    }

    const orderPrice = Number((order as any).price).toFixed(2)
    const paidPrice = Number(money).toFixed(2)

    if (orderPrice !== paidPrice) {
      await logger.error('Payment amount mismatch', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        requestBody: {
          out_trade_no,
          trade_no,
          expectedAmount: orderPrice,
          actualAmount: paidPrice,
        },
      })

      return new NextResponse('fail', { status: 400 })
    }

    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update({
        status: 'paid' as const,
        payment_provider: 'zpay',
        payment_order_id: trade_no,
        payment_transaction_id: trade_no,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', out_trade_no)

    if (updateError) {
      await logger.error('Failed to update order status', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        errorMessage: updateError.message,
        requestBody: { out_trade_no, trade_no },
      })

      return new NextResponse('fail', { status: 500 })
    }

    const { error: creditError } = await (supabase as any).rpc('add_credits', {
      p_user_id: (order as any).user_id,
      p_amount: (order as any).credits,
      p_type: 'purchase',
      p_description: `购买 ${(order as any).package_name}`,
      p_order_id: out_trade_no,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    })

    if (creditError) {
      await logger.error('Failed to add credits after payment', {
        endpoint: '/api/payment/callback',
        method,
        ipAddress,
        userAgent,
        errorMessage: creditError.message,
        requestBody: {
          out_trade_no,
          trade_no,
          userId: (order as any).user_id,
          credits: (order as any).credits,
        },
      })

      await (supabase as any)
        .from('orders')
        .update({
          status: 'failed' as const,
          error_message: '积分添加失败',
          updated_at: new Date().toISOString(),
        })
        .eq('id', out_trade_no)

      return new NextResponse('fail', { status: 500 })
    }

    const responseTime = Date.now() - startTime

    await logger.info('Payment processed successfully', {
      userId: (order as any).user_id,
      endpoint: '/api/payment/callback',
      method,
      ipAddress,
      userAgent,
      responseStatus: 200,
      responseTimeMs: responseTime,
      requestBody: {
        out_trade_no,
        trade_no,
        credits: (order as any).credits,
      },
    })

    return new NextResponse('success', { status: 200 })
  } catch (error) {
    const responseTime = Date.now() - startTime

    await logger.error('Unexpected error in ZPAY callback', {
      endpoint: '/api/payment/callback',
      method,
      ipAddress,
      userAgent,
      responseStatus: 500,
      responseTimeMs: responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return new NextResponse('fail', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return handleCallback(request, 'POST')
}

export async function GET(request: NextRequest) {
  return handleCallback(request, 'GET')
}