
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');

function addDynamicExport(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const dynamicExport = "export const dynamic = 'force-dynamic';\n";
  
  if (!content.includes(dynamicExport)) {
    content = dynamicExport + content;
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Updated:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file === 'page.tsx') {
      addDynamicExport(fullPath);
    }
  }
}

walkDir(appDir);
