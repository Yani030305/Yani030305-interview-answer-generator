'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Search, Trash2, Eye, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store'
import { useAuthStore } from '@/store/auth-store'
import { translations } from '@/lib/translations'
import { formatDate } from '@/lib/utils'
import { JDAnalysisDetailDialog } from '@/components/JDAnalysisDetailDialog'
import { JDAnalysisResult } from '@/lib/jd-analyzer'

interface JDAnalysisHistory {
  id: string
  company: string
  position: string
  city: string | null
  jd_text: string
  analysis_result: JDAnalysisResult
  created_at: string
  metadata: {
    industry?: string
    businessDirection?: string
    userMode?: 'campus' | 'experienced'
    documentCount?: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface HistoryResponse {
  data: JDAnalysisHistory[]
  pagination: Pagination
}

export default function JDAnalysisHistoryPage() {
  const router = useRouter()
  const { uiLanguage } = useAppStore()
  const { user, accessToken, setAccessToken } = useAuthStore()
  const t = translations[uiLanguage]

  const [history, setHistory] = useState<JDAnalysisHistory[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<JDAnalysisHistory | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  console.log('1. 页面进入')
  console.log('   user:', user)
  console.log('   accessToken:', accessToken ? '存在' : '不存在')

  const fetchHistory = useCallback(async () => {
    console.log('2. fetchHistory 被调用')
    console.log('   pagination.page:', pagination.page)
    console.log('   pagination.limit:', pagination.limit)
    console.log('   searchQuery:', searchQuery)

    setLoading(true)
    setError(null)

    try {
      console.log('3. 开始获取 accessToken')
      console.log('   当前 accessToken:', accessToken ? '存在' : '不存在')

      if (!accessToken) {
        console.log('4. accessToken 不存在，尝试从 auth-store 刷新')
        const { useAuthStore } = await import('@/store/auth-store')
        const store = useAuthStore.getState()
        console.log('   store.accessToken:', store.accessToken ? '存在' : '不存在')

        if (!store.accessToken) {
          console.log('5. accessToken 刷新后仍不存在')
          setError('登录状态已失效，请重新登录')
          return
        }
      }

      const token = accessToken || useAuthStore.getState().accessToken
      console.log('6. accessToken 获取结果:', token ? '成功' : '失败')

      console.log('7. 开始请求 /api/jd-analysis-history')

      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      params.set('limit', pagination.limit.toString())
      if (searchQuery.trim()) {
        params.set('company', searchQuery.trim())
      }

      const response = await fetch(`/api/jd-analysis-history?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('8. response status:', response.status)
      const result = await response.json()
      console.log('9. response json 原始结果:', JSON.stringify(result))

      if (!response.ok) {
        console.error('10. 请求失败，错误:', result.error)
        throw new Error(result.error || '获取分析历史失败')
      }

      const data = result as HistoryResponse
      console.log('11. 解析后的 records 数量:', data.data?.length || 0)

      setHistory(data.data || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })
      console.log('12. setHistory 和 setPagination 执行完成')
    } catch (err) {
      console.error('13. catch 到了错误:', err)
      setError(err instanceof Error ? err.message : '获取分析历史失败')
    } finally {
      console.log('14. finally 块执行')
      console.log('15. setLoading(false) 是否执行:', true)
      setLoading(false)
      console.log('16. 结束')
    }
  }, [pagination.page, pagination.limit, searchQuery, accessToken])

  useEffect(() => {
    console.log('17. useEffect 触发')
    fetchHistory()
  }, [fetchHistory])

  const handlePageChange = (page: number) => {
    console.log('18. handlePageChange:', page)
    setPagination(prev => ({ ...prev, page }))
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('19. handleSearch')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleViewDetail = (record: JDAnalysisHistory) => {
    setSelectedRecord(record)
    setShowDetailDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条分析历史吗？删除后无法恢复。')) {
      return
    }

    setDeletingId(id)
    setError(null)

    try {
      console.log('删除操作 - 开始获取 accessToken')
      let token = accessToken
      if (!token) {
        const store = useAuthStore.getState()
        token = store.accessToken
      }

      if (!token) {
        setError('登录状态已失效，请重新登录')
        setDeletingId(null)
        return
      }

      const response = await fetch(`/api/jd-analysis-history?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '删除失败')
      }

      setHistory(prev => prev.filter(item => item.id !== id))
      setPagination(prev => ({ ...prev, total: prev.total - 1 }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  if (error === '登录状态已失效，请重新登录') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">登录状态已失效</h1>
          <p className="text-muted-foreground mb-4">请重新登录后查看分析历史</p>
          <Button onClick={() => router.push('/auth')}>
            去登录
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">深度拆解历史</h1>
          <p className="text-muted-foreground">
            查看和管理您的岗位深度拆解记录
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-sm mb-1 block">搜索公司名称</Label>
                <Input
                  type="text"
                  placeholder="输入公司名称搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  搜索
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                >
                  重置
                </Button>
              </div>
            </div>
          </Card>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
            >
              关闭
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : history.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">暂无分析历史</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? '没有找到匹配的历史记录' : '您还没有进行过深度拆解，去首页开始分析吧'}
            </p>
            <Button onClick={() => router.push('/')}>
              去首页
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-semibold">{item.position}</h3>
                      <Badge variant="secondary">{item.company}</Badge>
                      {item.city && (
                        <Badge variant="outline">{item.city}</Badge>
                      )}
                      {item.metadata?.userMode && (
                        <Badge variant={item.metadata.userMode === 'campus' ? 'default' : 'secondary'}>
                          {item.metadata.userMode === 'campus' ? '校招' : '社招'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      分析时间：{formatDate(item.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewDetail(item)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      查看详情
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">岗位类型</h4>
                    <p className="text-sm">
                      {item.analysis_result?.oneLinerJudgment?.category || '未知'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">本质判断</h4>
                    <p className="text-sm line-clamp-2">
                      {item.analysis_result?.oneLinerJudgment?.essence || '未知'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">综合评估</h4>
                    <p className="text-sm">
                      {item.analysis_result?.suitabilityAssessment?.overall === 'high' ? '高度匹配' :
                       item.analysis_result?.suitabilityAssessment?.overall === 'medium' ? '中度匹配' :
                       item.analysis_result?.suitabilityAssessment?.overall === 'low' ? '低度匹配' : '未知'}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
              >
                首页
              </Button>
              <Button
                variant="ghost"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                上一页
              </Button>
              <span className="text-sm font-medium px-4">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                下一页
              </Button>
              <Button
                variant="ghost"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
              >
                末页
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedRecord && (
        <JDAnalysisDetailDialog
          result={selectedRecord.analysis_result}
          open={showDetailDialog}
          onClose={() => {
            setShowDetailDialog(false)
            setSelectedRecord(null)
          }}
          company={selectedRecord.company}
          position={selectedRecord.position}
        />
      )}
    </div>
  )
}
