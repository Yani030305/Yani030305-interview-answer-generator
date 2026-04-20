'use client'

import { Briefcase, Target, Users, Lightbulb, AlertTriangle, CheckCircle, MessageCircle } from 'lucide-react'
import { JDAnalysisResult } from '@/lib/jd-analyzer'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface JDAnalysisDetailDialogProps {
  result: JDAnalysisResult
  open: boolean
  onClose: () => void
  company: string
  position: string
}

export function JDAnalysisDetailDialog({ result, open, onClose, company, position }: JDAnalysisDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2">
            JD 拆解详情
            <span className="text-sm font-normal text-muted-foreground">
              {company} • {position}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Section title="岗位一句话判断" icon={<Briefcase className="h-4 w-4" />}>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">本质</h4>
                <p className="text-base">{result.oneLinerJudgment?.essence || '暂无结果'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">类别</h4>
                <Badge variant="secondary">{result.oneLinerJudgment?.category || '暂无结果'}</Badge>
              </div>
            </div>
          </Section>

          <Separator />

          <Section title="JD 逐项拆解" icon={<Target className="h-4 w-4" />}>
            <div className="space-y-4">
              {result.jdBreakdown && result.jdBreakdown.length > 0 ? (
                result.jdBreakdown.map((item, index) => (
                  <div key={index} className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">原文</h4>
                      <p className="text-sm text-muted-foreground italic">"{item.original}"</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">真实含义</h4>
                      <p className="text-sm">{item.realMeaning}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">暂无结果</p>
              )}
            </div>
          </Section>

          <Separator />

          <Section title="日常工作画像" icon={<Users className="h-4 w-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">典型任务</h4>
                <ul className="space-y-1">
                  {result.dailyWorkProfile?.typicalTasks && result.dailyWorkProfile.typicalTasks.length > 0 ? (
                    result.dailyWorkProfile.typicalTasks.map((task, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {task}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">协作对象</h4>
                <ul className="space-y-1">
                  {result.dailyWorkProfile?.collaborators && result.dailyWorkProfile.collaborators.length > 0 ? (
                    result.dailyWorkProfile.collaborators.map((collab, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {collab}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 md:col-span-2">
                <h4 className="text-sm font-medium mb-2">典型工作日</h4>
                <p className="text-sm">{result.dailyWorkProfile?.typicalDay || '暂无结果'}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 md:col-span-2">
                <h4 className="text-sm font-medium mb-2">典型工作周</h4>
                <p className="text-sm">{result.dailyWorkProfile?.typicalWeek || '暂无结果'}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 md:col-span-2">
                <h4 className="text-sm font-medium mb-2">常见交付物</h4>
                <ul className="space-y-1">
                  {result.dailyWorkProfile?.deliverables && result.dailyWorkProfile.deliverables.length > 0 ? (
                    result.dailyWorkProfile.deliverables.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
            </div>
          </Section>

          <Separator />

          <Section title="关键能力" icon={<Lightbulb className="h-4 w-4" />}>
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-red-600">必备能力</h4>
                <ul className="space-y-1">
                  {result.keyCapabilities?.required && result.keyCapabilities.required.length > 0 ? (
                    result.keyCapabilities.required.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-green-600">加分能力</h4>
                <ul className="space-y-1">
                  {result.keyCapabilities?.preferred && result.keyCapabilities.preferred.length > 0 ? (
                    result.keyCapabilities.preferred.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-green-500">•</span>
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-yellow-600">容易被忽略的能力</h4>
                <ul className="space-y-1">
                  {result.keyCapabilities?.overlooked && result.keyCapabilities.overlooked.length > 0 ? (
                    result.keyCapabilities.overlooked.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-yellow-500">•</span>
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
            </div>
          </Section>

          <Separator />

          <Section title="常见坑点" icon={<AlertTriangle className="h-4 w-4" />}>
            <div className="space-y-4">
              {result.commonPitfalls && result.commonPitfalls.length > 0 ? (
                result.commonPitfalls.map((pitfall, index) => (
                  <div key={index} className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium">{pitfall.issue}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{pitfall.description}</p>
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                          <span className="font-medium text-green-700">解决方案：</span>
                          <span className="text-green-600">{pitfall.solution}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">暂无结果</p>
              )}
            </div>
          </Section>

          <Separator />

          <Section title="用户匹配度分析" icon={<CheckCircle className="h-4 w-4" />}>
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-green-600">匹配点</h4>
                <div className="space-y-3">
                  {result.userMatchAnalysis?.matchingPoints && result.userMatchAnalysis.matchingPoints.length > 0 ? (
                    result.userMatchAnalysis.matchingPoints.map((point, index) => (
                      <div key={index} className="border-l-2 border-green-500 pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={point.matchLevel === 'high' ? 'default' : point.matchLevel === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                            {point.matchLevel === 'high' ? '高匹配' : point.matchLevel === 'medium' ? '中匹配' : '低匹配'}
                          </Badge>
                        </div>
                        <p className="text-sm mb-1">{point.userExperience}</p>
                        <p className="text-sm text-muted-foreground">{point.explanation}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无结果</p>
                  )}
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-red-600">薄弱点</h4>
                <ul className="space-y-1">
                  {result.userMatchAnalysis?.weakPoints && result.userMatchAnalysis.weakPoints.length > 0 ? (
                    result.userMatchAnalysis.weakPoints.map((point, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        {point}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">重点准备</h4>
                <ul className="space-y-1">
                  {result.userMatchAnalysis?.keyStories && result.userMatchAnalysis.keyStories.length > 0 ? (
                    result.userMatchAnalysis.keyStories.map((story, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {story}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
            </div>
          </Section>

          <Separator />

          <Section title="是否适合" icon={<CheckCircle className="h-4 w-4" />}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge 
                  variant={
                    result.suitabilityAssessment?.overall === 'high' ? 'default' : 
                    result.suitabilityAssessment?.overall === 'medium' ? 'secondary' : 'outline'
                  } 
                  className="text-sm px-3 py-1"
                >
                  {result.suitabilityAssessment?.overall === 'high' ? '高度适合' : 
                   result.suitabilityAssessment?.overall === 'medium' ? '中度适合' : 
                   result.suitabilityAssessment?.overall === 'low' ? '不太适合' : '暂无结果'}
                </Badge>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">判断理由</h4>
                <p className="text-sm">{result.suitabilityAssessment?.reasoning || '暂无结果'}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-green-700">调整建议</h4>
                <ul className="space-y-1">
                  {result.suitabilityAssessment?.suggestions && result.suitabilityAssessment.suggestions.length > 0 ? (
                    result.suitabilityAssessment.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm flex items-start gap-2 text-green-700">
                        <span>•</span>
                        {suggestion}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-green-600">暂无结果</li>
                  )}
                </ul>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-red-700">如果还不够</h4>
                <ul className="space-y-1">
                  {result.suitabilityAssessment?.ifNotReady && result.suitabilityAssessment.ifNotReady.length > 0 ? (
                    result.suitabilityAssessment.ifNotReady.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2 text-red-700">
                        <span>•</span>
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-red-600">暂无结果</li>
                  )}
                </ul>
              </div>
            </div>
          </Section>

          <Separator />

          <Section title="面试准备建议" icon={<MessageCircle className="h-4 w-4" />}>
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">可能被问到的问题</h4>
                <ul className="space-y-1">
                  {result.interviewPrep?.likelyQuestions && result.interviewPrep.likelyQuestions.length > 0 ? (
                    result.interviewPrep.likelyQuestions.map((question, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary font-medium">{index + 1}.</span>
                        {question}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">重点准备的故事/经历</h4>
                <ul className="space-y-1">
                  {result.interviewPrep?.keyStories && result.interviewPrep.keyStories.length > 0 ? (
                    result.interviewPrep.keyStories.map((story, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {story}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">暂无结果</li>
                  )}
                </ul>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-blue-700">校招准备建议</h4>
                <ul className="space-y-1">
                  {result.interviewPrep?.campusPrep && result.interviewPrep.campusPrep.length > 0 ? (
                    result.interviewPrep.campusPrep.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2 text-blue-700">
                        <span>•</span>
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-blue-600">暂无结果</li>
                  )}
                </ul>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-purple-700">社招准备建议</h4>
                <ul className="space-y-1">
                  {result.interviewPrep?.experiencedPrep && result.interviewPrep.experiencedPrep.length > 0 ? (
                    result.interviewPrep.experiencedPrep.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2 text-purple-700">
                        <span>•</span>
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-purple-600">暂无结果</li>
                  )}
                </ul>
              </div>
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}