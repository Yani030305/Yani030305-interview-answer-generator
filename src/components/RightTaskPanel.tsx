'use client'

import { ChevronDown, ChevronRight, Search, Filter, X, Check, History, Download, FileText, Loader2, Sparkles, Trash2, CheckCircle, MessageSquare } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store'
import { useAuthStore } from '@/store/auth-store'
import { questionCategories, tagLabels, getAllQuestions, filterQuestionsByMode, filterQuestionsByTags, searchQuestions } from '@/data/questions'
import { QuestionTag, QuestionItem } from '@/types'
import { cn } from '@/lib/utils'
import { translations } from '@/lib/translations'
import { supabase } from '@/lib/supabase'

interface RightTaskPanelProps {
  onSelectQuestion: (question: QuestionItem) => void
  selectedQuestionId: string | null
}

export function RightTaskPanel({ onSelectQuestion, selectedQuestionId }: RightTaskPanelProps) {
  const {
    userMode,
    uiLanguage,
    showFilteredQuestions,
    selectedTags,
    toggleTag,
    searchQuery,
    setSearchQuery,
    expandedCategories,
    toggleCategory,
    expandAllCategories,
    collapseAllCategories,
    documents,
    jobDescription,
    answers,
    setAnswer,
    setIsGenerating,
    isGenerating,
    stopGeneration,
    setStopGeneration,
    getGeneratedCount,
    clearAllAnswers,
    remainingTime,
    setRemainingTime,
  } = useAppStore()
  
  const { user, credits, setCredits } = useAuthStore()
  const t = translations[uiLanguage]

  // 生成相关状态
  const [isExporting, setIsExporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [showJDConfirmDialog, setShowJDConfirmDialog] = useState(false)
  const [pendingGenerate, setPendingGenerate] = useState<(() => void) | null>(null)

  // 问题历史状态
  const [generatedQuestions, setGeneratedQuestions] = useState<Set<string>>(new Set())
  const [previouslyGeneratedQuestions, setPreviouslyGeneratedQuestions] = useState<Set<string>>(new Set())

  const allQuestions = getAllQuestions()
  const applicableQuestions = filterQuestionsByMode(allQuestions, userMode, showFilteredQuestions)
  const filteredQuestions = useMemo(() => {
    let result = filterQuestionsByMode(allQuestions, userMode, showFilteredQuestions)
    result = filterQuestionsByTags(result, selectedTags)
    result = searchQuestions(result, searchQuery)
    return result
  }, [allQuestions, userMode, showFilteredQuestions, selectedTags, searchQuery])
  const filteredCount = useMemo(() => {
    return filterQuestionsByMode(allQuestions, userMode, false).filter(q => !q.isCampusApplicable).length
  }, [allQuestions, userMode])
  const availableTags = useMemo(() => {
    return Object.keys(tagLabels) as QuestionTag[]
  }, [])
  const generatedCount = getGeneratedCount()
  const totalCount = applicableQuestions.length
  const progress = totalCount > 0 ? (generatedCount / totalCount) * 100 : 0

  const jdRequiredQuestions = [
    'q38', 'q84', 'q93', 'q94', 'q95', 'q96', 'q97', 'q98', 'q99', 'q100',
    'q101', 'q104', 'q105', 'q106', 'q107'
  ]
  const jdRequiredSubcategories = [
    'company-industry', 'position-fit', 'short-term', 'long-term',
    'skill-development', 'team-contribution', 'salary-negotiation', 'availability'
  ]
  const hasJDRequiredQuestions = applicableQuestions.some(
    (q) => jdRequiredQuestions.includes(q.id) || jdRequiredSubcategories.includes(q.subcategory)
  )
  const needsJDConfirmation = !jobDescription && hasJDRequiredQuestions

  // 获取已生成的问题
  useEffect(() => {
    const fetchGeneratedQuestions = async () => {
      if (!user || !user.id) {
        setGeneratedQuestions(new Set())
        setPreviouslyGeneratedQuestions(new Set())
        return
      }
      try {
        const response = await fetch(`/api/answer-history?userId=${encodeURIComponent(user.id)}`)
        if (response.ok) {
          const data = await response.json()
          const currentSession = new Set<string>()
          const pastSession = new Set<string>()
          if (data.history && Array.isArray(data.history)) {
            data.history.forEach((item: any) => {
              if (item.questionId) {
                currentSession.add(item.questionId)
                pastSession.add(item.questionId)
              }
            })
          }
          setGeneratedQuestions(currentSession)
          setPreviouslyGeneratedQuestions(pastSession)
        }
      } catch (error) {
        console.error('Error fetching history:', error)
      }
    }
    fetchGeneratedQuestions()
  }, [user])

  // 倒计时
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

  // 重置进度
  useEffect(() => {
    if (!isGenerating) {
      setBatchProgress(0)
    }
  }, [isGenerating])

  const updateCredits = async () => {
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
  }

  const executeGenerateAll = async () => {
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
              skipCreditDeduction: index > 0,
              isBatch: index === 0,
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
          if (index === 0 && result.updatedCredits !== undefined) {
            setCredits(result.updatedCredits)
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
  }

  const handleGenerateAll = async () => {
    if (documents.length === 0) {
      alert(t.answerCard.uploadDocumentsFirst)
      return
    }
    if (!user) {
      alert(t.common.pleaseLogin)
      return
    }
    const requiredCredits = 999
    if (credits < requiredCredits) {
      alert(`积分不足！需要 ${requiredCredits} 积分，当前 ${credits} 积分，请充值！`)
      return
    }
    if (needsJDConfirmation) {
      setPendingGenerate(() => executeGenerateAll)
      setShowJDConfirmDialog(true)
      return
    }
    await executeGenerateAll()
  }

  const handleExport = async (format: 'docx' | 'markdown') => {
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
  }

  return (
    <div className="lg:sticky lg:top-20 space-y-4">
      {/* 顶部：问题搜索和标签 */}
      <Card className="p-4">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t.questionNav.title}
          </h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.questionNav.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {availableTags.slice(0, 8).map((tag) => (
              <Button
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7"
                onClick={() => toggleTag(tag)}
              >
                {uiLanguage === 'zh' ? tagLabels[tag].zh : tagLabels[tag].en}
              </Button>
            ))}
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => useAppStore.setState({ selectedTags: [] })}
              >
                {t.questionNav.showAll}
              </Button>
            )}
          </div>

          {userMode === 'campus' && filteredCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id="show-filtered-right"
                checked={showFilteredQuestions}
                onChange={(e) => useAppStore.setState({ showFilteredQuestions: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="show-filtered-right" className="text-muted-foreground">
                {t.questionNav.campusOnly} ({filteredCount})
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* 进度和工具 */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t.sidebar.generatedAnswers}</span>
              <span className="text-muted-foreground">
                {generatedCount} / {totalCount}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
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

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('docx')}
              disabled={isExporting || generatedCount === 0}
            >
              {isExporting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              DOCX
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('markdown')}
              disabled={isExporting || generatedCount === 0}
            >
              <FileText className="h-3 w-3 mr-1" />
              MD
            </Button>
          </div>

          {generatedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
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
        </div>
      </Card>

      {/* 问题列表 */}
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{t.questionNav.allQuestions}: {filteredQuestions.length}</h4>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={expandAllCategories} className="h-7 px-2 text-xs">
                展开
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAllCategories} className="h-7 px-2 text-xs">
                收起
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 aspect-square rounded-full bg-gray-300" />
              <span>未生成</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 aspect-square rounded-full bg-amber-500" />
              <span>历史</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 aspect-square rounded-full bg-green-500" />
              <span>已生成</span>
            </div>
          </div>
          
          <Separator />

          <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin">
            {questionCategories.map((category) => {
              const visibleQuestions = filterQuestionsByMode(
                category.subcategories.flatMap(s => s.questions),
                userMode,
                showFilteredQuestions
              )
              const tagFiltered = filterQuestionsByTags(visibleQuestions, selectedTags)
              const finalQuestions = searchQuestions(tagFiltered, searchQuery)
              
              if (finalQuestions.length === 0) return null

              const isExpanded = expandedCategories.includes(category.id)

              return (
                <div key={category.id} className="border rounded-md">
                  <button
                    className="w-full flex items-center justify-between p-2 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-1">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <span className="font-medium text-xs">
                        {uiLanguage === 'zh' ? category.nameZh : category.nameEn}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {finalQuestions.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t px-1 py-1">
                      {category.subcategories.map((subcategory) => {
                        const subQuestions = filterQuestionsByMode(
                          subcategory.questions,
                          userMode,
                          showFilteredQuestions
                        )
                        const subTag = filterQuestionsByTags(subQuestions, selectedTags)
                        const subSearch = searchQuestions(subTag, searchQuery)
                        
                        if (subSearch.length === 0) return null

                        return (
                          <div key={subcategory.id} className="py-0.5">
                            <div className="text-[10px] font-medium text-muted-foreground px-1 py-0.5">
                              {uiLanguage === 'zh' ? subcategory.nameZh : subcategory.nameEn}
                            </div>
                            {subSearch.map((question) => {
                              const answer = answers[question.id]
                              const { isGenerating: genState, currentGeneratingId } = useAppStore.getState()
                              const isCurrentGenerating = answer?.status === 'generating' || (genState && currentGeneratingId === question.id)
                              const isError = answer?.status === 'error'
                              const hasHistory = generatedQuestions.has(question.id) || previouslyGeneratedQuestions.has(question.id)
                              const isGeneratedInStore = answer?.status === 'done'

                              return (
                                <button
                                  key={question.id}
                                  className={cn(
                                    'w-full text-left px-2 py-1 text-[11px] rounded hover:bg-muted/30 transition-colors',
                                    selectedQuestionId === question.id && 'bg-primary/10 text-primary'
                                  )}
                                  onClick={() => onSelectQuestion(question)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 aspect-square rounded-full ${
                                      isCurrentGenerating ? 'bg-green-500 animate-pulse' :
                                      isError ? 'bg-red-500' :
                                      isGeneratedInStore ? 'bg-green-500' :
                                      hasHistory ? 'bg-amber-500' :
                                      'bg-gray-300'
                                    }`} />
                                    <span className="truncate">
                                      {uiLanguage === 'zh' ? question.questionZh : question.questionEn}
                                    </span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* 反馈 */}
      <Card className="p-4">
        <FeedbackForm />
      </Card>

      {/* JD确认对话框 */}
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
    </div>
  )
}

function FeedbackForm() {
  const { user } = useAuthStore()
  const [feedbackType, setFeedbackType] = useState('suggestion')
  const [feedbackContent, setFeedbackContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const { uiLanguage } = useAppStore()
  const t = translations[uiLanguage]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackContent.trim()) {
      alert('请输入反馈内容')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          content: feedbackContent.trim(),
          userId: user?.id,
          userEmail: user?.email
        })
      })
      if (!response.ok) {
        throw new Error('提交失败，请重试')
      }
      setSubmitSuccess(true)
      setFeedbackContent('')
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      alert('提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">问题反馈</h4>
      {submitSuccess ? (
        <div className="text-xs text-green-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          反馈提交成功，感谢您的反馈！
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <select
            value={feedbackType}
            onChange={(e) => setFeedbackType(e.target.value)}
            className="w-full text-xs p-2 border rounded-md"
          >
            <option value="suggestion">功能建议</option>
            <option value="bug">Bug 报告</option>
            <option value="other">其他问题</option>
          </select>
          <textarea
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            placeholder="请描述您遇到的问题或建议..."
            className="w-full text-xs p-2 border rounded-md min-h-[60px]"
            maxLength={500}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {feedbackContent.length}/500
            </span>
            <Button
              type="submit"
              size="sm"
              className="text-xs"
              disabled={isSubmitting || !feedbackContent.trim()}
            >
              {isSubmitting ? '提交中...' : '提交反馈'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
