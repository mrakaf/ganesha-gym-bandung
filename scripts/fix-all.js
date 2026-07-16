
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');
const dynamicExport = "export const dynamic = 'force-dynamic';";
const useClient = "'use client'";

function fixAll(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if file has both dynamic export and use client
  if (content.includes(dynamicExport) && content.includes(useClient)) {
    // Check if use client comes first
    const useClientIndex = content.indexOf(useClient);
    const dynamicIndex = content.indexOf(dynamicExport);
    
    if (dynamicIndex < useClientIndex) {
      // Wrong order, fix it
      // Remove both, then add use client first, then dynamic export
      content = content.replace(dynamicExport, '').replace(useClient, '');
      // Remove any leading newlines
      content = content.trimStart();
      content = useClient + '\n' + dynamicExport + '\n' + content;
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Fixed:', filePath);
    }
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
      fixAll(fullPath);
    }
  }
}

walkDir(appDir);
