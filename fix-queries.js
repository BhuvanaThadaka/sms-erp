const fs = require('fs');
const path = require('path');

const srcDir = '/home/bhuvaneshwari/school/sms-fe/sms-erp-fe/src';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
let changedCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /qc\.invalidateQueries\(\[([^\]]+)\]\)/g;
  
  if (regex.test(content)) {
    const updated = content.replace(regex, 'qc.invalidateQueries({ queryKey: [$1] })');
    fs.writeFileSync(file, updated, 'utf8');
    changedCount++;
    console.log(`Updated ${file}`);
  }
});
console.log(`Updated ${changedCount} files.`);
