#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Bundle Size Optimization Script
 * Analyzes and optimizes the React Native bundle
 */

function analyzeImports(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /^import\s+.*?from\s+['"]([^'"]+)['"];?$/gm;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      line: match[0],
      module: match[1],
      lineNumber: content.substring(0, match.index).split('\n').length
    });
  }
  
  return imports;
}

function findUnusedImports(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = analyzeImports(filePath);
  const unusedImports = [];
  
  imports.forEach(importInfo => {
    const { line, module } = importInfo;
    
    // Extract imported names
    const namedImportMatch = line.match(/import\s+{([^}]+)}/);
    const defaultImportMatch = line.match(/import\s+(\w+)\s+from/);
    const namespaceImportMatch = line.match(/import\s+\*\s+as\s+(\w+)/);
    
    let importedNames = [];
    
    if (namedImportMatch) {
      importedNames = namedImportMatch[1].split(',').map(name => name.trim());
    }
    if (defaultImportMatch) {
      importedNames.push(defaultImportMatch[1]);
    }
    if (namespaceImportMatch) {
      importedNames.push(namespaceImportMatch[1]);
    }
    
    // Check if any imported name is used in the file
    const isUsed = importedNames.some(name => {
      const usageRegex = new RegExp(`\\b${name}\\b`, 'g');
      const matches = content.match(usageRegex);
      return matches && matches.length > 1; // More than 1 because import statement itself counts
    });
    
    if (!isUsed) {
      unusedImports.push(importInfo);
    }
  });
  
  return unusedImports;
}

function optimizeFile(filePath) {
  console.log(`\nAnalyzing: ${filePath}`);
  
  const unusedImports = findUnusedImports(filePath);
  
  if (unusedImports.length === 0) {
    console.log('  ✅ No unused imports found');
    return;
  }
  
  console.log(`  🔍 Found ${unusedImports.length} potentially unused imports:`);
  unusedImports.forEach(({ line, lineNumber }) => {
    console.log(`    Line ${lineNumber}: ${line}`);
  });
  
  // Note: Automated removal is risky, so we just report
  console.log('  ⚠️  Please manually review and remove if confirmed unused');
}

function analyzeAssets() {
  console.log('\n📁 Analyzing Assets...');
  
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.log('  No assets directory found');
    return;
  }
  
  const analyzeDir = (dir, prefix = '') => {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        analyzeDir(filePath, prefix + file + '/');
      } else if (stat.isFile()) {
        const sizeInKB = (stat.size / 1024).toFixed(2);
        const relativePath = prefix + file;
        
        if (stat.size > 100000) { // Files larger than 100KB
          console.log(`  🔍 Large file: ${relativePath} (${sizeInKB} KB)`);
        }
        
        // Check for duplicate or similar files
        const fileExt = path.extname(file);
        if (['.png', '.jpg', '.jpeg', '.gif'].includes(fileExt.toLowerCase())) {
          if (sizeInKB > 50) {
            console.log(`  📸 Consider optimizing image: ${relativePath} (${sizeInKB} KB)`);
          }
        }
      }
    });
  };
  
  analyzeDir(assetsDir);
}

function main() {
  console.log('🚀 React Native Bundle Size Optimization Analysis');
  console.log('==================================================');
  
  // Analyze main source files
  const filesToAnalyze = [
    'app/(tabs)/index.tsx',
    'app/(tabs)/settings.tsx',
    'app/(tabs)/history.tsx',
    'app/(tabs)/explore.tsx',
    'app/add-iou.tsx',
    'app/_layout.tsx',
    'app/modal.tsx'
  ];
  
  console.log('\n📋 Analyzing TypeScript/JavaScript files for unused imports...');
  
  filesToAnalyze.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      optimizeFile(fullPath);
    }
  });
  
  // Analyze assets
  analyzeAssets();
  
  // Bundle size recommendations
  console.log('\n💡 Bundle Size Optimization Recommendations:');
  console.log('==============================================');
  console.log('1. ✅ Remove unused dependencies from package.json');
  console.log('2. ✅ Enable Hermes engine for better performance');
  console.log('3. ✅ Use APK splitting by architecture');
  console.log('4. ✅ Enable ProGuard for code obfuscation and shrinking');
  console.log('5. 🔍 Consider lazy loading for rarely used features');
  console.log('6. 📸 Optimize image assets (WebP format, proper sizing)');
  console.log('7. 📦 Use bundle analyzer to identify large dependencies');
  console.log('8. 🗜️  Enable gzip compression in metro config');
  
  console.log('\n🎯 Expected size reduction: 40-60% (211MB → ~80-120MB)');
  console.log('\n📊 To build optimized APK:');
  console.log('   npx eas build --platform android --profile production');
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeImports,
  findUnusedImports,
  optimizeFile,
  analyzeAssets
};