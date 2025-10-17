# 🚀 EAS BUILD GUIDE - FREE & PRO VERSIONS

## 📖 Overview
Your IOU Tracker app is now configured to build two separate versions:
- **Free Version**: Basic features, limited functionality
- **Pro Version**: All features unlocked, premium experience

## 🏗️ Build Configurations

### Free Version (`production-free`)
- **Package ID**: `com.anonymous.ioutracker.free`
- **App Name**: "IOU Tracker Free"
- **Theme**: Blue theme (#E6F4FE)
- **Features**: Basic IOU tracking
- **Pro Features**: Disabled by build configuration

### Pro Version (`production-pro`) 
- **Package ID**: `com.anonymous.ioutracker.pro`
- **App Name**: "IOU Tracker Pro"
- **Theme**: Gold theme (#FFD700)
- **Features**: All features enabled
- **Pro Features**: Enabled by build configuration

## 🔧 Build Commands

### Quick Commands (via npm)
```bash
# Build both versions (recommended)
npm run build:both

# Build individual versions
npm run build:free
npm run build:pro

# Build AAB bundles for Google Play
npm run build:aab
```

### Direct Commands (via build script)
```bash
# Build both APK versions
node build-versions.js both

# Build specific version
node build-versions.js free
node build-versions.js pro

# Build AAB bundles
node build-versions.js aab
```

### Manual EAS Commands
```bash
# Free version APK
npx eas build --platform android --profile production-free

# Pro version APK  
npx eas build --platform android --profile production-pro

# Free version AAB
npx eas build --platform android --profile production-free-aab

# Pro version AAB
npx eas build --platform android --profile production-pro-aab
```

## 📱 App Store Strategy

### Option 1: Separate Apps (Recommended)
- Upload **Free** and **Pro** as completely separate apps
- Different package IDs allow independent pricing/updates
- Users can discover both versions

### Option 2: In-App Purchase (Future)
- Use Free version as base
- Implement in-app purchase to unlock Pro features
- Single app with upgrade option

## 🔍 How Pro Detection Works

### Build-Time Detection
```typescript
// In utils/pro.ts
const appVariant = Constants.expoConfig?.extra?.appVariant;
const isProFromConfig = Constants.expoConfig?.extra?.isProVersion;

if (appVariant === 'pro' || isProFromConfig === true) {
  this._isProVersion = true; // Pro features unlocked
}
```

### Configuration Files
- `app.free.json`: Sets `isProVersion: false`
- `app.pro.json`: Sets `isProVersion: true`
- Build script copies appropriate config to `app.json`

## 📦 Build Process

### Automated Process
1. **Free Version Build**:
   - Copy `app.free.json` → `app.json` 
   - Run EAS build with `production-free` profile
   - Generates APK with package: `com.anonymous.ioutracker.free`

2. **Pro Version Build**:
   - Copy `app.pro.json` → `app.json`
   - Run EAS build with `production-pro` profile  
   - Generates APK with package: `com.anonymous.ioutracker.pro`

### Size Optimization (Applied to Both)
- ✅ APK splitting by architecture
- ✅ ProGuard code shrinking
- ✅ Resource optimization
- ✅ Hermes engine
- ✅ Bundle minification
- **Expected size**: 80-120MB per APK (down from 211MB)

## 🎯 Feature Differences

### Free Version Features
- ✅ Basic IOU tracking
- ✅ Simple reminders  
- ✅ Basic categories
- ❌ SMS integration
- ❌ Contact integration
- ❌ Advanced export
- ❌ Custom categories

### Pro Version Features  
- ✅ Everything in Free
- ✅ SMS reminders
- ✅ Contact integration
- ✅ PDF/CSV export
- ✅ Custom categories
- ✅ Advanced reminders
- ✅ Custom SMS messages

## 🚀 Build & Deploy Workflow

### 1. Pre-Build Checklist
```bash
# Verify setup
node verify-setup.js

# Optimize bundle size  
npm run optimize

# Test locally
npm start
```

### 2. Build Both Versions
```bash
# Start the build process
npm run build:both
```

### 3. Monitor Builds
- Visit: https://expo.dev/accounts/[your-account]/projects/[project]/builds
- Watch build progress for both versions
- Download APKs when complete

### 4. Test Builds
- Install both APKs on device
- Verify Pro features work only in Pro version
- Test Free version limitations

### 5. Deploy to Stores
- **Free Version**: Upload to Google Play as free app
- **Pro Version**: Upload to Google Play as paid app ($4.99+)

## 🛠️ Troubleshooting

### Build Failures
```bash
# Clear cache and rebuild
npx expo start --clear
npm run build:both
```

### Wrong App Configuration
```bash
# Manually copy correct config
copy app.free.json app.json    # For free
copy app.pro.json app.json     # For pro
```

### Size Issues
```bash
# Run optimization analysis
npm run optimize
node optimize-images.js
```

## 📊 Expected Results

### Build Output
- **2 separate APK files**
- **Different package IDs** (can install both simultaneously)
- **Optimized sizes** (80-120MB each vs original 211MB)
- **Architecture splits** (separate APKs for arm64, armv7, x86_64)

### Store Listing
- **Free**: "IOU Tracker" - Basic debt tracking
- **Pro**: "IOU Tracker Pro" - Advanced features & SMS

## 🎉 Success Metrics
- ✅ APK size reduced by 40-60%
- ✅ Two distinct app versions
- ✅ Automated build process
- ✅ Pro features properly gated
- ✅ Ready for Google Play Store

---

## 🚀 **Ready to Build!**

Run: `npm run build:both` to start building both versions!

Monitor your builds at: https://expo.dev/builds