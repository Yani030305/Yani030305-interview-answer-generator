'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Copy,
  RefreshCw,
  Check,
  Loader2,
  Languages,
  Sparkles,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Target,
  Lightbulb,
  AlertTriangle,
  MessageCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/store'
import { useAuthStore } from '@/store/auth-store'
import { QuestionItem, DisplayLanguage, AnswerStatus } from '@/types'
import { copyToClipboard, estimateSpeakingTime } from '@/lib/utils'
import { translations } from '@/lib/translations'
import { supabase } from '@/lib/supabase'
import { AnswerHistory } from '@/components/AnswerHistory'

interface AnswerCardProps {
  question: QuestionItem
}

export function AnswerCard({ question }: AnswerCardProps) {
  const { documents, userMode, answers, setAnswer, updateAnswer, setIsGenerating, isGenerating, currentGeneratingId, uiLanguage, jobDescription } =
    useAppStore()
  const { user, credits, setCredits } = useAuthStore()
  const t = translations[uiLanguage]

  const answer = answers[question.id]
  const [displayLang, setDisplayLang] = useState<DisplayLanguage>('zh')
  const [copied, setCopied] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [showQuestionDetails, setShowQuestionDetails] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [regenerateInput, setRegenerateInput] = useState('')
  const [showJDConfirmDialog, setShowJDConfirmDialog] = useState(false)
  const [pendingGenerate, setPendingGenerate] = useState<(() => void) | null>(null)

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

  const needsJDConfirmation = !jobDescription && 
    (jdRequiredQuestions.includes(question.id) || jdRequiredSubcategories.includes(question.subcategory))

  const status: AnswerStatus = answer?.status || 'idle'
  const isCurrentlyGenerating = isGenerating && currentGeneratingId === question.id

  const updateCredits = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()
      
      if (!error && data) {
        setCredits((data as any).credits)
      }
    } catch (e) {
      console.error('Failed to update credits:', e)
    }
  }, [user, setCredits])

  const executeGenerate = useCallback(async () => {
    setIsGenerating(true, question.id)
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
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate answer')
      }

      const result = await response.json()
      setAnswer(question.id, {
        questionId: question.id,
        answerZh: result.answerZh,
        answerEn: result.answerEn,
        highlightsZh: result.highlightsZh,
        highlightsEn: result.highlightsEn,
        sourceHighlights: result.highlightsZh || result.highlightsEn,
        status: 'done',
        updatedAt: new Date().toISOString(),
      })
      
      await updateCredits()
    } catch (error) {
      setAnswer(question.id, {
        questionId: question.id,
        answerZh: '',
        answerEn: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate answer',
      })
    } finally {
      setIsGenerating(false, null)
    }
  }, [question, documents, userMode, setAnswer, setIsGenerating, jobDescription, user, updateCredits])

  const handleGenerate = useCallback(async () => {
    if (documents.length === 0) {
      alert(t.answerCard.uploadDocumentsFirst)
      return
    }

    if (!user) {
      alert('请先登录')
      return
    }

    if (needsJDConfirmation) {
      setPendingGenerate(() => executeGenerate)
      setShowJDConfirmDialog(true)
      return
    }

    await executeGenerate()
  }, [documents, user, needsJDConfirmation, executeGenerate, t])

  const handleRegenerate = useCallback(
    async (adjustments?: string) => {
      if (documents.length === 0) return
      if (!user) {
        alert('请先登录')
        return
      }

      if (needsJDConfirmation) {
        setPendingGenerate(() => async () => {
          setIsGenerating(true, question.id)
          updateAnswer(question.id, { status: 'generating' })

          try {
            const response = await fetch('/api/generate-answer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question,
                documents,
                userMode,
                style: 'custom',
                adjustments,
                jobDescription,
                userId: user!.id,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to regenerate')
            }

            const result = await response.json()
            setAnswer(question.id, {
              questionId: question.id,
              answerZh: result.answerZh,
              answerEn: result.answerEn,
              highlightsZh: result.highlightsZh,
              highlightsEn: result.highlightsEn,
              sourceHighlights: result.highlightsZh || result.highlightsEn,
              status: 'done',
              updatedAt: new Date().toISOString(),
            })
            
            await updateCredits()
          } catch (error) {
            updateAnswer(question.id, {
              status: 'error',
              error: error instanceof Error ? error.message : 'Failed to regenerate',
            })
          } finally {
            setIsGenerating(false, null)
            setShowRegenerateDialog(false)
            setRegenerateInput('')
          }
        })
        setShowJDConfirmDialog(true)
        return
      }

      setIsGenerating(true, question.id)
      updateAnswer(question.id, { status: 'generating' })

      try {
        const response = await fetch('/api/generate-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            documents,
            userMode,
            style: 'custom',
            adjustments,
            jobDescription,
            userId: user!.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to regenerate')
        }

        const result = await response.json()
        setAnswer(question.id, {
          questionId: question.id,
          answerZh: result.answerZh,
          answerEn: result.answerEn,
          highlightsZh: result.highlightsZh,
          highlightsEn: result.highlightsEn,
          sourceHighlights: result.highlightsZh || result.highlightsEn,
          status: 'done',
          updatedAt: new Date().toISOString(),
        })
        
        await updateCredits()
      } catch (error) {
        updateAnswer(question.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to regenerate',
        })
      } finally {
        setIsGenerating(false, null)
        setShowRegenerateDialog(false)
        setRegenerateInput('')
      }
    },
    [question, documents, userMode, setAnswer, updateAnswer, setIsGenerating, jobDescription, user, updateCredits, needsJDConfirmation]
  )

  const handleCopy = useCallback(async () => {
    const text = displayLang === 'zh'
      ? (answer?.editedZh || answer?.answerZh || '').replace(/\\n/g, '\n')
      : (answer?.editedEn || answer?.answerEn || '').replace(/\\n/g, '\n')
    if (text) {
      await copyToClipboard(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [answer, displayLang])

  const handleEditStart = useCallback(() => {
    const text = displayLang === 'zh'
      ? (answer?.editedZh || answer?.answerZh || '').replace(/\\n/g, '\n')
      : (answer?.editedEn || answer?.answerEn || '').replace(/\\n/g, '\n')
    setEditText(text)
    setIsEditing(true)
  }, [answer, displayLang])

  const handleEditSave = useCallback(() => {
    if (displayLang === 'zh') {
      updateAnswer(question.id, { editedZh: editText })
    } else {
      updateAnswer(question.id, { editedEn: editText })
    }
    setIsEditing(false)
  }, [question.id, displayLang, editText, updateAnswer])

  const handleHistoryReplace = useCallback((answerZh: string, answerEn: string) => {
    setAnswer(question.id, {
      questionId: question.id,
      answerZh,
      answerEn,
      status: 'done',
      updatedAt: new Date().toISOString(),
    })
  }, [question.id, setAnswer])

  // Save answer to history when component unmounts (page refresh)
  useEffect(() => {
    return () => {
      if (status === 'done' && user && answer) {
        const saveToHistory = async () => {
          try {
            const response = await fetch('/api/answer-history', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.id,
                questionId: question.id,
                answerZh: answer.answerZh || '',
                answerEn: answer.answerEn || '',
              }),
            })
            if (!response.ok) {
              console.error('Error saving history on unmount:', await response.json())
            }
          } catch (error) {
            console.error('Error saving history on unmount:', error)
          }
        }
        saveToHistory()
      }
    }
  }, [status, user, question.id, answer])

  const currentText = displayLang === 'zh'
    ? (answer?.editedZh || answer?.answerZh || '').replace(/\\n/g, '\n')
    : (answer?.editedEn || answer?.answerEn || '').replace(/\\n/g, '\n')

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg leading-relaxed">
              {displayLang === 'zh' ? question.questionZh : question.questionEn}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <span>
                {displayLang === 'zh' ? question.questionEn : question.questionZh}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisplayLang(displayLang === 'zh' ? 'en' : 'zh')}
          >
            <Languages className="h-4 w-4 mr-1" />
            {displayLang === 'zh' ? 'EN' : '中文'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            onClick={() => setShowQuestionDetails(!showQuestionDetails)}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>{t.answerCard.questionDetails}</span>
            </div>
            {showQuestionDetails ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          
          {showQuestionDetails && (
            <div className="p-4 space-y-4 bg-background">
              {(question.questionIntentZh || question.questionIntentEn || question.questionIntent) && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {displayLang === 'zh'
                    ? (question.questionIntentZh || question.questionIntent || '')
                    : (question.questionIntentEn || question.questionIntent || '')}
                </p>
              )}
            </div>
          )}
        </div>

        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {t.answerCard.clickToGenerate}
            </p>
            <Button onClick={handleGenerate} disabled={documents.length === 0}>
              {t.answerCard.generateAnswer} (10积分)
            </Button>
            {documents.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {t.answerCard.uploadDocumentsFirst}
              </p>
            )}
          </div>
        )}

        {status === 'generating' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t.answerCard.generating}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-destructive mb-4">{answer?.error || 'An error occurred'}</p>
            <Button onClick={handleGenerate} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.answerCard.tryAgain}
            </Button>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground mb-4">{answer?.error || '生成已取消'}</p>
            <Button onClick={handleGenerate} variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              {t.answerCard.generateAnswer}
            </Button>
          </div>
        )}

        {status === 'done' && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{t.answerCard.estimatedTime}: ~{estimateSpeakingTime(currentText)}</span>
              <span>•</span>
              <span>{currentText.length} {t.answerCard.characters}</span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[200px] text-base leading-relaxed"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEditSave}>
                    {t.answerCard.save}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    {t.answerCard.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="text-base leading-relaxed whitespace-pre-wrap p-5 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/30 transition-all duration-300 shadow-sm border border-muted/30"
                onClick={handleEditStart}
              >
                {currentText || (
                  <span className="text-muted-foreground italic">
                    {t.answerCard.clickToEdit}
                  </span>
                )}
              </div>
            )}

            {answer?.sourceHighlights && answer.sourceHighlights.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowHighlights(!showHighlights)}
                >
                  <FileText className="h-4 w-4" />
                  {t.answerCard.keyPoints}
                  {showHighlights ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {showHighlights && (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {(displayLang === 'zh' ? answer.highlightsZh : answer.highlightsEn)?.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 mr-1 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? t.answerCard.copied : t.answerCard.copy}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegenerateDialog(true)}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {t.answerCard.regenerate}
              </Button>

              <Button variant="ghost" size="sm" onClick={handleEditStart}>
                {t.answerCard.edit}
              </Button>
            </div>

            {showRegenerateDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">重新生成回答</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowRegenerateDialog(false)
                          setRegenerateInput('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        请输入您希望调整的内容（例如：更简洁、更专业、更口语化等），或者留空直接重新生成。
                      </p>
                      <Textarea
                        placeholder="描述您想要的调整方向，例如：'更简短一些'、'增加项目细节'、'使用更正式的语言'..."
                        value={regenerateInput}
                        onChange={(e) => setRegenerateInput(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>
                    <div className="flex gap-2 mt-6">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowRegenerateDialog(false)
                          setRegenerateInput('')
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => handleRegenerate(regenerateInput)}
                        disabled={isCurrentlyGenerating}
                      >
                        {isCurrentlyGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          '重新生成'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {user && (
          <AnswerHistory
            questionId={question.id}
            userId={user.id}
            onReplace={handleHistoryReplace}
          />
        )}

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
      </CardContent>
    </Card>
  )
}
