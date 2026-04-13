const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'questions.ts');
const content = fs.readFileSync(filePath, 'utf8');

console.log('File size:', content.length, 'bytes');
console.log('Total lines:', content.split('\n').length);

// Try to find any problematic characters
const problematic = [];
const lines = content.split('\n');

lines.forEach((line, index) => {
  // Check for unescaped quotes in strings
  if (line.includes('similarQuestions:') && !line.includes('similarQuestions: [')) {
    console.log(`Line ${index + 1}: Possible issue with similarQuestions`);
    console.log('  ', line);
  }

  // Check for control characters
  const controlChars = line.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g);
  if (controlChars) {
    console.log(`Line ${index + 1}: Found control characters`);
    problematic.push({ line: index + 1, chars: controlChars });
  }
});

if (problematic.length > 0) {
  console.log('\n⚠️  Found problematic lines:', problematic.length);
} else {
  console.log('\n✅ No obvious issues found');
}

// Check if file can be parsed as JavaScript
try {
  // Remove import and export statements for testing
  const testContent = content
    .replace(/import.*from.*/g, '')
    .replace(/export (const|function)/g, '$1');

  // Try to evaluate (this will fail on TypeScript, but might catch syntax errors)
  console.log('\nAttempting basic syntax check...');
  eval(`(${testContent})`);
  console.log('✅ Basic syntax OK');
} catch (e) {
  console.log('❌ Syntax error:', e.message);

  // Try to find the line number
  const match = e.message.match(/at position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    const beforeError = content.substring(0, pos);
    const lineNum = beforeError.split('\n').length;
    console.log(`Error appears to be around line ${lineNum}`);

    // Show context
    const startLine = Math.max(0, lineNum - 3);
    const endLine = Math.min(lines.length, lineNum + 2);
    console.log('\nContext:');
    for (let i = startLine; i < endLine; i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  }
}