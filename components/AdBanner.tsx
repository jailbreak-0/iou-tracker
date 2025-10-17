/**
 * Banner Ad Component - Smart Banner Ads for Free Version
 * Automatically handles ad display based on app variant
 */

import { getBannerAdUnitId } from '@/utils/ads';
import { isProVersion } from '@/utils/pro';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Conditional import for BannerAd
let BannerAd: any = null;
let BannerAdSize: any = null;
let nativeAdsAvailable = false;

try {
  // Check if we're running on web
  if (typeof window !== 'undefined') {
    console.log('AdBanner disabled - Web platform');
  } else {
    const googleAds = require('react-native-google-mobile-ads');
    if (googleAds && googleAds.BannerAd && googleAds.BannerAdSize) {
      // Test if the native module is actually available
      try {
        const { TurboModuleRegistry } = require('react-native');
        if (TurboModuleRegistry.get('RNGoogleMobileAdsModule')) {
          BannerAd = googleAds.BannerAd;
          BannerAdSize = googleAds.BannerAdSize;
          nativeAdsAvailable = true;
          console.log('AdBanner native module available');
        } else {
          console.log('AdBanner disabled - RNGoogleMobileAdsModule not found in TurboModuleRegistry');
        }
      } catch (turboError) {
        // Fallback for older React Native versions or Expo Go
        console.log('AdBanner disabled - TurboModuleRegistry check failed, likely Expo Go');
      }
    } else {
      console.log('Google Mobile Ads BannerAd components not fully available');
    }
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes('TurboModuleRegistry.getEnforcing')) {
    console.log('AdBanner disabled - running in Expo Go or native module not compiled');
  } else {
    console.log('Google Mobile Ads not available for BannerAd:', errorMessage);
  }
}

interface AdBannerProps {
  size?: any;
  style?: any;
}

export default function AdBanner({ 
  size,
  style 
}: AdBannerProps) {
  // Don't render ads in pro version
  if (isProVersion()) {
    return null;
  }

  // If native module not available, show placeholder only in development
  if (!nativeAdsAvailable || !BannerAd) {
    // Only show placeholder in development mode
    if (__DEV__) {
      return (
        <View style={[styles.container, styles.placeholder, style]}>
          <Text style={styles.placeholderText}>Ad Placeholder (Dev Mode)</Text>
        </View>
      );
    }
    return null; // No placeholder in production
  }

  const adUnitId = getBannerAdUnitId();
  if (!adUnitId) {
    return null;
  }

  const bannerSize = size || (BannerAdSize ? BannerAdSize.BANNER : null);

  try {
    return (
      <View style={[styles.container, style]}>
        <BannerAd
          unitId={adUnitId}
          size={bannerSize}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('Banner ad loaded');
          }}
          onAdFailedToLoad={(error: any) => {
            console.error('Banner ad failed to load:', error);
          }}
        />
      </View>
    );
  } catch (error) {
    console.error('Banner ad rendering error:', error);
    // Return null instead of crashing in production
    return null;
  }
}

// Smart banner component that adapts to screen size
export function SmartAdBanner({ style }: { style?: any }) {
  if (isProVersion()) {
    return null;
  }

  const bannerSize = BannerAdSize ? BannerAdSize.FULL_BANNER : null;
  return <AdBanner size={bannerSize} style={style} />;
}

// Large banner for prominent placement
export function LargeAdBanner({ style }: { style?: any }) {
  if (isProVersion()) {
    return null;
  }

  const bannerSize = BannerAdSize ? BannerAdSize.LARGE_BANNER : null;
  return (
    <AdBanner 
      size={bannerSize}
      style={[styles.largeContainer, style]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    marginVertical: 8,
    borderRadius: 8,
  },
  placeholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  largeContainer: {
    paddingVertical: 12,
    marginVertical: 12,
  },
});