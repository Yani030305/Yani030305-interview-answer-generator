import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: '此接口已废弃，请使用 /api/orders 接口创建订单',
      errorCode: 'DEPRECATED_ENDPOINT',
      message: '请使用新的订单系统进行充值',
      alternativeEndpoint: '/api/orders'
    },
    { status: 400 }
  )
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: '此接口已废弃，请使用 /api/orders 接口',
      errorCode: 'DEPRECATED_ENDPOINT',
      message: '请使用新的订单系统进行充值',
      alternativeEndpoint: '/api/orders'
    },
    { status: 400 }
  )
}
