#!/usr/bin/env node

/**
 * EAS Build Setup Verification
 * Checks if everything is ready for dual version builds
 */

const fs = require('fs');
const path = require('path');

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

function checkEASConfig() {
  console.log('\n🔍 Checking EAS Configuration...');
  
  const easPath = path.join(__dirname, 'eas.json');
  if (!fs.existsSync(easPath)) {
    console.log('❌ eas.json not found');
    return false;
  }
  
  const easConfig = JSON.parse(fs.readFileSync(easPath, 'utf8'));
  const builds = easConfig.build || {};
  
  const requiredProfiles = [
    'production-free',
    'production-pro', 
    'production-free-aab',
    'production-pro-aab'
  ];
  
  let allProfilesExist = true;
  requiredProfiles.forEach(profile => {
    const exists = builds[profile] !== undefined;
    console.log(`${exists ? '✅' : '❌'} Build profile: ${profile}`);
    if (!exists) allProfilesExist = false;
  });
  
  return allProfilesExist;
}

function main() {
  console.log(`
🚀 EAS BUILD SETUP VERIFICATION
===============================
`);

  let allGood = true;

  // Check required files
  console.log('📁 Checking Configuration Files...');
  allGood &= checkFile('eas.json', 'EAS configuration');
  allGood &= checkFile('app.json', 'Original app config');
  allGood &= checkFile('app.free.json', 'Free version config');
  allGood &= checkFile('app.pro.json', 'Pro version config');
  allGood &= checkFile('build-versions.js', 'Build script');
  
  // Check EAS build profiles
  allGood &= checkEASConfig();
  
  // Check Android specific files
  console.log('\n📱 Checking Android Configuration...');
  allGood &= checkFile('android/app/proguard-rules.pro', 'ProGuard rules');
  allGood &= checkFile('android/app/release.gradle', 'Release gradle config');
  
  // Check optimization files
  console.log('\n⚡ Checking Optimization Files...');
  allGood &= checkFile('metro.config.js', 'Metro configuration');
  allGood &= checkFile('optimize-bundle.js', 'Bundle analyzer');
  allGood &= checkFile('optimize-images.js', 'Image analyzer');

  console.log('\n📋 BUILD COMMANDS READY:');
  console.log('========================');
  console.log('npm run build:both    # Build both versions');
  console.log('npm run build:free    # Build free version only');
  console.log('npm run build:pro     # Build pro version only');
  console.log('npm run build:aab     # Build AAB bundles');
  console.log('');
  console.log('Or use the build script directly:');
  console.log('node build-versions.js both');

  if (allGood) {
    console.log('\n🎉 SETUP COMPLETE!');
    console.log('=================');
    console.log('✅ All files are in place');
    console.log('✅ EAS configuration is ready');
    console.log('✅ Build profiles configured');
    console.log('');
    console.log('🚀 Ready to build both versions!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('1. Run: npm run build:both');
    console.log('2. Monitor builds at: https://expo.dev');
    console.log('3. Download and test both APKs');
  } else {
    console.log('\n⚠️  SETUP INCOMPLETE');
    console.log('===================');
    console.log('Some files are missing. Please check the items marked with ❌');
  }

  console.log('\n📊 App Variant Detection:');
  console.log('• Free version will have: com.anonymous.ioutracker.free');
  console.log('• Pro version will have: com.anonymous.ioutracker.pro');
  console.log('• Pro features enabled based on app variant');
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, checkEASConfig };