import { UploadedDocument } from '@/types'

export function getDocumentsSummary(documents: UploadedDocument[]): string {
  if (documents.length === 0) return ''

  const summaries = documents.map((doc) => {
    const preview = doc.extractedText.slice(0, 500)
    return `【${doc.name}】\n${preview}${doc.extractedText.length > 500 ? '...' : ''}`
  })

  return summaries.join('\n\n---\n\n')
}
