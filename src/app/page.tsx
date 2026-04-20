'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Header } from '@/components/Header'
import { FileUploader } from '@/components/FileUploader'
import { QuestionNav } from '@/components/QuestionNav'
import { AnswerCard } from '@/components/AnswerCard'
import { JobDescriptionUploader } from '@/components/JobDescriptionUploader'
import { RightTaskPanel } from '@/components/RightTaskPanel'
import { useAppStore } from '@/store'
import { getAllQuestions, filterQuestionsByMode, filterQuestionsByTags, searchQuestions } from '@/data/questions'
import { QuestionItem } from '@/types'
import { FileUp, MessageSquare, Briefcase, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/lib/translations'

export default function Home() {
  const { userMode, showFilteredQuestions, selectedTags, searchQuery, documents } = useAppStore()
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null)
  const t = useTranslation()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

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
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="container px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              页面可能偶尔会卡顿显示积分为0的情况，请尝试按“Ctrl+Shift+R”刷新，如果还有此类问题请邮件联系客服 <a href="mailto:hiremind@qq.com" className="font-medium hover:underline">hiremind@qq.com</a>，会在24小时内处理
            </p>
          </div>
        </div>
      </div>

      <main className="container px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧 - 输入材料区 */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="lg:sticky lg:top-20 space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  {t.sidebar.documents}
                </h2>
                <CompactFileUploader />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {t.sidebar.jobDescription}
                </h2>
                <JobDescriptionUploader />
              </div>
            </div>
          </aside>

          {/* 中间 - 主回答区 */}
          <section className="lg:col-span-5" ref={mainContentRef}>
            {selectedQuestion ? (
              <AnswerCard key={selectedQuestion.id} question={selectedQuestion} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">{t.home.selectQuestion}</h3>
                <p className="text-muted-foreground">
                  {t.home.chooseQuestionPrompt}
                </p>
              </div>
            )}
          </section>

          {/* 右侧 - 任务与工具区 */}
          <aside className="lg:col-span-4">
            <RightTaskPanel 
              onSelectQuestion={handleSelectQuestion}
              selectedQuestionId={selectedQuestion?.id || null}
            />
          </aside>
        </div>
      </main>
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
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'}
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          ) : (
            <FileUp className="h-6 w-6 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">
            {isUploading ? '上传中...' : '点击上传或拖拽文件'}
          </div>
          <p className="text-xs text-muted-foreground">
            PDF / DOCX，最大 20MB
          </p>
        </div>
      </div>

      {error && (
        <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md whitespace-pre-line">
          {error}
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-1">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm"
            >
              <span className="truncate flex-1">{doc.name}</span>
              <button
                onClick={() => removeDocument(doc.id)}
                className="text-muted-foreground hover:text-destructive ml-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
