import { QuestionItem, UploadedDocument, UserMode, GenerateAnswerResponse } from '@/types'

function extractJSON(text: string): string {
  let jsonStr = text
  
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  } else {
    const jsonObjectMatch = text.match(/\{[\s\S]*\}/)
    if (jsonObjectMatch) {
      jsonStr = jsonObjectMatch[0]
    }
  }
  
  return jsonStr
}

function safeParseJSON(text: string): GenerateAnswerResponse | null {
  try {
    return JSON.parse(text) as GenerateAnswerResponse
  } catch {
    return null
  }
}

function repairJSON(text: string): string {
  let result = text
  
  result = result.replace(/"answerZh":\s*"([^"]*?)"/gs, (match, content) => {
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
    return `"answerZh": "${escaped}"`
  })
  
  result = result.replace(/"answerEn":\s*"([^"]*?)"/gs, (match, content) => {
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
    return `"answerEn": "${escaped}"`
  })
  
  return result
}

const SYSTEM_PROMPT = `You are an expert interview coach helping candidates prepare personalized interview answers. Your task is to generate authentic, professional, and compelling interview responses based on the candidate's background materials.

Guidelines for generating answers:
1. Base your answers strictly on the provided candidate materials - do not fabricate experiences
2. For English answers: Use natural, conversational but professional language suitable for real interviews. Avoid overly formal or written-style language. IMPORTANT: The English answer must be entirely in English, with NO Chinese characters or terms.
3. For Chinese answers: Make them clear, natural, and easy to memorize for the candidate.
4. Keep answers concise - aim for 1-2 minutes of speaking time (approximately 150-300 words).
5. Highlight quantifiable achievements, real experiences, and job relevance.
6. If information is insufficient, provide a reasonable generalized response but indicate what details the candidate should fill in.
7. Use the STAR method (Situation, Task, Action, Result) for behavioral questions when applicable.
8. Be specific and avoid generic clichés.
9. IMPORTANT: Follow the answer structure and strategy provided for each question. Your answer should align with the suggested answer strategy.

Output format must be valid JSON:
{
  "answerZh": "中文回答",
  "answerEn": "English answer",
  "highlightsZh": ["中文关键要点 1", "中文关键要点 2"],
  "highlightsEn": ["English key point 1", "English key point 2"]
}`

function buildUserPrompt(
  question: QuestionItem,
  documents: UploadedDocument[],
  userMode: UserMode,
  jobDescription?: UploadedDocument | null
): string {
  const documentsContent = documents
    .map((doc) => `=== ${doc.name} ===\n${doc.extractedText}`)
    .join('\n\n')

  const modeContext = userMode === 'campus'
    ? 'The candidate is a fresh graduate or student with limited work experience. Focus on academic projects, internships, coursework, and extracurricular activities.'
    : 'The candidate is an experienced professional. Focus on work experience, career achievements, and professional skills.'

  let jdSection = ''
  if (jobDescription) {
    jdSection = `

Target Job Description:
=== ${jobDescription.name} ===
${jobDescription.extractedText}

IMPORTANT: Tailor your answer specifically to this job description. Highlight experiences and skills that match the job requirements. Use keywords and terminology from the JD when appropriate.`
  }

  let strategySection = ''
  if (question.answerStrategy) {
    strategySection = `

IMPORTANT - Answer Structure Strategy:
${question.answerStrategy}

Your answer MUST follow this structure and strategy. Break down your response according to the strategy above.`
  }

  let intentSection = ''
  if (question.questionIntent) {
    intentSection = `

Question Intent:
${question.questionIntent}

Keep this intent in mind when crafting your answer.`
  }

  let notesSection = ''
  if (question.notes) {
    notesSection = `

Important Notes to Avoid:
${question.notes}

Make sure your answer avoids these common mistakes.`
  }

  return `Candidate Mode: ${userMode === 'campus' ? 'Campus/Fresh Graduate' : 'Experienced Professional'}
${modeContext}

Candidate's Background Materials:
${documentsContent}
${jdSection}

Interview Question (English): ${question.questionEn}
Interview Question (Chinese): ${question.questionZh}

Question Category: ${question.category}
Question Subcategory: ${question.subcategory}
Question Tags: ${question.tags.join(', ')}
${intentSection}${strategySection}${notesSection}

Please generate a personalized interview answer based on the candidate's background materials. Follow the answer structure strategy closely. Remember to output valid JSON format.`
}

