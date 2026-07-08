const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.test.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./tests');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let modified = false;

  const newContent = content
    .replace(/app\.use\((['"][^'"]+['"]),\s*([a-zA-Z0-9_]+Router)\);/g, (match, p1, p2) => {
      modified = true;
      return `app.use(${p1}, ${p2} as any);`;
    })
    .replace(/app\.use\(([a-zA-Z0-9_]+Router)\);/g, (match, p1) => {
      modified = true;
      return `app.use(${p1} as any);`;
    });

  if (modified) {
    fs.writeFileSync(f, newContent);
    console.log('Updated ' + f);
  }
});
