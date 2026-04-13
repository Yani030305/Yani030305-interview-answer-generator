const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'document-content.txt'), 'utf8');

const questions = [];

const questionPattern = /Q(\d+)[、．.]([^（(]+)[（(]([^)）]+)[)）]\s*\n([\s\S]*?)(?=Q\d+[、．.]|$)/g;

let match;
while ((match = questionPattern.exec(content)) !== null) {
  const qNum = match[1];
  const qEn = match[2].trim();
  const qZh = match[3].trim();
  const content = match[4];

  const similarMatch = content.match(/相似问法\s*\n([\s\S]*?)(?=提问动机|答题思路|注意事项|示范回答|$)/);
  const intentMatch = content.match(/提问动机\s*\n([\s\S]*?)(?=答题思路|注意事项|示范回答|$)/);
  const strategyMatch = content.match(/答题思路\s*\n([\s\S]*?)(?=注意事项|示范回答|$)/);
  const notesMatch = content.match(/注意事项\s*\n([\s\S]*?)(?=示范回答|$)/);

  const similarQuestions = similarMatch ? similarMatch[1].trim() : '';
  const questionIntent = intentMatch ? intentMatch[1].trim() : '';
  const answerStrategy = strategyMatch ? strategyMatch[1].trim() : '';
  const notes = notesMatch ? notesMatch[1].trim() : '';

  questions.push({
    id: `q${qNum}`,
    num: parseInt(qNum),
    questionEn: qEn,
    questionZh: qZh,
    similarQuestions,
    questionIntent,
    answerStrategy,
    notes
  });
}

questions.sort((a, b) => a.num - b.num);

fs.writeFileSync(
  path.join(__dirname, 'extracted-questions.json'),
  JSON.stringify(questions, null, 2),
  'utf8'
);

console.log(`Extracted ${questions.length} questions`);
console.log('Sample question:', JSON.stringify(questions[0], null, 2));