export async function generateAnswer(
  question: QuestionItem,
  documents: UploadedDocument[],
  userMode: UserMode,
  jobDescription?: UploadedDocument | null
): Promise<GenerateAnswerResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured. Please set it in your .env.local file.')
  }

  if (documents.length === 0) {
    throw new Error('Please upload at least one document before generating answers.')
  }

  const userPrompt = buildUserPrompt(question, documents, userMode, jobDescription)

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API request failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('Empty response from API')
  }

  try {
    const jsonStr = extractJSON(content)
    const repaired = repairJSON(jsonStr)
    const result = safeParseJSON(repaired)

    if (result) {
      return result
    }
  } catch (error) {
    console.error('Failed to parse JSON:', error)
  }

  return {
    answerZh: '生成回答时出现错误，请重试。',
    answerEn: 'Error generating answer. Please try again.',
    highlightsZh: [],
    highlightsEn: [],
  }
}

export async function regenerateAnswer(
  question: QuestionItem,
  documents: UploadedDocument[],
  userMode: UserMode,
  style: 'concise' | 'professional' | 'storytelling' | 'custom',
  adjustments?: string,
  jobDescription?: UploadedDocument | null
): Promise<GenerateAnswerResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured.')
  }

  const documentsContent = documents
    .map((doc) => `=== ${doc.name} ===\n${doc.extractedText}`)
    .join('\n\n')

  const styleInstructions = {
    concise: 'Make the answer more concise and direct. Focus on key points only. Reduce word count by 30%.',
    professional: 'Make the answer more professional and formal. Use industry-standard terminology and structured language.',
    storytelling: 'Make the answer more engaging with storytelling elements. Add vivid details and narrative flow.',
    custom: adjustments || 'Regenerate the answer. Improve it naturally.'
  }

  const modeContext = userMode === 'campus'
    ? 'The candidate is a fresh graduate or student with limited work experience. Focus on academic projects, internships, coursework, and extracurricular activities.'
    : 'The candidate is an experienced professional. Focus on work experience, career achievements, and professional skills.'

  let jdSection = ''
  if (jobDescription) {
    jdSection = `

Target Job Description:
=== ${jobDescription.name} ===
${jobDescription.extractedText}

IMPORTANT: Tailor your answer specifically to this job description.`
  }

  let strategySection = ''
  if (question.answerStrategy) {
    strategySection = `

IMPORTANT - Answer Structure Strategy:
${question.answerStrategy}

Your answer MUST follow this structure and strategy.`
  }

  let adjustmentInstruction = ''
  if (style === 'custom' && adjustments) {
    adjustmentInstruction = `

User Adjustment Request:
${adjustments}

IMPORTANT: Apply the user's specific adjustment request to the answer.`
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Candidate Mode: ${userMode === 'campus' ? 'Campus/Fresh Graduate' : 'Experienced Professional'}
${modeContext}

Candidate's Background Materials:
${documentsContent}
${jdSection}

Interview Question (English): ${question.questionEn}
Interview Question (Chinese): ${question.questionZh}

Question Category: ${question.category}
Question Subcategory: ${question.subcategory}
${strategySection}
${adjustmentInstruction}

Please regenerate the interview answer. ${styleInstructions[style]} Maintain the answer structure strategy. Output valid JSON format.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API request failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('Empty response from API')
  }

  try {
    const jsonStr = extractJSON(content)
    const repaired = repairJSON(jsonStr)
    const result = safeParseJSON(repaired)

    if (result) {
      return result
    }
  } catch (error) {
    console.error('Failed to parse JSON:', error)
  }

  return {
    answerZh: '重新生成回答时出现错误，请重试。',
    answerEn: 'Error regenerating answer. Please try again.',
    highlightsZh: [],
    highlightsEn: [],
  }
}