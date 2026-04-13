const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

mammoth.extractRawText({path: path.join(__dirname, '../01外企英文面试通关指南.docx')})
  .then(function(result){
    fs.writeFileSync(path.join(__dirname, 'document-content.txt'), result.value, 'utf8');
    console.log('Document saved to document-content.txt');
  })
  .catch(function(err) {
    console.error(err);
  });
