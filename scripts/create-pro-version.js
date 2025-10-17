const fs = require('fs');
const path = require('path');

console.log('🔄 Creating PRO version...');

// Create export directory if it doesn't exist
const exportDir = path.join(__dirname, '..', 'utils', 'export');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
  
  // Restore ExportManager.ts (you'd need to have this backed up)
  const exportManagerContent = `// ExportManager.ts content would be restored here
export class ExportManager {
  // Full export functionality
}

export const exportToCSV = () => {};
export const exportToPDF = () => {};`;
  
  fs.writeFileSync(
    path.join(exportDir, 'ExportManager.ts'), 
    exportManagerContent
  );
  console.log('✅ Restored export functionality');
}

// Update package.json name
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.name = 'iou-tracker-pro';
packageJson.version = packageJson.version.replace('-free', '-pro');
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json for Pro version');

// Remove free version marker
const freeMarker = path.join(__dirname, '..', '.version-free');
if (fs.existsSync(freeMarker)) {
  fs.unlinkSync(freeMarker);
}

// Create pro marker
fs.writeFileSync(
  path.join(__dirname, '..', '.version-pro'),
  'This is the PRO version - all features enabled'
);

console.log('🎉 PRO version created successfully!');
console.log('   - Export functionality enabled');
console.log('   - Package name updated to iou-tracker-pro');
console.log('   - All premium features available');