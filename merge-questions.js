const fs = require('fs');
const path = require('path');

const extractedQuestions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'extracted-questions.json'), 'utf8')
);

const questionsTs = fs.readFileSync(path.join(__dirname, 'src/data/questions.ts'), 'utf8');

let updatedContent = questionsTs;

extractedQuestions.forEach((eq) => {
  const questionPattern = new RegExp(
    `(id: '${eq.id}',[\\s\\S]*?questionEn: '${eq.questionEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',[\\s\\S]*?questionZh: '${eq.questionZh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',[\\s\\S]*?tags: \\[[^\\]]*\\],[\\s\\S]*?isCampusApplicable: (true|false),)`,
    'g'
  );
  
  const similarQuestionsStr = eq.similarQuestions 
    ? `\n    similarQuestions: ${JSON.stringify(eq.similarQuestions.split('\n\n').filter(s => s.trim()))},` 
    : '';
  const questionIntentStr = eq.questionIntent 
    ? `\n    questionIntent: ${JSON.stringify(eq.questionIntent)},` 
    : '';
  const answerStrategyStr = eq.answerStrategy 
    ? `\n    answerStrategy: ${JSON.stringify(eq.answerStrategy)},` 
    : '';
  const notesStr = eq.notes 
    ? `\n    notes: ${JSON.stringify(eq.notes)},` 
    : '';

  const replacement = `$1${similarQuestionsStr}${questionIntentStr}${answerStrategyStr}${notesStr}`;
  
  updatedContent = updatedContent.replace(questionPattern, replacement);
});

fs.writeFileSync(path.join(__dirname, 'src/data/questions-updated.ts'), updatedContent, 'utf8');

console.log('Updated questions file saved to questions-updated.ts');
console.log('Sample check - searching for q1 updates...');
const q1Match = updatedContent.match(/id: 'q1',[\s\S]*?notes:/);
console.log(q1Match ? 'Found q1 with notes field' : 'q1 not updated properly');
