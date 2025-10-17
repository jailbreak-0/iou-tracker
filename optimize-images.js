#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Image Optimization Script
 * Provides guidance on optimizing images for smaller APK size
 */

function analyzeImage(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Image not found: ${filePath}`);
    return;
  }
  
  const stat = fs.statSync(filePath);
  const sizeInKB = (stat.size / 1024).toFixed(2);
  const fileName = path.basename(filePath);
  
  console.log(`📸 ${fileName}: ${sizeInKB} KB`);
  
  // Provide optimization suggestions
  if (stat.size > 100000) { // > 100KB
    console.log(`  ⚠️  Large file! Consider optimizing`);
    console.log(`  💡 Suggestions:`);
    console.log(`     - Convert to WebP format (50-80% smaller)`);
    console.log(`     - Reduce dimensions if possible`);
    console.log(`     - Use PNG optimization tools`);
  } else if (stat.size > 50000) { // > 50KB
    console.log(`  🔍 Medium size - could be optimized`);
    console.log(`  💡 Convert to WebP for 20-50% size reduction`);
  } else {
    console.log(`  ✅ Good size!`);
  }
  
  return { fileName, sizeKB: parseFloat(sizeInKB), sizeByte: stat.size };
}

function provideOptimizationInstructions() {
  console.log('\n🛠️  IMAGE OPTIMIZATION INSTRUCTIONS:');
  console.log('=====================================');
  
  console.log('\n1. 📱 MOBILE APP ICON OPTIMIZATION:');
  console.log('   Current icon.png is 384KB - way too large!');
  console.log('   Recommended: 20-50KB maximum');
  console.log('   ');
  console.log('   Action needed:');
  console.log('   - Resize to exactly 1024x1024px for Android');
  console.log('   - Use PNG optimization tools');
  console.log('   - Or convert to WebP format');
  
  console.log('\n2. 🔧 HOW TO OPTIMIZE:');
  console.log('   Option A - Online Tools:');
  console.log('   • TinyPNG (tinypng.com) - PNG compression');
  console.log('   • Squoosh (squoosh.app) - WebP conversion');
  console.log('   • ImageOptim - Desktop app for Mac/Windows');
  
  console.log('\n   Option B - Command Line (if you have ImageMagick):');
  console.log('   • magick convert icon.png -quality 85 -strip icon.webp');
  console.log('   • magick convert icon.png -resize 1024x1024 -quality 90 icon_optimized.png');
  
  console.log('\n3. 🎯 TARGET SIZES:');
  console.log('   • App Icon (icon.png): < 50KB');
  console.log('   • Splash Icon: < 30KB');
  console.log('   • Other assets: < 20KB each');
  
  console.log('\n4. 📦 EXPECTED SAVINGS:');
  console.log('   • Current images: ~500KB total');
  console.log('   • Optimized images: ~100KB total');
  console.log('   • APK size reduction: ~400KB');
  
  console.log('\n5. ⚡ IMPLEMENTATION:');
  console.log('   After optimization, your images will be:');
  console.log('   • 50-80% smaller in file size');
  console.log('   • Same visual quality on mobile devices');
  console.log('   • Faster app loading times');
}

function main() {
  console.log('🖼️  IMAGE SIZE ANALYSIS');
  console.log('=======================');
  
  const imagesDir = path.join(__dirname, 'assets', 'images');
  
  if (!fs.existsSync(imagesDir)) {
    console.log('❌ Images directory not found');
    return;
  }
  
  const images = fs.readdirSync(imagesDir);
  let totalSize = 0;
  
  console.log(`\n📂 Found ${images.length} images in assets/images/:\n`);
  
  images.forEach(fileName => {
    const filePath = path.join(imagesDir, fileName);
    const result = analyzeImage(filePath);
    if (result) {
      totalSize += result.sizeByte;
    }
    console.log('');
  });
  
  console.log(`📊 TOTAL IMAGES SIZE: ${(totalSize / 1024).toFixed(2)} KB`);
  
  provideOptimizationInstructions();
}

if (require.main === module) {
  main();
}

module.exports = { analyzeImage, provideOptimizationInstructions };