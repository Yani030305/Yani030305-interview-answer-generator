'use client'

import { ChevronDown, ChevronRight, Search, Filter, X, Check, History } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAppStore } from '@/store'
import { useAuthStore } from '@/store/auth-store'
import { questionCategories, tagLabels, getAllQuestions, filterQuestionsByMode, filterQuestionsByTags, searchQuestions } from '@/data/questions'
import { QuestionTag, QuestionItem } from '@/types'
import { cn } from '@/lib/utils'
import { translations } from '@/lib/translations'

interface QuestionNavProps {
  onSelectQuestion: (question: QuestionItem) => void
  selectedQuestionId: string | null
}

export function QuestionNav({ onSelectQuestion, selectedQuestionId }: QuestionNavProps) {
  const {
    userMode,
    uiLanguage,
    showFilteredQuestions,
    setShowFilteredQuestions,
    selectedTags,
    toggleTag,
    searchQuery,
    setSearchQuery,
    expandedCategories,
    toggleCategory,
    expandAllCategories,
    collapseAllCategories,
  } = useAppStore()

  const { user } = useAuthStore()

  const [generatedQuestions, setGeneratedQuestions] = useState<Set<string>>(new Set())
  const [previouslyGeneratedQuestions, setPreviouslyGeneratedQuestions] = useState<Set<string>>(new Set())

  // Fetch generated questions on mount and when user changes
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
          console.log('Fetched history:', data)
          const currentSession = new Set<string>()
          const pastSession = new Set<string>()

          if (data.history && Array.isArray(data.history)) {
            data.history.forEach((item: any) => {
              console.log('History item:', item)
              if (item.questionId) {
                currentSession.add(item.questionId)
                pastSession.add(item.questionId)
              }
            })
          }

          console.log('Current session:', currentSession)
          console.log('Past session:', pastSession)
          setGeneratedQuestions(currentSession)
          setPreviouslyGeneratedQuestions(pastSession)
        } else {
          console.error('Failed to fetch history:', response.status)
        }
      } catch (error) {
        console.error('Error fetching generated questions:', error)
      }
    }

    fetchGeneratedQuestions()
  }, [user])

  const t = translations[uiLanguage]
  const allQuestions = useMemo(() => getAllQuestions(), [])
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
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
            id="show-filtered"
            checked={showFilteredQuestions}
            onChange={(e) => setShowFilteredQuestions(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="show-filtered" className="text-muted-foreground">
            {t.questionNav.campusOnly} ({filteredCount})
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={expandAllCategories}>
          {t.questionNav.expandAll}
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAllCategories}>
          {t.questionNav.collapseAll}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {t.questionNav.allQuestions}: {filteredQuestions.length} / {allQuestions.length}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
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
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 aspect-square rounded-full bg-green-500 animate-pulse" />
          <span>生成中</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 aspect-square rounded-full bg-red-500" />
          <span>生成失败</span>
        </div>
      </div>

      <div className="space-y-1 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin">
        {questionCategories.map((category) => {
          const categoryQuestions = category.subcategories.flatMap((s) => s.questions)
          const visibleQuestions = filterQuestionsByMode(
            categoryQuestions,
            userMode,
            showFilteredQuestions
          )
          const tagFilteredQuestions = filterQuestionsByTags(visibleQuestions, selectedTags)
          const searchFilteredQuestions = searchQuestions(tagFilteredQuestions, searchQuery)

          if (searchFilteredQuestions.length === 0 && (searchQuery || selectedTags.length > 0)) {
            return null
          }

          const isExpanded = expandedCategories.includes(category.id)

          return (
            <div key={category.id} className="border rounded-lg">
              <button
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium text-sm">
                    {uiLanguage === 'zh' ? category.nameZh : category.nameEn}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {searchFilteredQuestions.length}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t px-2 py-1">
                  {category.subcategories.map((subcategory) => {
                    const subQuestions = filterQuestionsByMode(
                      subcategory.questions,
                      userMode,
                      showFilteredQuestions
                    )
                    const subTagFiltered = filterQuestionsByTags(subQuestions, selectedTags)
                    const subSearchFiltered = searchQuestions(subTagFiltered, searchQuery)

                    if (subSearchFiltered.length === 0) return null

                    return (
                      <div key={subcategory.id} className="py-1">
                        <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                          {uiLanguage === 'zh' ? subcategory.nameZh : subcategory.nameEn}
                        </div>
                        {subSearchFiltered.map((question) => {
                          const answer = useAppStore.getState().answers[question.id]
                          const { isGenerating, currentGeneratingId } = useAppStore.getState()
                          const isCurrentGenerating = answer?.status === 'generating' || (isGenerating && currentGeneratingId === question.id)
                          const isQueued = isGenerating && currentGeneratingId !== question.id && answer?.status === 'idle'
                          const isError = answer?.status === 'error'
                          const hasHistory = generatedQuestions.has(question.id) || previouslyGeneratedQuestions.has(question.id)
                          const isGeneratedInStore = answer?.status === 'done'
                          
                          return (
                            <button
                              key={question.id}
                              className={cn(
                                'w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted/50 transition-colors',
                                selectedQuestionId === question.id && 'bg-primary/10 text-primary'
                              )}
                              onClick={() => onSelectQuestion(question)}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 aspect-square rounded-full ${isCurrentGenerating ? 'bg-green-500 animate-pulse' : isQueued ? 'bg-gray-300 animate-pulse' : isError ? 'bg-red-500' : isGeneratedInStore ? 'bg-green-500' : hasHistory ? 'bg-amber-500' : 'bg-gray-300'}`} />
                                <div className="truncate">
                                  {uiLanguage === 'zh' ? question.questionZh : question.questionEn}
                                </div>
                              </div>
                              {!question.isCampusApplicable && userMode === 'campus' && (
                                <div className="text-xs text-muted-foreground">({t.header.experienced})</div>
                              )}
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
  )
}