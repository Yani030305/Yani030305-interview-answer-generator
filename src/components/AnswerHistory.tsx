'use client'

import { useState, useMemo } from 'react'
import { Clock, Copy, Trash2, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnswerHistoryItem } from '@/types'
import { copyToClipboard } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

interface AnswerHistoryProps {
  questionId: string
  userId: string
  onReplace: (answerZh: string, answerEn: string) => void
  allHistory: AnswerHistoryItem[]
}

export function AnswerHistory({ questionId, userId, onReplace, allHistory }: AnswerHistoryProps) {
  const { removeAnswerHistory } = useAuthStore()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 从所有历史记录中筛选当前问题的记录
  const history = useMemo(() => {
    return allHistory.filter(item => item.questionId === questionId)
  }, [allHistory, questionId])

  const handleCopy = async (item: AnswerHistoryItem) => {
    await copyToClipboard(item.answerZh)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条历史记录吗？')) return

    try {
      const response = await fetch(`/api/answer-history?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        removeAnswerHistory(id)
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      console.error('删除历史记录失败:', error)
    }
  }

  const handleReplace = (item: AnswerHistoryItem) => {
    onReplace(item.answerZh, item.answerEn)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (history.length === 0) {
    return <div className="text-sm text-muted-foreground mt-6">暂无历史生成记录</div>
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4" />
        <span>历史生成记录 ({history.length})</span>
      </div>
      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-3 bg-muted/10 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {formatDate(item.createdAt)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(item)}
                  className="h-7 px-2"
                >
                  {copiedId === item.id ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReplace(item)}
                  className="h-7 px-2"
                  title="替代当前内容"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  title="删除记录"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div
              className={`text-sm text-muted-foreground cursor-pointer ${expandedId === item.id ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              {expandedId === item.id ? (
                item.answerZh.replace(/\\n/g, '\n')
              ) : (
                item.answerZh.replace(/\\n/g, ' ').substring(0, 100) + (item.answerZh.length > 100 ? '...' : '')
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
