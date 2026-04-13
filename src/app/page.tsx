'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Header } from '@/components/Header'
import { FileUploader } from '@/components/FileUploader'
import { QuestionNav } from '@/components/QuestionNav'
import { AnswerCard } from '@/components/AnswerCard'
import { Sidebar } from '@/components/Sidebar'
import { useAppStore } from '@/store'
import { questionCategories, getAllQuestions, filterQuestionsByMode, filterQuestionsByTags, searchQuestions } from '@/data/questions'
import { QuestionItem } from '@/types'
import { FileUp, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

      <main className="container px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3 space-y-4">
            <div className="lg:sticky lg:top-20">
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  {t.sidebar.documents}
                </h2>
                <FileUploader />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t.questionNav.title}
                </h2>
                <QuestionNav
                  onSelectQuestion={handleSelectQuestion}
                  selectedQuestionId={selectedQuestion?.id || null}
                />
              </div>
            </div>
          </aside>

          <section className="lg:col-span-6" ref={mainContentRef}>
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

          <aside className="lg:col-span-3">
            <Sidebar />
          </aside>
        </div>
      </main>
    </div>
  )
}