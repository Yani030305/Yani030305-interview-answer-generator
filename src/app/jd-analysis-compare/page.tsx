'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/auth-store'
import { formatDate } from '@/lib/utils'

export const dynamic = "force-dynamic"

interface JDAnalysisHistory {
  id: string
  company: string
  position: string
  city: string | null
  jd_text: string
  analysis_result: any
  created_at: string
  metadata: any
}

function JDAnalysisCompareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  
  const ids = searchParams.get('ids')?.split(',') || []
  
  const [analysisData, setAnalysisData] = useState<JDAnalysisHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取分析数据
  useEffect(() => {
    if (!user || ids.length === 0) {
      setLoading(false)
      return
    }

    const fetchAnalysisData = async () => {
      setLoading(true)
      setError(null)

      try {
        const data: JDAnalysisHistory[] = []
        
        // 逐个获取分析结果
        for (const id of ids) {
          const response = await fetch(`/api/jd-analysis-history?id=${id}`)
          if (response.ok) {
            const item = await response.json()
            data.push(item)
          }
        }

        setAnalysisData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取分析数据失败')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysisData()
  }, [user, ids])

  // 处理导出
  const handleExport = async () => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'jd_analysis_compare',
          ids
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '导出失败')
      }

      // 下载文件
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jd-analysis-compare-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <Button onClick={() => router.push('/auth')}>
            去登录
          </Button>
        </div>
      </div>
    )
  }

  if (ids.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请选择要对比的分析结果</h1>
          <Button onClick={() => router.push('/jd-analysis-history')}>
            返回历史记录
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/jd-analysis-history')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回历史记录
            </Button>
            <h1 className="text-3xl font-bold">岗位分析对比</h1>
          </div>
          <p className="text-muted-foreground">
            对比不同岗位的分析结果，帮助您做出更明智的职业选择
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        ) : analysisData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-xl font-medium mb-4">未找到分析数据</h3>
            <Button onClick={() => router.push('/jd-analysis-history')}>
              返回历史记录
            </Button>
          </div>
        ) : (
          <>
            {/* 操作栏 */}
            <div className="flex justify-end mb-6">
              <Button
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                导出对比报告
              </Button>
            </div>

            {/* 基本信息对比 */}
            <Card className="mb-6 p-4">
              <h2 className="text-lg font-semibold mb-4">基本信息对比</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysisData.map((item, index) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">岗位 {index + 1}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">公司</p>
                      <p className="font-medium">{item.company}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">岗位</p>
                      <p className="font-medium">{item.position}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">城市</p>
                      <p>{item.city || '未知'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">分析时间</p>
                      <p>{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 详细对比 */}
            <Tabs defaultValue="jobNature" className="mb-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="jobNature">岗位本质</TabsTrigger>
                <TabsTrigger value="responsibilities">职责对比</TabsTrigger>
                <TabsTrigger value="capabilities">能力要求</TabsTrigger>
                <TabsTrigger value="suitability">匹配度</TabsTrigger>
              </TabsList>
              
              {/* 岗位本质 */}
              <TabsContent value="jobNature" className="mt-4">
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisData.map((item, index) => (
                      <div key={item.id} className="space-y-3">
                        <h3 className="text-lg font-semibold">
                          {item.company} - {item.position}
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <h4 className="text-sm font-medium mb-1">岗位本质</h4>
                            <p className="text-sm">
                              {item.analysis_result?.oneLinerJudgment?.essence || '未知'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">岗位类型</h4>
                            <p className="text-sm">
                              {item.analysis_result?.oneLinerJudgment?.category || '未知'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">日常工作</h4>
                            <ul className="text-sm space-y-1">
                              {item.analysis_result?.dailyWork?.highFrequencyTasks?.slice(0, 3).map((task: string, i: number) => (
                                <li key={i}>• {task}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              {/* 职责对比 */}
              <TabsContent value="responsibilities" className="mt-4">
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisData.map((item, index) => (
                      <div key={item.id} className="space-y-3">
                        <h3 className="text-lg font-semibold">
                          {item.company} - {item.position}
                        </h3>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">职责拆解</h4>
                          <ul className="text-sm space-y-2">
                            {item.analysis_result?.jdBreakdown?.slice(0, 5).map((item: any, i: number) => (
                              <li key={i} className="p-2 bg-muted/50 rounded-md">
                                <p className="font-medium mb-1">{item.originalDuty || `职责 ${i + 1}`}</p>
                                <p className="text-muted-foreground">{item.realMeaning}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              {/* 能力要求 */}
              <TabsContent value="capabilities" className="mt-4">
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisData.map((item, index) => (
                      <div key={item.id} className="space-y-3">
                        <h3 className="text-lg font-semibold">
                          {item.company} - {item.position}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium mb-1">必备能力</h4>
                            <ul className="text-sm space-y-1">
                              {item.analysis_result?.keyCapabilities?.required?.map((capability: string, i: number) => (
                                <li key={i}>• {capability}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">加分能力</h4>
                            <ul className="text-sm space-y-1">
                              {item.analysis_result?.keyCapabilities?.preferred?.map((capability: string, i: number) => (
                                <li key={i}>• {capability}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">易忽略但重要的能力</h4>
                            <ul className="text-sm space-y-1">
                              {item.analysis_result?.keyCapabilities?.easilyIgnored?.map((capability: string, i: number) => (
                                <li key={i}>• {capability}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              {/* 匹配度 */}
              <TabsContent value="suitability" className="mt-4">
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysisData.map((item, index) => (
                      <div key={item.id} className="space-y-3">
                        <h3 className="text-lg font-semibold">
                          {item.company} - {item.position}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium mb-1">整体匹配度</h4>
                            <Badge
                              variant={
                                item.analysis_result?.suitability?.matchLevel === '高' ? 'default' :
                                item.analysis_result?.suitability?.matchLevel === '中' ? 'secondary' :
                                'outline'
                              }
                            >
                              {item.analysis_result?.suitability?.matchLevel || '未知'}
                            </Badge>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">匹配原因</h4>
                            <p className="text-sm">
                              {item.analysis_result?.suitability?.reason || '未知'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">改进建议</h4>
                            <p className="text-sm">
                              {item.analysis_result?.suitability?.suggestions || '未知'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}

export default function JDAnalysisComparePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JDAnalysisCompareContent />
    </Suspense>
  )
}