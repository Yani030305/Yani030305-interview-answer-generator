'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, CheckCircle, X, DollarSign, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store'
import { supabase } from '@/lib/supabase'
import { translations } from '@/lib/translations'

export default function PaymentHistoryPage() {
  const router = useRouter()
  const { user, credits } = useAuthStore()
  const { uiLanguage } = useAppStore()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const t = translations[uiLanguage]

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    const fetchOrders = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'paid')
          .order('created_at', { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        setOrders(data || [])
      } catch (err) {
        console.error('Failed to fetch orders:', err)
        setError('获取支付记录失败，请稍后再试')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [user, router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'failed':
      case 'refunded':
      case 'cancelled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
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
      case 'cancelled':
        return '已取消'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* 侧边栏 */}
        <div className="w-full md:w-64 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle>账户信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-medium">{user.email}</div>
                  <div className="text-sm text-gray-500">
                    {credits} 积分
                  </div>
                </div>
              </div>
              <div className="my-4 border-t border-gray-200"></div>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => router.push('/')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  生成回答
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => router.push('/recharge')}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  充值积分
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start bg-gray-100"
                  onClick={() => router.push('/payment-history')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  支付记录
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>支付记录</CardTitle>
              <CardDescription>查看您的所有充值订单</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500">
                  {error}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  暂无支付记录
                </div>
              ) : (
                <div className="h-[600px] overflow-y-auto">
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{order.package_name}</CardTitle>
                            <span className={`${getStatusColor(order.status)} text-white text-xs px-2 py-1 rounded-full`}>
                            {getStatusText(order.status)}
                          </span>
                          </div>
                          <CardDescription>
                            订单号: {order.id}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-gray-500">积分数量</div>
                              <div className="font-medium">{order.credits} 积分</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">支付金额</div>
                              <div className="font-medium">¥{order.price.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">支付方式</div>
                              <div className="font-medium">{order.payment_method || '未指定'}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">支付时间</div>
                              <div className="font-medium">
                                {order.paid_at ? formatDate(order.paid_at) : '未支付'}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0">
                          <div className="text-xs text-gray-500">
                            创建时间: {formatDate(order.created_at)}
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}