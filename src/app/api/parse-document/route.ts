import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import pdf from 'pdf-parse'
import { generateId, getFileExtension } from '@/lib/utils'

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer)
  return data.text
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
      case 'docx':
        extractedText = await extractTextFromDocx(buffer)
        break
      case 'pdf':
        extractedText = await extractTextFromPdf(buffer)
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
