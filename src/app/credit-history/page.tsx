'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Coins, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth-store'

interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  type: string
  description: string | null
  order_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export default function CreditHistoryPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/auth')
    } else {
      fetchTransactions()
    }
  }, [user, router])

  const fetchTransactions = async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch(`/api/credit-history?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('获取积分记录失败')
      }
      const data = await response.json()
      setTransactions(data.transactions)
    } catch (err) {
      console.error('Failed to fetch credit transactions:', err)
      setError('获取积分记录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    if (type === 'deposit' || type === 'purchase' || type === 'signup_bonus') {
      return <CreditCard className="h-4 w-4 text-green-500" />
    }
    return <Coins className="h-4 w-4 text-orange-500" />
  }

  const getTransactionType = (type: string) => {
    switch (type) {
      case 'deposit':
        return '充值'
      case 'purchase':
        return '购买套餐'
      case 'signup_bonus':
        return '注册赠送'
      case 'withdrawal':
        return '扣除'
      case 'refund':
        return '退还'
      case 'generation':
        return '生成回答'
      default:
        return type
    }
  }

  const formatAmount = (amount: number, type: string) => {
    if (type === 'deposit' || type === 'refund' || type === 'purchase' || type === 'signup_bonus') {
      return `+${amount}`
    }
    return `-${amount}`
  }

  const getAmountColor = (type: string) => {
    if (type === 'deposit' || type === 'refund' || type === 'purchase' || type === 'signup_bonus') {
      return 'text-green-600'
    }
    return 'text-orange-600'
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
            <h1 className="text-2xl font-bold">积分使用记录</h1>
            <p className="text-sm text-muted-foreground">
              查看您的积分交易历史
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
                onClick={fetchTransactions}
                className="mt-2"
              >
                重试
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">暂无积分交易记录</p>
              </CardContent>
            </Card>
          ) : (
            transactions.map((transaction) => (
              <Card key={transaction.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.type)}
                      <CardTitle className="text-lg">{getTransactionType(transaction.type)}</CardTitle>
                    </div>
                    <span className={`font-semibold ${getAmountColor(transaction.type)}`}>
                      {formatAmount(transaction.amount, transaction.type)} 积分
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">描述：</span>
                      <span>{transaction.description || '无'}</span>
                    </div>
                    {transaction.order_id && (
                      <div>
                        <span className="text-muted-foreground">订单号：</span>
                        <span className="font-mono text-xs">{transaction.order_id}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-muted-foreground">时间：</span>
                      <span>{new Date(transaction.created_at).toLocaleString()}</span>
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
