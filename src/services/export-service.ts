'use server'

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx'
import { QuestionItem, AnswerItem, UploadedDocument, UserMode } from '@/types'
import { questionCategories } from '@/data/questions'

export async function exportToDocx(
  userMode: UserMode,
  documents: UploadedDocument[],
  answers: Record<string, AnswerItem>
): Promise<Buffer> {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      text: 'HireMind AI 面试助手',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  )

  children.push(
    new Paragraph({
      text: `Mode: ${userMode === 'campus' ? 'Campus/Fresh Graduate' : 'Experienced Professional'}`,
      spacing: { after: 100 },
    })
  )

  children.push(
    new Paragraph({
      text: `Exported: ${new Date().toLocaleString()}`,
      spacing: { after: 200 },
    })
  )

  if (documents.length > 0) {
    children.push(
      new Paragraph({
        text: 'Uploaded Documents',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      })
    )

    documents.forEach((doc) => {
      children.push(
        new Paragraph({
          text: `• ${doc.name}`,
          spacing: { after: 50 },
        })
      )
    })
  }

  children.push(
    new Paragraph({
      text: '',
      spacing: { after: 200 },
    })
  )

  questionCategories.forEach((category) => {
    children.push(
      new Paragraph({
        text: `${category.nameZh} / ${category.nameEn}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        border: {
          bottom: {
            color: 'auto',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    )

    category.subcategories.forEach((subcategory) => {
      children.push(
        new Paragraph({
          text: `${subcategory.nameZh} / ${subcategory.nameEn}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      )

      subcategory.questions.forEach((question) => {
        const answer = answers[question.id]

        children.push(
          new Paragraph({
            text: `Q: ${question.questionEn}`,
            spacing: { before: 200, after: 50 },
          })
        )

        children.push(
          new Paragraph({
            text: `问：${question.questionZh}`,
            spacing: { after: 100 },
          })
        )

        if (answer && answer.status === 'done') {
          children.push(
            new Paragraph({
              text: 'English Answer:',
              spacing: { before: 100, after: 50 },
            })
          )

          children.push(
            new Paragraph({
              text: answer.editedEn || answer.answerEn,
              spacing: { after: 100 },
            })
          )

          children.push(
            new Paragraph({
              text: '中文回答：',
              spacing: { before: 100, after: 50 },
            })
          )

          children.push(
            new Paragraph({
              text: answer.editedZh || answer.answerZh,
              spacing: { after: 200 },
            })
          )

          if (answer.sourceHighlights && answer.sourceHighlights.length > 0) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Key Points: ' + answer.sourceHighlights.join(', '),
                    italics: true,
                  }),
                ],
                spacing: { after: 200 },
              })
            )
          }
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '[Answer not generated]',
                  italics: true,
                  color: '808080',
                }),
              ],
              spacing: { after: 200 },
            })
          )
        }

        children.push(
          new Paragraph({
            text: '─'.repeat(50),
            spacing: { before: 100, after: 100 },
          })
        )
      })
    })
  })

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  return await Packer.toBuffer(doc)
}

export async function exportToMarkdown(
  userMode: UserMode,
  documents: UploadedDocument[],
  answers: Record<string, AnswerItem>
): Promise<string> {
  let markdown = `# HireMind AI 面试助手\n\n`
  markdown += `**Mode:** ${userMode === 'campus' ? 'Campus/Fresh Graduate' : 'Experienced Professional'}\n\n`
  markdown += `**Exported:** ${new Date().toLocaleString()}\n\n`

  if (documents.length > 0) {
    markdown += `## Uploaded Documents\n\n`
    documents.forEach((doc) => {
      markdown += `- ${doc.name}\n`
    })
    markdown += '\n'
  }

  questionCategories.forEach((category) => {
    markdown += `## ${category.nameZh} / ${category.nameEn}\n\n`

    category.subcategories.forEach((subcategory) => {
      markdown += `### ${subcategory.nameZh} / ${subcategory.nameEn}\n\n`

      subcategory.questions.forEach((question) => {
        const answer = answers[question.id]

        markdown += `**Q: ${question.questionEn}**\n\n`
        markdown += `**问：${question.questionZh}**\n\n`

        if (answer && answer.status === 'done') {
          markdown += `**English Answer:**\n\n${answer.editedEn || answer.answerEn}\n\n`
          markdown += `**中文回答：**\n\n${answer.editedZh || answer.answerZh}\n\n`

          if (answer.sourceHighlights && answer.sourceHighlights.length > 0) {
            markdown += `*Key Points: ${answer.sourceHighlights.join(', ')}*\n\n`
          }
        } else {
          markdown += `*[Answer not generated]*\n\n`
        }

        markdown += `---\n\n`
      })
    })
  })

  return markdown
}
