const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'questions.ts');
const content = fs.readFileSync(filePath, 'utf8');

console.log('Checking questions.ts...');
console.log('File length:', content.length);

// Check for common issues
const singleQuoteCount = (content.match(/'/g) || []).length;
const doubleQuoteCount = (content.match(/"/g) || []).length;

console.log('\nQuote counts:');
console.log('Single quotes:', singleQuoteCount);
console.log('Double quotes:', doubleQuoteCount);

// Check for control characters
const controlChars = content.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g);
if (controlChars) {
  console.log('\n⚠️  Found control characters:', controlChars.length);
  console.log('Positions:', controlChars.map((c, i) => content.indexOf(c)));
} else {
  console.log('\n✅ No control characters found');
}

// Try to parse a small part to check for syntax
try {
  const sample = content.slice(0, 500);
  console.log('\n✅ File content looks readable');
} catch (e) {
  console.log('\n❌ Error reading file:', e);
}

console.log('\nDone!');