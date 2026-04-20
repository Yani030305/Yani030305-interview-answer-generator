'use client'

import { X, Search, Sparkles, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store'
import { useAuthStore } from '@/store/auth-store'
import { translations } from '@/lib/translations'
import { JDAnalysisResult } from '@/lib/jd-analyzer'
import { JDAnalysisDetailDialog } from '@/components/JDAnalysisDetailDialog'

type AnalyzeJDResponse =
  | {
      success: true
      data: JDAnalysisResult
    }
  | {
      success: false
      error: string
    }

export function JobDescriptionUploader() {
  const router = useRouter()
  const { uiLanguage, documents, userMode } = useAppStore()
  const { user, credits, setCredits, refreshCredits, accessToken } = useAuthStore()
  const t = translations[uiLanguage]

  const [error, setError] = useState<string | null>(null)
  const [manualText, setManualText] = useState('')
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [city, setCity] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<JDAnalysisResult | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  if (analysisResult) {
    return (
      <>
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-medium">岗位拆解分析结果</div>
                <div className="text-xs text-muted-foreground">
                  {company} • {position}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAnalysisResult(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold mb-1">1. 岗位一句话判断</h3>
              <p className="text-sm text-muted-foreground">
                {analysisResult.oneLinerJudgment?.essence || '暂无结果'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">2. 岗位类型</h3>
              <p className="text-sm text-muted-foreground">
                {analysisResult.oneLinerJudgment?.category || '暂无结果'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">3. 关键职责</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                {(analysisResult.jdBreakdown || []).slice(0, 3).map((item, index) => (
                  <div key={index}>- {item.realMeaning}</div>
                ))}

                {(analysisResult.jdBreakdown || []).length > 3 && (
                  <div className="text-xs text-gray-500">... 更多职责</div>
                )}

                {(!analysisResult.jdBreakdown || analysisResult.jdBreakdown.length === 0) && (
                  <div>暂无结果</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">4. 能力要求</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  必备：
                  {(analysisResult.keyCapabilities?.required || []).slice(0, 3).join('、') || '暂无结果'}
                </div>
                <div>
                  加分：
                  {(analysisResult.keyCapabilities?.preferred || []).slice(0, 2).join('、') || '暂无结果'}
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setShowDetailDialog(true)}
          >
            查看详情
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Card>

        <JDAnalysisDetailDialog
          result={analysisResult}
          open={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
          company={company}
          position={position}
        />
      </>
    )
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">岗位描述 (JD)</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/jd-analysis-history')}
            className="text-xs"
          >
            查看历史记录
          </Button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">公司名称</Label>
              <Input
                type="text"
                placeholder="请输入公司名称"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">岗位名称</Label>
              <Input
                type="text"
                placeholder="请输入岗位名称"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">城市（可选）</Label>
            <Input
              type="text"
              placeholder="请输入城市"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">岗位描述</Label>
            <textarea
              className="w-full h-40 p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="请粘贴或输入岗位描述内容..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={async () => {
              console.log('1. 按钮被点击')
              console.log('   company:', company)
              console.log('   position:', position)
              console.log('   manualText:', manualText)
              console.log('   user:', user)
              console.log('   credits:', credits)

              if (!company.trim()) {
                console.log('2. 未输入公司名称')
                setError('请输入公司名称')
                return
              }

              if (!position.trim()) {
                console.log('2. 未输入岗位名称')
                setError('请输入岗位名称')
                return
              }

              if (!manualText.trim()) {
                console.log('2. 未输入岗位描述')
                setError('请输入岗位描述')
                return
              }

              if (!user) {
                console.log('2. 未登录')
                setError('请先登录')
                return
              }

              if (credits < 50) {
                console.log('2. 积分不足')
                setError('积分不足，需要50积分进行分析')
                return
              }

              console.log('2. accessToken:', accessToken)

              if (!accessToken) {
                console.log('3. accessToken 不存在')
                setError('登录状态已失效，请重新登录')
                return
              }

              setError(null)
              setIsAnalyzing(true)

              const controller = new AbortController()
              const timeoutId = setTimeout(() => {
                controller.abort()
              }, 90000)

              try {
                console.log('3. 开始请求 /api/analyze-jd')
                const response = await fetch('/api/analyze-jd', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    company: company.trim(),
                    position: position.trim(),
                    jdText: manualText.trim(),
                    city: city.trim(),
                    userMode,
                    userDocuments: documents,
                  }),
                  signal: controller.signal,
                })

                console.log('4. response status:', response.status)

                if ([502, 503, 504].includes(response.status)) {
                  console.error(`5. 网关/服务超时错误: ${response.status}`)
                  setError('分析超时或服务暂时不可用，请稍后重试')
                  return
                }

                const contentType = response.headers.get('content-type') || ''
                console.log('5. content-type:', contentType)

                if (!response.ok && !contentType.includes('application/json')) {
                  const textResponse = await response.text()
                  console.error('6. 非 JSON 错误响应:', textResponse.slice(0, 500))
                  throw new Error('服务异常，请稍后重试')
                }

                let result: AnalyzeJDResponse

                if (contentType.includes('application/json')) {
                  result = await response.json()
                } else {
                  const textResponse = await response.text()
                  console.error('6. 非 JSON 响应:', textResponse.slice(0, 500))
                  throw new Error('分析失败，请稍后重试')
                }

                console.log('6. response result:', result)

                if (!response.ok) {
                  throw new Error('error' in result ? result.error : '分析失败，请稍后重试')
                }

                if (!result.success) {
                  throw new Error(result.error || '分析失败，请稍后重试')
                }

                console.log('7. 分析成功')
                const analysisData = result.data
                setAnalysisResult(analysisData)

                setCredits(Math.max(credits - 50, 0))
                await refreshCredits()
                console.log('8. 刷新积分完成')
              } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                  console.error('错误: 请求超时/被中止')
                  setError('分析耗时过长，请稍后重试')
                } else {
                  console.error('错误:', err)
                  setError(err instanceof Error ? err.message : '分析失败，请稍后重试')
                }
              } finally {
                clearTimeout(timeoutId)
                console.log('9. 结束')
                setIsAnalyzing(false)
              }
            }}
            disabled={isAnalyzing || !company.trim() || !position.trim() || !manualText.trim()}
          >
            {isAnalyzing ? (
              <>
                <Search className="h-4 w-4 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                深度岗位拆解（50积分）
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            上传简历后可获得更精准的匹配分析；不上传也可先进行岗位拆解。
          </p>
        </div>

        {error && (
          <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}
      </Card>
    </div>
  )
}