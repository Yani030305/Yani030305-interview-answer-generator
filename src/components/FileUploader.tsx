'use client'

import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAppStore } from '@/store'
import { formatFileSize, isValidFileType } from '@/lib/utils'
import { UploadedDocument } from '@/types'
import { translations } from '@/lib/translations'

export function FileUploader() {
  const { documents, addDocument, removeDocument, uiLanguage } = useAppStore()
  const t = translations[uiLanguage]
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null)
    setIsUploading(true)

    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    fileArray.forEach((file) => {
      if (!isValidFileType(file.name)) {
        const ext = file.name.split('.').pop()?.toUpperCase()
        errors.push(`${file.name}: 不支持的文件格式 (${ext})。请上传 PDF、Word、TXT、Markdown 或图片 (PNG/JPG/JPEG/GIF/WebP) 格式的文件。`)
      } else if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: 文件太大 (最大 10MB)`)
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
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to parse document')
        }

        const doc: UploadedDocument = await response.json()
        addDocument(doc)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
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
    <div className="space-y-4">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground" />
          )}
          <div className="text-lg font-medium">
            {isUploading ? t.sidebar.uploading : t.sidebar.uploadTip}
          </div>
          <p className="text-sm text-muted-foreground">
            {t.fileUploader.dragDrop}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.fileUploader.supportedFormats} ({t.fileUploader.maxFileSize})
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md whitespace-pre-line">
          {error}
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            {t.sidebar.documents} ({documents.length})
          </div>
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)} • {doc.extractedText.length.toLocaleString()} characters
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDocument(doc.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}