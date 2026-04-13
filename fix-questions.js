const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'questions.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 找到问题对象中的字符串字段，并用反引号替换单引号来避免转义问题
console.log('Fixing strings in questions.ts...');

// 首先备份原文件
fs.writeFileSync(filePath + '.backup', content, 'utf8');
console.log('Backup created at', filePath + '.backup');

// 替换所有单引号字符串中可能有问题的换行符，改为模板字符串
// 这是一个更安全的方法：将所有包含换行符的单引号字符串改为反引号

// 先处理 questionIntent
let result = content.replace(/questionIntent: '([^']*(?:\\n|\\r)[^']*)'/g, (match, str) => {
  const unescaped = str.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
  return `questionIntent: \`${unescaped}\``;
});

// 处理 answerStrategy
result = result.replace(/answerStrategy: '([^']*(?:\\n|\\r)[^']*)'/g, (match, str) => {
  const unescaped = str.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
  return `answerStrategy: \`${unescaped}\``;
});

// 处理 notes
result = result.replace(/notes: '([^']*(?:\\n|\\r)[^']*)'/g, (match, str) => {
  const unescaped = str.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
  return `notes: \`${unescaped}\``;
});

console.log('Fixed string fields with newlines');

fs.writeFileSync(filePath, result, 'utf8');
console.log('File updated successfully!');