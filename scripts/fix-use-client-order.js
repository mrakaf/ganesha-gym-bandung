
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');
const dynamicExport = "export const dynamic = 'force-dynamic';\n";
const useClient = "'use client'\n";

function fixOrder(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if file has both dynamic export and use client in wrong order
  if (content.includes(dynamicExport) && content.includes(useClient)) {
    // Remove dynamic export and use client, then add use client first, then dynamic export
    content = content.replace(dynamicExport, '').replace(useClient, '');
    content = useClient + dynamicExport + content;
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed order:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file === 'page.tsx' || file === 'route.ts') {
      fixOrder(fullPath);
    }
  }
}

walkDir(appDir);
