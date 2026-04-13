import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import pdf from 'pdf-parse'
import Tesseract from 'tesseract.js'
import { generateId, getFileExtension, isImageFile } from '@/lib/utils'

function extractTextFromTxt(buffer: Buffer): string {
  return buffer.toString('utf-8')
}

function extractTextFromMd(buffer: Buffer): string {
  return buffer.toString('utf-8')
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer)
  return data.text
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const timeout = 30000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('图片识别超时，请尝试上传更小的图片或使用其他格式')), timeout)
  })

  try {
    const workerPromise = (async () => {
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
          }
        }
      })
      
      const result = await worker.recognize(buffer)
      await worker.terminate()
      
      const text = result.data.text.trim()
      if (!text) {
        throw new Error('无法识别图片中的文字，请尝试上传更清晰的图片或使用其他格式')
      }
      
      return text
    })()

    const text = await Promise.race([workerPromise, timeoutPromise])
    return text
  } catch (error) {
    console.error('OCR error:', error)
    if (error instanceof Error && error.message.includes('超时')) {
      throw error
    }
    throw new Error('图片文字识别失败，建议使用手动输入或上传其他格式的文件')
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extension = getFileExtension(file.name)

    let extractedText = ''

    switch (extension) {
      case 'txt':
        extractedText = extractTextFromTxt(buffer)
        break
      case 'md':
        extractedText = extractTextFromMd(buffer)
        break
      case 'docx':
        extractedText = await extractTextFromDocx(buffer)
        break
      case 'pdf':
        extractedText = await extractTextFromPdf(buffer)
        break
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        extractedText = await extractTextFromImage(buffer)
        break
      default:
        return NextResponse.json(
          { error: `Unsupported file type: ${extension}` },
          { status: 400 }
        )
    }

    const document = {
      id: generateId(),
      name: file.name,
      type: file.type,
      size: file.size,
      extractedText,
      uploadedAt: new Date().toISOString(),
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error parsing document:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse document' },
      { status: 500 }
    )
  }
}
