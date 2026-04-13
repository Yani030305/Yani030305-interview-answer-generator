'use client'

import { FileText, X, Briefcase } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAppStore } from '@/store'
import { formatFileSize, generateId } from '@/lib/utils'
import { UploadedDocument } from '@/types'
import { translations } from '@/lib/translations'

export function JobDescriptionUploader() {
  const { jobDescription, setJobDescription, clearJobDescription, uiLanguage } = useAppStore()
  const t = translations[uiLanguage]
  const [error, setError] = useState<string | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualText, setManualText] = useState('')

  const handleManualSubmit = useCallback(() => {
    if (!manualText.trim()) {
      setError('请输入岗位描述内容')
      return
    }

    const doc: UploadedDocument = {
      id: generateId(),
      name: '手动输入的岗位描述',
      type: 'text/plain',
      size: new Blob([manualText]).size,
      extractedText: manualText,
      uploadedAt: new Date().toISOString(),
    }

    setJobDescription(doc)
    setShowManualInput(false)
    setManualText('')
    setError(null)
  }, [manualText, setJobDescription])

  if (jobDescription) {
    return (
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">{jobDescription.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(jobDescription.size)} • {jobDescription.extractedText.length.toLocaleString()} characters
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearJobDescription}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    )
  }

  if (showManualInput) {
    return (
      <div className="space-y-2">
        <Card className="p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">手动输入岗位描述</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowManualInput(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <textarea
              className="w-full h-40 p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="请粘贴或输入岗位描述内容..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleManualSubmit} className="flex-1">
                确认
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowManualInput(false)
                  setManualText('')
                  setError(null)
                }}
              >
                取消
              </Button>
            </div>
          </div>
        </Card>
        {error && (
          <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowManualInput(true)}
      >
        <FileText className="h-4 w-4 mr-2" />
        {t.sidebar.uploadJD}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        {t.sidebar.jdOptional}
      </p>
    </div>
  )
}