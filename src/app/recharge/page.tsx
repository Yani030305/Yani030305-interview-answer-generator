'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2, Sparkles, Zap, AlertCircle, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth-store'
import { supabase } from '@/lib/supabase'

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  originalPrice?: number
  bonus: number
  popular: boolean
}

export default function RechargePage() {
  const router = useRouter()
  const { user, credits, setCredits } = useAuthStore()
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<{
    orderId: string
    qrUrl: string
  } | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)

  useEffect(() => {
    fetchPackages()
  }, [])

  useEffect(() => {
    if (!user) {
      router.push('/auth')
    }
  }, [user, router])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (paymentInfo?.orderId && checkingPayment && user) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/orders?orderId=${paymentInfo.orderId}&userId=${user.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.order?.status === 'paid') {
              setCheckingPayment(false)
              const { data: profileData, error: profileError } = await (supabase as any)
                .from('profiles')
                .select('credits')
                .eq('id', user.id)
                .single()

              if (!profileError && profileData) {
                setCredits((profileData as any).credits)
              }

              alert('支付成功！积分已到账')
              router.push('/')
            }
          }
        } catch (err) {
          console.error('Failed to check payment status:', err)
        }
      }, 3000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [paymentInfo?.orderId, checkingPayment, user, setCredits, router])

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/credit-packages')
      if (!response.ok) {
        throw new Error('获取套餐列表失败')
      }
      const data = await response.json()
      setPackages(data.packages)
    } catch (err) {
      console.error('Failed to fetch packages:', err)
      // 使用默认套餐数据作为 fallback
      const defaultPackages: CreditPackage[] = [
        { id: 'basic', name: '基础套餐', credits: 100, price: 4.9, bonus: 0, popular: false },
        { id: 'standard', name: '标准套餐', credits: 500, price: 19.9, originalPrice: 24.5, bonus: 0, popular: true },
        { id: 'premium', name: '高级套餐', credits: 1000, price: 34.9, originalPrice: 49, bonus: 50, popular: false },
        { id: 'professional', name: '专业套餐', credits: 2000, price: 59.9, originalPrice: 98, bonus: 150, popular: false },
        { id: 'enterprise', name: '企业套餐', credits: 5000, price: 149.9, originalPrice: 245, bonus: 500, popular: false }
      ]
      setPackages(defaultPackages)
      setError('获取套餐列表失败，显示默认套餐')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      router.push('/auth')
      return
    }

    setSelectedPackage(packageId)
    setIsProcessing(true)
    setError(null)
    setPaymentInfo(null)

    try {
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          userId: user.id,
        }),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || '创建订单失败')
      }

      const orderData = await orderResponse.json()

      if (!orderData.qrUrl) {
        throw new Error('支付二维码获取失败')
      }

      setPaymentInfo({
        orderId: orderData.orderId,
        qrUrl: orderData.qrUrl,
      })

      setCheckingPayment(true)
    } catch (err) {
      console.error('Purchase failed:', err)
      setError(err instanceof Error ? err.message : '购买失败，请重试')
    } finally {
      setIsProcessing(false)
      setSelectedPackage(null)
    }
  }

  const handleCheckPayment = async () => {
    if (!paymentInfo?.orderId || !user) return

    setCheckingPayment(true)
    try {
      const response = await fetch(`/api/orders?orderId=${paymentInfo.orderId}&userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.order?.status === 'paid') {
          setCheckingPayment(false)
          const { data: profileData, error: profileError } = await (supabase as any)
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single()

          if (!profileError && profileData) {
            setCredits((profileData as any).credits)
          }

          alert('支付成功！积分已到账')
          router.push('/')
        } else {
          alert('订单尚未支付，请完成支付后重试')
        }
      }
    } catch (err) {
      console.error('Failed to check payment status:', err)
      alert('查询订单状态失败，请稍后重试')
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
            <h1 className="text-2xl font-bold">充值积分</h1>
            <p className="text-sm text-muted-foreground">
              当前积分：<span className="font-semibold text-primary">{credits}</span> 积分
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {paymentInfo && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-4">
              <QrCode className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">订单已创建</h3>
                <p className="text-sm text-blue-700 mb-4">
                  订单号：{paymentInfo.orderId}
                </p>
                
                <div className="mb-4">
                  <p className="text-sm text-blue-700 mb-2">请使用支付宝扫描二维码完成支付：</p>
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img 
                      src={paymentInfo.qrUrl}
                      alt="支付二维码"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCheckPayment}
                    disabled={checkingPayment}
                  >
                    {checkingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        检查中...
                      </>
                    ) : (
                      '我已完成支付'
                    )}
                  </Button>
                  <p className="text-xs text-blue-600">
                    支付完成后请点击"我已完成支付"按钮
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {packages.map((pkg) => {
            const totalCredits = pkg.credits + pkg.bonus
            const isSelected = selectedPackage === pkg.id
            const isDisabled = isProcessing

            return (
              <Card
                key={pkg.id}
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  pkg.popular
                    ? 'border-primary shadow-md scale-105'
                    : 'hover:border-primary/50'
                } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                onClick={() => !isDisabled && !paymentInfo && handlePurchase(pkg.id)}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    最受欢迎
                  </div>
                )}
                <CardContent className="pt-6 pb-4">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="h-6 w-6 text-yellow-500" />
                      <span className="text-3xl font-bold">{pkg.credits}</span>
                      <span className="text-sm text-muted-foreground">积分</span>
                    </div>

                    {pkg.bonus > 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        +{pkg.bonus} 赠送积分
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-primary">
                        ¥{pkg.price}
                      </div>
                      {pkg.originalPrice && (
                        <div className="text-sm text-muted-foreground line-through">
                          ¥{pkg.originalPrice}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      共 {totalCredits} 积分
                    </div>

                    <Button
                      className="w-full mt-3"
                      variant={pkg.popular ? 'default' : 'outline'}
                      disabled={isDisabled || !!paymentInfo}
                    >
                      {isSelected && isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          立即购买
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            积分使用说明
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• 生成一次回答需要 <span className="font-semibold text-foreground">10 积分</span></li>
            <li>• 导出全部回答需要 <span className="font-semibold text-foreground">50 积分</span></li>
            <li>• 积分永久有效，不会过期</li>
            <li>• 充值后积分立即到账</li>
            <li>• 如有问题请联系客服</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">重要提示</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• 本产品为虚拟商品，一经充值成功，概不退款</li>
                <li>• 请在充值前确认您的需求，谨慎购买</li>
                <li>• 如有任何疑问，请联系客服咨询</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
