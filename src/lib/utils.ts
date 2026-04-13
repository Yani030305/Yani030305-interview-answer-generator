import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function estimateSpeakingTime(text: string): string {
  const wordsPerMinute = 150
  const words = text.split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  if (minutes < 1) return '< 1 min'
  if (minutes === 1) return '1 min'
  return `${minutes} mins`
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function isValidFileType(filename: string): boolean {
  const validExtensions = ['pdf', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'gif', 'webp']
  const ext = getFileExtension(filename)
  return validExtensions.includes(ext)
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']
  const ext = getFileExtension(filename)
  return imageExtensions.includes(ext)
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_')
}
