const fs = require('fs');
const path = require('path');

console.log('🔄 Creating FREE version...');

// Remove export directory
const exportDir = path.join(__dirname, '..', 'utils', 'export');
if (fs.existsSync(exportDir)) {
  fs.rmSync(exportDir, { recursive: true, force: true });
  console.log('✅ Removed export functionality');
}

// Update package.json name
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.name = 'iou-tracker-free';
packageJson.version = packageJson.version + '-free';
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json for free version');

// Create a marker file
fs.writeFileSync(
  path.join(__dirname, '..', '.version-free'),
  'This is the FREE version - export functionality disabled'
);

console.log('🎉 FREE version created successfully!');
console.log('   - Export functionality removed');
console.log('   - Package name updated to iou-tracker-free');
console.log('   - Use "npm run create-pro" to restore Pro features');