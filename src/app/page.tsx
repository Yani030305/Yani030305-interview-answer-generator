'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Header } from '@/components/Header'
import { FileUploader } from '@/components/FileUploader'
import { AnswerCard } from '@/components/AnswerCard'
import { JobDescriptionUploader } from '@/components/JobDescriptionUploader'
import { useAppStore } from '@/store'
import { getAllQuestions, filterQuestionsByMode, filterQuestionsByTags, searchQuestions, questionCategories } from '@/data/questions'
import { QuestionItem } from '@/types'
import { FileUp, Briefcase, ChevronDown, ChevronUp, Search, Zap, CheckCircle2, X, MessageSquare, History, BookOpen, GraduationCap, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/lib/translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'
import { AnswerHistory } from '@/components/AnswerHistory'

export default function Home() {
  const { userMode, showFilteredQuestions, selectedTags, searchQuery, documents, setAnswer } = useAppStore()
  const { user, answerHistory, fetchAnswerHistory } = useAuthStore()
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null)
  const t = useTranslation()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [showFileList, setShowFileList] = useState(false)

  // 打开历史记录时获取数据
  useEffect(() => {
    if (showHistoryDrawer && user?.id) {
      fetchAnswerHistory(user.id)
    }
  }, [showHistoryDrawer, user?.id, fetchAnswerHistory])

  // 从历史记录替换答案
  const handleReplaceAnswer = (answerZh: string, answerEn: string) => {
    if (selectedQuestion) {
      setAnswer(selectedQuestion.id, {
        answerZh,
        answerEn,
        status: 'done',
        questionId: selectedQuestion.id,
        updatedAt: new Date().toISOString(),
      })
      setShowHistoryDrawer(false)
    }
  }

  const allQuestions = useMemo(() => getAllQuestions(), [])

  const filteredQuestions = useMemo(() => {
    let result = filterQuestionsByMode(allQuestions, userMode, showFilteredQuestions)
    result = filterQuestionsByTags(result, selectedTags)
    result = searchQuestions(result, searchQuery)
    return result
  }, [allQuestions, userMode, showFilteredQuestions, selectedTags, searchQuery])

  const handleSelectQuestion = useCallback((question: QuestionItem) => {
    setSelectedQuestion(question)
    setActiveCategory(question.category)
  }, [])

  useEffect(() => {
    if (!selectedQuestion && filteredQuestions.length > 0) {
      setSelectedQuestion(filteredQuestions[0])
    }
  }, [filteredQuestions, selectedQuestion])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* 左栏 - 320px */}
          <aside className="w-[320px] flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* 文档上传区 */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <FileUp className="h-5 w-5 text-blue-600" />
                      {t.sidebar.documents}
                    </h2>
                    {documents.length > 0 && (
                      <button
                        onClick={() => setShowFileList(!showFileList)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        {documents.length} 个文件
                        {showFileList ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-5 pt-3">
                  <CompactFileUploader />

                  {showFileList && documents.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 max-h-[120px] overflow-y-auto">
                      {documents.slice(0, 2).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm">
                          <span className="truncate flex-1 text-gray-700">{doc.name}</span>
                          <button className="text-gray-400 hover:text-red-500 ml-2">×</button>
                        </div>
                      ))}
                      {documents.length > 2 && (
                        <p className="text-xs text-gray-400 text-center">还有 {documents.length - 2} 个文件</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* JD 上传区 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  {t.sidebar.jobDescription}
                </h2>
              </div>
              <div className="p-5 pt-3">
                <JobDescriptionUploader />
              </div>
            </div>
            </div>
          </aside>

          {/* 中栏 - 自适应 */}
          <section className="flex-1 min-w-0">
            {selectedQuestion ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">当前问题</h2>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => setShowHistoryDrawer(true)}
                    >
                      <History className="h-4 w-4 mr-1" />
                      历史记录
                    </Button>
                  </div>
                  <AnswerCard key={selectedQuestion.id} question={selectedQuestion} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t.home.selectQuestion}</h3>
                <p className="text-sm text-gray-500">{t.home.chooseQuestionPrompt}</p>
              </div>
            )}
          </section>

          {/* 右栏 - 320px */}
          <aside className="w-[320px] flex-shrink-0">
            <div className="sticky top-24">
              <RightPanel 
                onSelectQuestion={handleSelectQuestion}
                selectedQuestionId={selectedQuestion?.id || null}
              />
            </div>
          </aside>
        </div>
      </main>



      {/* 历史记录弹窗 */}
      <Dialog open={showHistoryDrawer} onOpenChange={setShowHistoryDrawer}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>历史生成记录</DialogTitle>
            <DialogDescription>查看您之前生成的回答</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {selectedQuestion && user ? (
              <AnswerHistory 
                questionId={selectedQuestion.id}
                userId={user.id}
                onReplace={handleReplaceAnswer}
                allHistory={answerHistory}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">请先选择一个问题查看历史记录</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 紧凑版文件上传器
function CompactFileUploader() {
  const { documents, addDocument, removeDocument, uiLanguage } = useAppStore()
  const t = useTranslation()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null)
    setIsUploading(true)

    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    const MAX_FILE_SIZE = 20 * 1024 * 1024

    fileArray.forEach((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase()
      if (!['PDF', 'DOCX'].includes(ext || '')) {
        errors.push(`${file.name}: 不支持的文件格式`)
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: 文件太大`) 
      } else {
        validFiles.push(file)
      }
    })

    if (errors.length > 0) {
      setError(errors.join('\n'))
    }

    try {
      for (const file of validFiles) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/parse-document', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('上传失败，请稍后重试')
        }

        const doc = await response.json()
        addDocument(doc)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请稍后重试')
    } finally {
      setIsUploading(false)
    }
  }, [addDocument])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  return (
    <div className="space-y-3">
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-blue-300'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('compact-file-input')?.click()}
      >
        <input
          id="compact-file-input"
          type="file"
          multiple
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="flex flex-col items-center gap-1">
          {isUploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          ) : (
            <FileUp className="h-5 w-5 text-gray-500" />
          )}
          <div className="text-xs font-medium text-gray-700">
            {isUploading ? '上传中...' : '点击上传或拖拽文件'}
          </div>
          <p className="text-[11px] text-gray-400">
            PDF / DOCX，最大 20MB
          </p>
        </div>
      </div>

      {error && (
        <div className="p-2 text-[11px] text-red-600 bg-red-50 rounded-md whitespace-pre-line">
          {error}
        </div>
      )}
    </div>
  )
}

// 右侧统一面板组件
function RightPanel({ onSelectQuestion, selectedQuestionId }: { onSelectQuestion: (q: QuestionItem) => void, selectedQuestionId: string | null }) {
  const { userMode, showFilteredQuestions, selectedTags, searchQuery, uiLanguage, answers, isGenerating, currentGeneratingId } = useAppStore()
  const { user } = useAuthStore()
  const t = useTranslation()
  const allQuestions = useMemo(() => getAllQuestions(), [])
  const [localSearch, setLocalSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<Set<string>>(new Set())
  const [previouslyGeneratedQuestions, setPreviouslyGeneratedQuestions] = useState<Set<string>>(new Set())

  // 获取历史生成记录
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
        console.error('Error fetching generated questions:', error)
      }
    }

    fetchGeneratedQuestions()
  }, [user])

  // 根据分类 ID 获取显示名称
  const getCategoryName = useCallback((categoryId: string) => {
    const category = questionCategories.find(cat => cat.id === categoryId)
    if (!category) return categoryId
    return uiLanguage === 'zh' ? category.nameZh : category.nameEn
  }, [uiLanguage])

  const filteredQuestions = useMemo(() => {
    let result = filterQuestionsByMode(allQuestions, userMode, showFilteredQuestions)
    result = filterQuestionsByTags(result, selectedTags)
    result = searchQuestions(result, localSearch || searchQuery)
    return result
  }, [allQuestions, userMode, showFilteredQuestions, selectedTags, localSearch, searchQuery])

  // 按分类分组
  const questionsByCategory = useMemo(() => {
    const grouped: Record<string, QuestionItem[]> = {}
    filteredQuestions.forEach(q => {
      if (!grouped[q.category]) {
        grouped[q.category] = []
      }
      grouped[q.category].push(q)
    })
    return grouped
  }, [filteredQuestions])

  useEffect(() => {
    // 默认展开第一个分类
    if (!expandedCategory && Object.keys(questionsByCategory).length > 0) {
      setExpandedCategory(Object.keys(questionsByCategory)[0])
    }
  }, [questionsByCategory, expandedCategory])

  // 计算已生成的数量
  const answeredCount = useMemo(() => {
    let count = 0
    filteredQuestions.forEach(q => {
      if (answers[q.id]?.status === 'done' || generatedQuestions.has(q.id) || previouslyGeneratedQuestions.has(q.id)) {
        count++
      }
    })
    return count
  }, [filteredQuestions, answers, generatedQuestions, previouslyGeneratedQuestions])

  const totalCount = filteredQuestions.length
  const progressPercent = totalCount > 0 ? Math.min((answeredCount / totalCount) * 100, 100) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-blue-600" />
          问题列表
        </h2>
        
        {/* 搜索框 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="搜索问题..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 text-sm h-9"
          />
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-gray-700 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              已生成回答
            </span>
            <span className="text-[11px] text-gray-500">{answeredCount} / {totalCount}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 一键生成按钮 */}
        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm h-9">
          <Zap className="h-4 w-4 mr-2" />
          一键生成全部回答
        </Button>
      </div>

      {/* 状态指示器 */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 aspect-square rounded-full bg-gray-300" />
          <span>未生成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 aspect-square rounded-full bg-amber-500" />
          <span>历史生成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 aspect-square rounded-full bg-green-500" />
          <span>当前生成</span>
        </div>
      </div>

      {/* 问题树 */}
      <div className="p-0">
        <div className="max-h-[480px] overflow-y-auto">
          {Object.entries(questionsByCategory).map(([category, questions]) => (
            <div key={category} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{getCategoryName(category)}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">{questions.length}</Badge>
                </div>
                {expandedCategory === category ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {expandedCategory === category && (
                <div className="divide-y divide-gray-50">
                  {questions.map((question) => {
                    const answer = answers[question.id]
                    const isCurrentGenerating = answer?.status === 'generating' || (isGenerating && currentGeneratingId === question.id)
                    const isQueued = isGenerating && currentGeneratingId !== question.id && answer?.status === 'idle'
                    const isError = answer?.status === 'error'
                    const hasHistory = generatedQuestions.has(question.id) || previouslyGeneratedQuestions.has(question.id)
                    const isGeneratedInStore = answer?.status === 'done'

                    return (
                      <button
                        key={question.id}
                        onClick={() => onSelectQuestion(question)}
                        className={cn("w-full px-5 py-2.5 text-left hover:bg-gray-50 transition-colors group", selectedQuestionId === question.id ? "bg-blue-50" : "")}
                      >
                        <div className="flex items-center gap-2">
                          {/* 状态点 */}
                          <div className={cn("w-2 h-2 aspect-square rounded-full flex-shrink-0",
                            isCurrentGenerating ? 'bg-green-500 animate-pulse' : 
                            isQueued ? 'bg-gray-300 animate-pulse' : 
                            isError ? 'bg-red-500' : 
                            isGeneratedInStore ? 'bg-green-500' : 
                            hasHistory ? 'bg-amber-500' : 'bg-gray-300'
                          )} />
                          
                          {selectedQuestionId === question.id ? (
                            <ChevronRight className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 flex-shrink-0" />
                          )}
                          <span className={cn("text-xs line-clamp-2", selectedQuestionId === question.id ? "text-blue-700 font-medium" : "text-gray-700")}>
                            {uiLanguage === 'zh' ? question.questionZh : question.questionEn}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
