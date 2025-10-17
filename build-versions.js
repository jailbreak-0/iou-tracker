#!/usr/bin/env node

/**
 * Build Script for Free and Pro Versions
 * Builds both versions of the IOU Tracker app
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
  console.log(`\n🔨 ${description}...`);
  console.log(`Command: ${command}`);
  
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: __dirname,
      env: { 
        ...process.env,
        NODE_OPTIONS: '--experimental-specifier-resolution=node'
      }
    });
    console.log(`✅ ${description} completed successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function copyAppConfig(variant) {
  console.log(`\n📋 Setting up ${variant} configuration...`);
  
  const sourceFile = path.join(__dirname, `app.${variant}.json`);
  const targetFile = path.join(__dirname, 'app.json');
  
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`✅ Copied app.${variant}.json to app.json`);
    return true;
  } else {
    console.error(`❌ Configuration file app.${variant}.json not found!`);
    return false;
  }
}

function restoreOriginalConfig() {
  console.log(`\n🔄 Restoring original app.json...`);
  // You might want to keep a backup of the original app.json as app.original.json
  // For now, we'll just note this step
  console.log(`ℹ️  Remember to restore your original app.json after builds`);
}

async function buildBothVersions() {
  console.log(`
🚀 IOU TRACKER - DUAL VERSION BUILD
==================================

This script will build both Free and Pro versions of your app.
Each version will have different package IDs and configurations.

📦 Build Profiles:
• Free Version: production-free (com.anonymous.ioutracker.free)
• Pro Version: production-pro (com.anonymous.ioutracker.pro)
  `);

  const buildType = process.argv[2] || 'apk';
  const platform = process.argv[3] || 'android';
  
  console.log(`📱 Building for: ${platform}`);
  console.log(`📦 Build type: ${buildType}`);

  // Build Free Version
  console.log(`\n🆓 BUILDING FREE VERSION`);
  console.log(`======================`);
  
  if (!copyAppConfig('free')) {
    process.exit(1);
  }
  
  const freeProfile = buildType === 'aab' ? 'production-free-aab' : 'production-free';
  const freeBuildSuccess = runCommand(
    `npx eas build --platform ${platform} --profile ${freeProfile} --non-interactive`,
    'Building Free Version'
  );
  
  if (!freeBuildSuccess) {
    console.error('❌ Free version build failed. Stopping.');
    process.exit(1);
  }

  // Build Pro Version
  console.log(`\n💎 BUILDING PRO VERSION`);
  console.log(`=====================`);
  
  if (!copyAppConfig('pro')) {
    process.exit(1);
  }
  
  const proProfile = buildType === 'aab' ? 'production-pro-aab' : 'production-pro';
  const proBuildSuccess = runCommand(
    `npx eas build --platform ${platform} --profile ${proProfile} --non-interactive`,
    'Building Pro Version'
  );
  
  if (!proBuildSuccess) {
    console.error('❌ Pro version build failed.');
    process.exit(1);
  }

  // Completion
  console.log(`
🎉 BUILD COMPLETE!
=================

✅ Free Version: Built successfully
✅ Pro Version: Built successfully

📱 You now have two separate APK files:
• IOU Tracker Free (com.anonymous.ioutracker.free)
• IOU Tracker Pro (com.anonymous.ioutracker.pro)

📋 Next Steps:
1. Download both APKs from EAS Build dashboard
2. Test both versions on your device
3. Upload to Google Play Store as separate apps

🔗 EAS Build Dashboard: https://expo.dev/accounts/[your-account]/projects/[project]/builds
  `);

  restoreOriginalConfig();
}

// Handle different build commands
const command = process.argv[2];

switch (command) {
  case 'free':
    console.log('🆓 Building Free Version Only...');
    copyAppConfig('free');
    // Set NODE_OPTIONS for this process
    process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';
    runCommand('npx eas build --platform android --profile production-free', 'Building Free Version');
    break;
    
  case 'pro':
    console.log('💎 Building Pro Version Only...');
    copyAppConfig('pro');
    // Set NODE_OPTIONS for this process
    process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';
    runCommand('npx eas build --platform android --profile production-pro', 'Building Pro Version');
    break;
    
  case 'both':
  case undefined:
    buildBothVersions();
    break;
    
  case 'aab':
    console.log('📦 Building both versions as AAB...');
    buildBothVersions();
    break;
    
  default:
    console.log(`
📖 USAGE:
========

Build both versions (default):
  node build-versions.js
  node build-versions.js both

Build specific version:
  node build-versions.js free
  node build-versions.js pro

Build AAB bundles:
  node build-versions.js aab

Build specific type:
  node build-versions.js apk android
  node build-versions.js aab android
    `);
}

module.exports = {
  copyAppConfig,
  runCommand,
  buildBothVersions
};