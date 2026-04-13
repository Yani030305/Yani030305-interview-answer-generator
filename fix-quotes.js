const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'questions.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// Find all curly quotes
const curlySingleQuotes = (content.match(/['']/g) || []).length;
const curlyDoubleQuotes = (content.match(/[""]/g) || []).length;

console.log('Curly single quotes found:', curlySingleQuotes);
console.log('Curly double quotes found:', curlyDoubleQuotes);

// Replace curly quotes with straight quotes
let result = content
  .replace(/['']/g, "'")  // Replace curly single quotes
  .replace(/[""]/g, '"'); // Replace curly double quotes

// Count replacements
const replacements = content.length - result.length;
console.log('Characters replaced:', replacements);

if (replacements > 0 || curlySingleQuotes > 0 || curlyDoubleQuotes > 0) {
  // Save the fixed file
  fs.writeFileSync(filePath, result, 'utf8');
  console.log('✅ File updated successfully!');
  console.log('New file size:', result.length, 'bytes');
} else {
  console.log('✅ No curly quotes found, file is clean');
}