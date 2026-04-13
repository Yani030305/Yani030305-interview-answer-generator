'use client'

import { useState, useEffect } from 'react'
import { Clock, Copy, Trash2, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnswerHistoryItem } from '@/types'
import { copyToClipboard } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface AnswerHistoryProps {
  questionId: string
  userId: string
  onReplace: (answerZh: string, answerEn: string) => void
}

export function AnswerHistory({ questionId, userId, onReplace }: AnswerHistoryProps) {
  const [history, setHistory] = useState<AnswerHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [questionId, userId])

  const fetchHistory = async () => {
    try {
      console.log('Fetching history for userId:', userId, 'questionId:', questionId)
      const response = await fetch(
        `/api/answer-history?userId=${encodeURIComponent(userId)}&questionId=${encodeURIComponent(questionId)}`
      )
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      if (response.ok) {
        setHistory(data.history || [])
      } else {
        console.error('Error response:', data)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

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
        setHistory(history.filter((h) => h.id !== id))
      }
    } catch (error) {
      console.error('Error deleting history:', error)
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

  if (loading) {
    return <div className="text-sm text-muted-foreground">加载历史记录...</div>
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
