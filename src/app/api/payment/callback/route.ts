import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { logger, getIpAddress, getUserAgent } from '@/lib/logger'
import crypto from 'crypto'

function verifyXorPaySign(
  aoid: string,
  order_id: string,
  pay_price: string,
  pay_time: string,
  sign: string,
  appSecret: string
): boolean {
  const signStr = aoid + order_id + pay_price + pay_time + appSecret
  const calculatedSign = crypto.createHash('md5').update(signStr).digest('hex')
  return calculatedSign === sign
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const ipAddress = getIpAddress(request)
  const userAgent = getUserAgent(request)

  try {
    const contentType = request.headers.get('content-type') || ''
    
    let aoid: string = ''
    let order_id: string = ''
    let pay_price: string = ''
    let pay_time: string = ''
    let sign: string = ''
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      aoid = (formData.get('aoid') as string) || ''
      order_id = (formData.get('order_id') as string) || ''
      pay_price = (formData.get('pay_price') as string) || ''
      pay_time = (formData.get('pay_time') as string) || ''
      sign = (formData.get('sign') as string) || ''
    } else {
      const body = await request.json()
      aoid = body.aoid || ''
      order_id = body.order_id || ''
      pay_price = body.pay_price || ''
      pay_time = body.pay_time || ''
      sign = body.sign || ''
    }

    if (!aoid || !order_id || !pay_price || !sign) {
      await logger.warn('Missing XorPay callback parameters', {
        endpoint: '/api/payment/callback',
        method: 'POST',
        ipAddress,
        userAgent,
        requestBody: { aoid, order_id, pay_price, pay_time },
      })

      return new NextResponse('fail', { status: 400 })
    }

    const xorpayAppSecret = process.env.XORPAY_APP_SECRET
    if (!xorpayAppSecret) {
      await logger.error('XorPay app secret not configured', {
        endpoint: '/api/payment/callback',
        method: 'POST',
        ipAddress,
        userAgent,
      })

      return new NextResponse('fail', { status: 500 })
    }

    const isValidSign = verifyXorPaySign(
      aoid,
      order_id,
      pay_price,
      pay_time,
      sign,
      xorpayAppSecret
    )
    
    if (!isValidSign) {
      await logger.error('XorPay signature verification failed', {
        endpoint: '/api/payment/callback',
        method: 'POST',
        ipAddress,
        userAgent,
        requestBody: { aoid, order_id, pay_price, pay_time },
      })

      return new NextResponse('fail', { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      await logger.error('Order not found in XorPay callback', {
        endpoint: '/api/payment/callback',
        method: 'POST',
        ipAddress,
        userAgent,
        errorMessage: orderError?.message,
        requestBody: { order_id, aoid },
      })

      return new NextResponse('fail', { status: 404 })
    }

    if (order.status === 'paid') {
      await logger.info('Order already paid, skipping (idempotent)', {
        endpoint: '/api/payment/callback',
        method: 'POST',
        ipAddress,
        userAgent,
        requestBody: { order_id, aoid, status: order.status },
      })

      return new NextResponse('success', { status: 200 })
    }

    if (order.status !== 'pending') {
      await logger.warn('Invalid order status for payment', {
        endpoint: '/api/payment/callback',
        method: 'POST',
        ipAddress,
        userAgent,
        requestBody: { order_id, aoid, status: order.status },
      })

      return new NextResponse('fail', { status: 400 })
    }

    const orderPrice = Number(order.price).toFixed(2)
    const paidPrice = Number(pay_price).toFixed(2)
    
    if (orderPrice !== paidPrice) {
      await logger.error('Payment amount mismatch', {
        endpoint: '/api/payment/callback',
        method: 'POST',
        ipAddress,
        userAgent,
        requestBody: { 
          order_id, 
          aoid,
          expectedAmount: orderPrice, 
          actualAmount: paidPrice 
        },
      })

      return new NextResponse('fail', { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_provider: 'xorpay',
        payment_order_id: aoid,
        payment_transaction_id: aoid,
        paid_at: pay_time || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    if (updateError) {
      await logger.error('Failed to update order status', {
        endpoint: '/api/payment/callback',
        method: 'POST',
        ipAddress,
        userAgent,
        errorMessage: updateError.message,
        requestBody: { order_id, aoid },
      })

      return new NextResponse('fail', { status: 500 })
    }

    const { error: creditError } = await (supabase as any).rpc('add_credits', {
      p_user_id: order.user_id,
      p_amount: order.credits,
      p_type: 'purchase',
      p_description: `购买 ${order.package_name}`,
      p_order_id: order_id,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    })

    if (creditError) {
      await logger.error('Failed to add credits after payment', {
        endpoint: '/api/payment/callback',
        method: 'POST',
        ipAddress,
        userAgent,
        errorMessage: creditError.message,
        requestBody: { order_id, aoid, userId: order.user_id, credits: order.credits },
      })

      await supabase
        .from('orders')
        .update({
          status: 'failed',
          error_message: '积分添加失败',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order_id)

      return new NextResponse('fail', { status: 500 })
    }

    const responseTime = Date.now() - startTime

    await logger.info('Payment processed successfully', {
      userId: order.user_id,
      endpoint: '/api/payment/callback',
      method: 'POST',
      ipAddress,
      userAgent,
      responseStatus: 200,
      responseTimeMs: responseTime,
      requestBody: { 
        order_id, 
        aoid,
        credits: order.credits 
      },
    })

    return new NextResponse('success', { status: 200 })
  } catch (error) {
    const responseTime = Date.now() - startTime

    await logger.error('Unexpected error in XorPay callback', {
      endpoint: '/api/payment/callback',
      method: 'POST',
      ipAddress,
      userAgent,
      responseStatus: 500,
      responseTimeMs: responseTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return new NextResponse('fail', { status: 500 })
  }
}
