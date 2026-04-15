import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import crypto from 'crypto'
import { createZPay, ZPayOrderParams } from '@/lib/zpay'

type CreditPackageRow = {
  id: string
  package_id: string
  name: string
  credits: number
  price: number
  bonus?: number | null
  is_active?: boolean | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, packageId } = body

    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    if (!packageId) {
      return NextResponse.json({ error: '请选择套餐' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: pkg, error: pkgError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('package_id', packageId)
      .eq('is_active', true)
      .single()

    if (pkgError || !pkg) {
      return NextResponse.json({ error: '套餐不存在或已下架' }, { status: 400 })
    }

    const packageRow = pkg as unknown as CreditPackageRow
    const totalCredits = packageRow.credits + (packageRow.bonus || 0)
    const orderId = crypto.randomUUID()

    const { data: orderData, error: orderError } = await (supabase as any)
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId,
        package_id: packageRow.id,
        package_name: packageRow.name,
        price: packageRow.price,
        credits: totalCredits,
        status: 'pending',
        payment_provider: 'zpay',
        payment_amount: packageRow.price,
        payment_method: 'alipay',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderError || !orderData) {
      console.error('Create order DB error:', orderError)
      return NextResponse.json({ error: '创建订单失败' }, { status: 500 })
    }

    const zpay = createZPay()

    const notifyUrl =
      process.env.ZPAY_NOTIFY_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback`
    const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/recharge`

    const orderParams: ZPayOrderParams = {
      out_trade_no: orderId,
      money: Number(packageRow.price).toFixed(2),
      name: packageRow.name,
      type: 'alipay',
      notify_url: notifyUrl,
      return_url: returnUrl,
      clientip: '127.0.0.1',
      // 先不要传 param，排除签名干扰
      // param: `${userId}|${totalCredits}`,
    }

    console.log('ZPAY order params from route:', orderParams)

    const zpayResponse = await zpay.createPayment(orderParams)

    console.log('ZPAY parsed response from route:', zpayResponse)

    if (Number(zpayResponse.code) !== 1) {
      await (supabase as any)
        .from('orders')
        .update({
          error_message: zpayResponse.msg || 'ZPAY create payment failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      return NextResponse.json(
        { error: zpayResponse.msg || '支付下单失败' },
        { status: 500 }
      )
    }

    let qrUrl = ''
    let qrImage: string | null = null
    let qrCode: string | null = null

    if (zpayResponse.img) {
      qrUrl = zpayResponse.img
      qrImage = zpayResponse.img
    } else if (zpayResponse.qrcode) {
      qrCode = zpayResponse.qrcode
      qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        zpayResponse.qrcode
      )}`
    } else {
      throw new Error(`ZPAY未返回有效二维码字段: ${JSON.stringify(zpayResponse)}`)
    }

    await (supabase as any)
      .from('orders')
      .update({
        payment_provider: 'zpay',
        payment_order_id: zpayResponse.trade_no || zpayResponse.o_id || null,
        payment_transaction_id:
          zpayResponse.trade_no || zpayResponse.o_id || null,
        payment_amount: packageRow.price,
        payment_method: 'alipay',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return NextResponse.json(
      {
        orderId: orderData.id,
        packageName: orderData.package_name,
        price: Number(orderData.price),
        credits: orderData.credits,
        status: orderData.status,
        qrUrl,
        qrImage,
        qrCode,
        paymentProvider: 'zpay',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in create order:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '服务器内部错误',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const orderId = searchParams.get('orderId')

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 如果提供了 orderId，查询单个订单
    if (orderId) {
      const { data: order, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('Failed to fetch order:', error)
        return NextResponse.json({ error: '获取订单失败' }, { status: 500 })
      }

      return NextResponse.json({ order })
    }

    // 如果提供了 userId，查询用户的所有订单
    if (userId) {
      const { data: orders, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch orders:', error)
        return NextResponse.json({ error: '获取订单列表失败' }, { status: 500 })
      }

      return NextResponse.json({ orders })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Unexpected error in GET orders:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    )
  }
}