'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Clock, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth-store'

interface Order {
  id: string
  package_name: string
  price: number
  credits: number
  status: string
  created_at: string
  paid_at: string | null
}

export default function PaymentHistoryPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth')
    } else {
      fetchOrders()
    }
  }, [user, router])

  const fetchOrders = async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch(`/api/orders?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('获取订单历史失败')
      }
      const data = await response.json()
      // 只显示已支付的订单
      const paidOrders = data.orders.filter((order: Order) => order.status === 'paid')
      setOrders(paidOrders)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      setError('获取订单历史失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
      case 'refunded':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return '已支付'
      case 'pending':
        return '待支付'
      case 'failed':
        return '支付失败'
      case 'refunded':
        return '已退款'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">充值历史</h1>
            <p className="text-sm text-muted-foreground">
              查看您的积分充值记录
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrders}
                className="mt-2"
              >
                重试
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">暂无充值记录</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{order.package_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <span className="text-sm font-medium">
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2">
                      <span className="text-muted-foreground">订单号：</span>
                      <span className="font-mono text-xs">{order.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">订单金额：</span>
                      <span className="font-semibold">¥{order.price}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">获得积分：</span>
                      <span className="font-semibold">{order.credits} 积分</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">创建时间：</span>
                      <span>{new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">支付时间：</span>
                      <span>
                        {order.paid_at 
                          ? new Date(order.paid_at).toLocaleString() 
                          : '未支付'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
