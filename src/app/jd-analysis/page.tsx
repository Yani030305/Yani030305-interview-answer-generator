'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store'
import { translations } from '@/lib/translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Briefcase,
  Building2,
  MapPin,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileText,
  User,
  AlertCircle,
  TrendingUp,
  Target,
  Clock,
  Users,
  FileCheck,
  Lightbulb,
  MessageSquare,
  Send,
  ArrowLeft,
} from 'lucide-react'
import { JDAnalysisResult } from '@/lib/jd-analyzer'

export const dynamic = "force-dynamic"

function JDAnalysisContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, credits } = useAuthStore()
  const { documents, uiLanguage } = useAppStore()
  const t = translations[uiLanguage]

  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [jdText, setJdText] = useState('')
  const [industry, setIndustry] = useState('')
  const [city, setCity] = useState('')
  const [userMode, setUserMode] = useState<'campus' | 'experienced'>('campus')

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<JDAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([
    'oneLiner',
    'jdBreakdown',
    'dailyWork',
    'capabilities',
    'pitfalls',
    'matchAnalysis',
    'suitability',
    'interviewPrep',
  ]))

  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  // 从 URL 获取分析 ID
  const analysisId = searchParams.get('id')

  // 加载历史分析结果
  useEffect(() => {
    if (analysisId && user) {
      const fetchHistory = async () => {
        setIsLoadingHistory(true)
        setError(null)

        try {
          const response = await fetch(`/api/jd-analysis-history?id=${analysisId}`)

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || '获取分析历史失败')
          }

          const data = await response.json()
          setAnalysisResult(data.analysis_result)
          setCompany(data.company)
          setPosition(data.position)
          setCity(data.city || '')
          setJdText(data.jd_text)
        } catch (err) {
          setError(err instanceof Error ? err.message : '获取分析历史失败')
        } finally {
          setIsLoadingHistory(false)
        }
      }

      fetchHistory()
    }
  }, [analysisId, user])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const handleAnalyze = async () => {
    if (!company || !position || !jdText) {
      setError('请填写公司名称、岗位名称和JD原文')
      return
    }

    if (jdText.length < 50) {
      setError('JD内容太短，请提供更完整的岗位描述（至少50字）')
      return
    }

    if (!user) {
      setError('请先登录')
      return
    }

    if (credits < 50) {
      setError('积分不足，请先充值')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze-jd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company,
          position,
          jdText,
          industry: industry || undefined,
          city: city || undefined,
          userDocuments: documents.length > 0 ? documents : undefined,
          userMode,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '分析失败')
      }

      const result = await response.json()
      setAnalysisResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请稍后重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copySection = async (sectionId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedSection(sectionId)
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const SectionHeader = ({
    sectionId,
    title,
    icon: Icon,
  }: {
    sectionId: string
    title: string
    icon: React.ElementType
  }) => {
    const isExpanded = expandedSections.has(sectionId)
    const content = getSectionContent(sectionId)

    return (
      <div className="border-b">
        <button
          onClick={() => toggleSection(sectionId)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {content && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  copySection(sectionId, content)
                }}
              >
                {copiedSection === sectionId ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </button>
        {isExpanded && (
          <div className="p-4 pt-0 text-sm leading-relaxed whitespace-pre-wrap">
            {sectionId === 'oneLiner' && analysisResult && (
              <div className="space-y-4">
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="font-medium">岗位本质：</p>
                  <p>{analysisResult.oneLinerJudgment.essence}</p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-medium">岗位归类：</p>
                  <p>{analysisResult.oneLinerJudgment.category}</p>
                </div>
              </div>
            )}
            {sectionId === 'jdBreakdown' && analysisResult && (
              <div className="space-y-4">
                {analysisResult.jdBreakdown.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <p className="text-muted-foreground mb-2 italic">"{item.original}"</p>
                    <p className="font-medium text-primary mb-1">实际意味着：</p>
                    <p>{item.realMeaning}</p>
                  </div>
                ))}
              </div>
            )}
            {sectionId === 'dailyWork' && analysisResult && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2">高频任务：</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysisResult.dailyWorkProfile.typicalTasks.map((task, idx) => (
                      <li key={idx}>{task}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-medium mb-2">典型工作日：</p>
                  <p>{analysisResult.dailyWorkProfile.typicalDay}</p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-medium mb-2">典型工作周：</p>
                  <p>{analysisResult.dailyWorkProfile.typicalWeek}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="font-medium mb-2">常见协作对象：</p>
                    <ul className="list-disc list-inside space-y-1">
                      {analysisResult.dailyWorkProfile.collaborators.map((collab, idx) => (
                        <li key={idx}>{collab}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="font-medium mb-2">常见交付物：</p>
                    <ul className="list-disc list-inside space-y-1">
                      {analysisResult.dailyWorkProfile.deliverables.map((del, idx) => (
                        <li key={idx}>{del}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {sectionId === 'capabilities' && analysisResult && (
              <div className="space-y-4">
                <div className="bg-destructive/10 rounded-lg p-4">
                  <p className="font-medium mb-2 text-destructive">必备能力（面试必问）：</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysisResult.keyCapabilities.required.map((cap, idx) => (
                      <li key={idx}>{cap}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="font-medium mb-2 text-primary">加分能力：</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysisResult.keyCapabilities.preferred.map((cap, idx) => (
                      <li key={idx}>{cap}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-medium mb-2">容易被忽略但很重要的能力：</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysisResult.keyCapabilities.overlooked.map((cap, idx) => (
                      <li key={idx}>{cap}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {sectionId === 'pitfalls' && analysisResult && (
              <div className="space-y-4">
                {analysisResult.commonPitfalls.map((pitfall, idx) => (
                  <div key={idx} className="border-l-4 border-destructive pl-4">
                    <p className="font-medium text-destructive mb-1">{pitfall.issue}</p>
                    <p className="text-muted-foreground mb-2">{pitfall.description}</p>
                    <p className="bg-primary/10 rounded p-2 text-sm">
                      <span className="font-medium">应对方式：</span>{pitfall.solution}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {sectionId === 'matchAnalysis' && analysisResult && (
              <div className="space-y-4">
                {analysisResult.userMatchAnalysis.matchingPoints.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {analysisResult.userMatchAnalysis.matchingPoints.map((point, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              point.matchLevel === 'high' ? 'bg-green-100 text-green-700' :
                              point.matchLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {point.matchLevel === 'high' ? '高匹配' : point.matchLevel === 'medium' ? '中匹配' : '低匹配'}
                            </span>
                            <span className="text-sm text-muted-foreground">{point.userExperience}</span>
                          </div>
                          <p className="text-sm">{point.explanation}</p>
                        </div>
                      ))}
                    </div>
                    {analysisResult.userMatchAnalysis.weakPoints.length > 0 && (
                      <div className="bg-destructive/10 rounded-lg p-4">
                        <p className="font-medium mb-2 text-destructive">还需加强的地方：</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {analysisResult.userMatchAnalysis.weakPoints.map((wp, idx) => (
                            <li key={idx}>{wp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisResult.userMatchAnalysis.keyStories.length > 0 && (
                      <div className="bg-primary/10 rounded-lg p-4">
                        <p className="font-medium mb-2">重点准备的故事/经历：</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {analysisResult.userMatchAnalysis.keyStories.map((story, idx) => (
                            <li key={idx}>{story}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-muted rounded-lg p-4 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>请上传您的简历或项目经历，我才能进行匹配度分析</p>
                  </div>
                )}
              </div>
            )}
            {sectionId === 'suitability' && analysisResult && (
              <div className="space-y-4">
                <div className={`rounded-lg p-6 text-center ${
                  analysisResult.suitabilityAssessment.overall === 'high' ? 'bg-green-100' :
                  analysisResult.suitabilityAssessment.overall === 'medium' ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  <p className="text-2xl font-bold mb-1">
                    {analysisResult.suitabilityAssessment.overall === 'high' ? '匹配度高' :
                     analysisResult.suitabilityAssessment.overall === 'medium' ? '匹配度中等' :
                     '匹配度偏低'}
                  </p>
                  <p className="text-sm">{analysisResult.suitabilityAssessment.reasoning}</p>
                </div>
                {analysisResult.suitabilityAssessment.suggestions.length > 0 && (
                  <div className="bg-primary/10 rounded-lg p-4">
                    <p className="font-medium mb-2">投递建议：</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysisResult.suitabilityAssessment.suggestions.map((sug, idx) => (
                        <li key={idx}>{sug}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysisResult.suitabilityAssessment.ifNotReady.length > 0 && (
                  <div className="bg-destructive/10 rounded-lg p-4">
                    <p className="font-medium mb-2 text-destructive">如果还不够强，优先补：</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysisResult.suitabilityAssessment.ifNotReady.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {sectionId === 'interviewPrep' && analysisResult && (
              <div className="space-y-4">
                <div className="bg-destructive/10 rounded-lg p-4">
                  <p className="font-medium mb-2 text-destructive">最可能被问的问题：</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysisResult.interviewPrep.likelyQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
                {analysisResult.interviewPrep.keyStories.length > 0 && (
                  <div className="bg-primary/10 rounded-lg p-4">
                    <p className="font-medium mb-2">重点准备的经历/项目/数据：</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysisResult.interviewPrep.keyStories.map((story, idx) => (
                        <li key={idx}>{story}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {userMode === 'campus' && analysisResult.interviewPrep.campusPrep.length > 0 && (
                  <div className="bg-muted rounded-lg p-4">
                    <p className="font-medium mb-2">校招生专项建议：</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysisResult.interviewPrep.campusPrep.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {userMode === 'experienced' && analysisResult.interviewPrep.experiencedPrep.length > 0 && (
                  <div className="bg-muted rounded-lg p-4">
                    <p className="font-medium mb-2">社招生专项建议：</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {analysisResult.interviewPrep.experiencedPrep.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const getSectionContent = (sectionId: string): string => {
    if (!analysisResult) return ''

    switch (sectionId) {
      case 'oneLiner':
        return `【岗位一句话判断】
本质：${analysisResult.oneLinerJudgment.essence}
归类：${analysisResult.oneLinerJudgment.category}`
      case 'jdBreakdown':
        return '【JD逐项拆解】\n' + analysisResult.jdBreakdown.map(item =>
          `原文：${item.original}\n实际意味着：${item.realMeaning}`
        ).join('\n\n')
      case 'dailyWork':
        return `【日常工作画像】
高频任务：${analysisResult.dailyWorkProfile.typicalTasks.join('、')}
典型工作日：${analysisResult.dailyWorkProfile.typicalDay}
典型工作周：${analysisResult.dailyWorkProfile.typicalWeek}
协作对象：${analysisResult.dailyWorkProfile.collaborators.join('、')}
交付物：${analysisResult.dailyWorkProfile.deliverables.join('、')}`
      case 'capabilities':
        return `【关键能力】
必备：${analysisResult.keyCapabilities.required.join('、')}
加分：${analysisResult.keyCapabilities.preferred.join('、')}
易忽略但重要：${analysisResult.keyCapabilities.overlooked.join('、')}`
      case 'pitfalls':
        return '【常见难点】\n' + analysisResult.commonPitfalls.map(p =>
          `${p.issue}：${p.description} | 应对：${p.solution}`
        ).join('\n')
      case 'matchAnalysis':
        return '【匹配度分析】\n' + analysisResult.userMatchAnalysis.matchingPoints.map(p =>
          `[${p.matchLevel}] ${p.userExperience}：${p.explanation}`
        ).join('\n')
      case 'suitability':
        return `【是否适合】
匹配度：${analysisResult.suitabilityAssessment.overall}
理由：${analysisResult.suitabilityAssessment.reasoning}
建议：${analysisResult.suitabilityAssessment.suggestions.join('、')}`
      case 'interviewPrep':
        return `【面试准备】
可能问题：${analysisResult.interviewPrep.likelyQuestions.join('、')}
重点准备：${analysisResult.interviewPrep.keyStories.join('、')}`
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/jd-analysis-history')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回历史记录
            </Button>
            <h1 className="text-3xl font-bold">JD 拆解 / 岗位理解</h1>
          </div>
          <p className="text-muted-foreground">
            模拟资深员工视角，帮你真实理解这个岗位是做什么的、是否适合你、该如何准备
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 当有分析ID时，隐藏表单，只显示结果 */}
          {!analysisId && (
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    岗位信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">公司名称 *</Label>
                    <Input
                      id="company"
                      placeholder="例如：字节跳动、腾讯、阿里巴巴"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">岗位名称 *</Label>
                    <Input
                      id="position"
                      placeholder="例如：产品经理、运营专员、数据分析师"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">行业/业务方向</Label>
                    <Input
                      id="industry"
                      placeholder="例如：电商、在线教育、金融科技"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">城市</Label>
                    <Input
                      id="city"
                      placeholder="例如：北京、上海、深圳"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>候选人类型</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={userMode === 'campus' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUserMode('campus')}
                        className="flex-1"
                      >
                        校招
                      </Button>
                      <Button
                        variant={userMode === 'experienced' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUserMode('experienced')}
                        className="flex-1"
                      >
                        社招
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    JD 原文 *
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="粘贴岗位描述原文..."
                    rows={12}
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    至少50字，越完整分析越准确
                  </p>
                </CardContent>
              </Card>

              {documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      已上传的背景材料
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      将用于匹配度分析和面试准备建议
                    </p>
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{doc.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || isLoadingHistory}
                className="w-full"
                size="lg"
              >
                {isLoadingHistory ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    加载历史分析...
                  </>
                ) : isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    开始分析（消耗50积分）
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-sm text-muted-foreground text-center">
                  请先登录后再使用此功能
                </p>
              )}
            </div>
          )}

          <div className={`lg:col-span-${analysisId ? '3' : '2'}`}>
            {isLoadingHistory ? (
              <Card className="h-full flex items-center justify-center min-h-[500px]">
                <CardContent className="text-center">
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-lg font-medium">加载历史分析...</p>
                </CardContent>
              </Card>
            ) : analysisResult ? (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {company} - {position}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    岗位拆解分析报告
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <SectionHeader
                    sectionId="oneLiner"
                    title="1. 岗位一句话判断"
                    icon={Target}
                  />
                  <SectionHeader
                    sectionId="jdBreakdown"
                    title="2. JD 逐项拆解"
                    icon={FileCheck}
                  />
                  <SectionHeader
                    sectionId="dailyWork"
                    title="3. 日常工作画像"
                    icon={Clock}
                  />
                  <SectionHeader
                    sectionId="capabilities"
                    title="4. 关键能力要求"
                    icon={TrendingUp}
                  />
                  <SectionHeader
                    sectionId="pitfalls"
                    title="5. 常见难点/踩坑点"
                    icon={AlertCircle}
                  />
                  <SectionHeader
                    sectionId="matchAnalysis"
                    title="6. 你的匹配度分析"
                    icon={User}
                  />
                  <SectionHeader
                    sectionId="suitability"
                    title="7. 是否适合你"
                    icon={Check}
                  />
                  <SectionHeader
                    sectionId="interviewPrep"
                    title="8. 面试准备建议"
                    icon={MessageSquare}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[500px]">
                <CardContent className="text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">等待分析</p>
                  <p className="text-sm">
                    填写左侧信息后，点击"开始分析"按钮
                  </p>
                  <div className="mt-6 text-left space-y-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">真实岗位视角</p>
                        <p className="text-sm">模拟资深员工告诉你这个岗位实际在做什么</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">匹配度分析</p>
                        <p className="text-sm">结合你的背景材料，分析你是否适合这个岗位</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">面试准备</p>
                        <p className="text-sm">告诉你最可能被问什么问题，怎么准备</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JDAnalysisPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JDAnalysisContent />
    </Suspense>
  )
}