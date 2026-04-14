'use client'

import { Download, FileText, Loader2, Sparkles, Trash2, CheckCircle, X } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store'
import { useAuthStore } from '@/store/auth-store'
import { getAllQuestions, filterQuestionsByMode } from '@/data/questions'
import { translations } from '@/lib/translations'
import { JobDescriptionUploader } from '@/components/JobDescriptionUploader'
import { supabase, createClient } from '@/lib/supabase'
import { Database } from '@/types/supabase'

export function Sidebar() {
  const {
    userMode,
    uiLanguage,
    documents,
    jobDescription,
    answers,
    setAnswer,
    setIsGenerating,
    isGenerating,
    stopGeneration,
    setStopGeneration,
    showFilteredQuestions,
    getGeneratedCount,
    clearAllAnswers,
    remainingTime,
    setRemainingTime,
  } = useAppStore()
  const { user, credits, setCredits } = useAuthStore()

  const t = translations[uiLanguage]
  const [isExporting, setIsExporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [showJDConfirmDialog, setShowJDConfirmDialog] = useState(false)
  const [pendingGenerate, setPendingGenerate] = useState<(() => void) | null>(null)

  const allQuestions = getAllQuestions()
  const applicableQuestions = filterQuestionsByMode(allQuestions, userMode, showFilteredQuestions)
  const generatedCount = getGeneratedCount()
  const totalCount = applicableQuestions.length
  const progress = totalCount > 0 ? (generatedCount / totalCount) * 100 : 0

  const jdRequiredQuestions = [
    'q38',
    'q84',
    'q93',
    'q94',
    'q95',
    'q96',
    'q97',
    'q98',
    'q99',
    'q100',
    'q101',
    'q104',
    'q105',
    'q106',
    'q107',
  ]

  const jdRequiredSubcategories = [
    'company-industry',
    'position-fit',
    'short-term',
    'long-term',
    'skill-development',
    'team-contribution',
    'salary-negotiation',
    'availability',
  ]

  const hasJDRequiredQuestions = applicableQuestions.some(
    (q) => jdRequiredQuestions.includes(q.id) || jdRequiredSubcategories.includes(q.subcategory)
  )
  const needsJDConfirmation = !jobDescription && hasJDRequiredQuestions

  // 倒计时逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isGenerating && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(remainingTime - 1)
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isGenerating, remainingTime, setRemainingTime])

  // 监听生成状态变化，重置进度
  useEffect(() => {
    if (!isGenerating) {
      setBatchProgress(0)
    }
  }, [isGenerating])

  const updateCredits = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user!.id)
        .single()

      if (!error && data) {
        setCredits((data as any).credits)
      }
    } catch (e) {
      console.error('Failed to update credits:', e)
    }
  }, [user, setCredits])

  const executeGenerateAll = useCallback(async () => {
    const questionsToGenerate = applicableQuestions.filter((q) => {
      const answer = answers[q.id]
      return !answer || answer.status !== 'done'
    })

    if (questionsToGenerate.length === 0) {
      alert(t.sidebar.allAnswersGenerated)
      setIsGenerating(false)
      return
    }

    setIsGenerating(true)
    let completed = 0

    try {
      // 批量生成所有回答
      for (const [index, question] of questionsToGenerate.entries()) {
        if (useAppStore.getState().stopGeneration) {
          setAnswer(question.id, {
            questionId: question.id,
            answerZh: '',
            answerEn: '',
            status: 'cancelled',
            error: '生成已取消',
          })
          break
        }

        setAnswer(question.id, {
          questionId: question.id,
          answerZh: '',
          answerEn: '',
          status: 'generating',
        })

        try {
          const response = await fetch('/api/generate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question,
              documents,
              userMode,
              jobDescription,
              userId: user!.id,
              isBatch: index === 0, // 只在第一个请求中扣除 999 积分
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || t.common.failedToGenerate)
          }

          const result = await response.json()
          setAnswer(question.id, {
            questionId: question.id,
            answerZh: result.answerZh,
            answerEn: result.answerEn,
            sourceHighlights: result.highlights,
            status: 'done',
            updatedAt: new Date().toISOString(),
          })
          
          if (index === 0) {
            await updateCredits() // 只在第一个请求后更新积分显示
          }
        } catch (error) {
          setAnswer(question.id, {
            questionId: question.id,
            answerZh: '',
            answerEn: '',
            status: 'error',
            error: error instanceof Error ? error.message : t.common.failedToGenerate,
          })
        }

        completed++
        setBatchProgress((completed / questionsToGenerate.length) * 100)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '生成失败，请重试')
    } finally {
      setStopGeneration(false)
      setIsGenerating(false)
      setBatchProgress(0)
    }
  }, [applicableQuestions, answers, documents, setAnswer, setIsGenerating, setStopGeneration, userMode, jobDescription, user, credits, updateCredits])

  const handleGenerateAll = useCallback(async () => {
    if (documents.length === 0) {
      alert(t.answerCard.uploadDocumentsFirst)
      return
    }

    if (!user) {
      alert(t.common.pleaseLogin)
      return
    }

    // 检查积分是否足够
    const requiredCredits = 999
    if (credits < requiredCredits) {
      if (confirm(`积分不足！需要 ${requiredCredits} 积分，当前 ${credits} 积分。是否前往充值？`)) {
        // 跳转到充值页面
        window.location.href = '/recharge'
      }
      return
    }

    if (needsJDConfirmation) {
      setPendingGenerate(() => executeGenerateAll)
      setShowJDConfirmDialog(true)
      return
    }

    await executeGenerateAll()
  }, [documents, user, credits, needsJDConfirmation, executeGenerateAll, t])

  const handleExport = useCallback(
    async (format: 'docx' | 'markdown') => {
      if (!user) {
        alert(t.common.pleaseLogin)
        return
      }

      setIsExporting(true)
      try {
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMode,
            documents,
            answers,
            format,
            userId: user.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || t.common.failedToExport)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `interview-answers.${format === 'docx' ? 'docx' : 'md'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        await updateCredits()
      } catch (error) {
        console.error('Export failed:', error)
        alert(error instanceof Error ? error.message : t.common.exportFailed)
      } finally {
        setIsExporting(false)
      }
    },
    [userMode, documents, answers, user, updateCredits]
  )

  return (
    <Card className="sticky top-20 p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{t.sidebar.generatedAnswers}</span>
          <span className="text-muted-foreground">
            {generatedCount} / {totalCount}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{userMode === 'campus' ? t.header.campus : t.header.experienced}</span>
      </div>

      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={handleGenerateAll}
          disabled={isGenerating || documents.length === 0}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t.answerCard.generating} {Math.round(batchProgress)}%
              {remainingTime > 0 && (
                <span className="ml-2 text-xs">
                  ({remainingTime}s)
                </span>
              )}
            </>
          ) : (
            <>            
              <Sparkles className="h-4 w-4 mr-2" />
              一键生成全部回答 (999积分)
            </>
          )}
        </Button>

        {isGenerating && (
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => setStopGeneration(true)}
          >
            {t.sidebar.stopGeneration}
          </Button>
        )}

        {documents.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {t.answerCard.uploadDocumentsFirst}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleExport('docx')}
          disabled={isExporting || generatedCount === 0}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {t.sidebar.exportAll} (DOCX) - 50积分
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleExport('markdown')}
          disabled={isExporting || generatedCount === 0}
        >
          <FileText className="h-4 w-4 mr-2" />
          {t.sidebar.exportAll} (Markdown) - 50积分
        </Button>
      </div>

      {generatedCount > 0 && (
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm(t.sidebar.clearConfirm)) {
              clearAllAnswers()
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t.sidebar.clearAll}
        </Button>
      )}

      <div className="pt-4 border-t space-y-2">
        <h4 className="text-sm font-medium">{t.sidebar.documents}</h4>
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.sidebar.uploadTip}</p>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="truncate">{doc.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>



      {showJDConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t.answerCard.jdConfirmTitle}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowJDConfirmDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <p className="text-sm">
                  {t.answerCard.jdConfirmMessage}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.answerCard.jdConfirmSuggestion}
                </p>
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowJDConfirmDialog(false)}
                >
                  {t.answerCard.jdConfirmCancel}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    pendingGenerate?.()
                    setShowJDConfirmDialog(false)
                  }}
                >
                  {t.answerCard.jdConfirmContinue}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
