/**
 * AdMob Service - Revenue Generation for Free Version
 * Handles banner, interstitial, and rewarded ads with smart timing
 * Respects ad-free purchase to disable ads
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isProVersion } from './pro';
import { purchaseManager } from './purchases';

// Conditional imports for development builds only
let mobileAds: any = null;
let AdEventType: any = null;
let InterstitialAd: any = null;
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;
let BannerAd: any = null;
let BannerAdSize: any = null;

// Check if we're in a development build with native modules
const isNativeModuleAvailable = async () => {
  try {
    // Don't initialize ads if we're in Pro version
    if (isProVersion()) {
      console.log('Ads disabled - Pro version');
      return false;
    }

    // Don't initialize ads if user purchased ad-free version
    const isAdFree = await purchaseManager.isAdFreeUnlocked();
    if (isAdFree) {
      console.log('Ads disabled - Ad-free version purchased');
      return false;
    }
    
    // Check if we're running on web
    if (typeof window !== 'undefined') {
      console.log('Ads disabled - Web platform');
      return false;
    }
    
    // Try to import the module
    const googleAds = require('react-native-google-mobile-ads');
    
    // Validate that all required components are available
    if (!googleAds || !googleAds.default) {
      console.log('Google Mobile Ads default export not available - likely Expo Go');
      return false;
    }
    
    // Test if the native module is actually available by checking TurboModuleRegistry
    try {
      const { TurboModuleRegistry } = require('react-native');
      if (!TurboModuleRegistry.get('RNGoogleMobileAdsModule')) {
        console.log('RNGoogleMobileAdsModule not found in TurboModuleRegistry - likely Expo Go or missing native build');
        return false;
      }
    } catch (turboError) {
      console.log('TurboModuleRegistry check failed - likely older React Native version or Expo Go');
      // Continue with the regular check for backward compatibility
    }
    
    mobileAds = googleAds.default;
    AdEventType = googleAds.AdEventType;
    InterstitialAd = googleAds.InterstitialAd;
    RewardedAd = googleAds.RewardedAd;
    RewardedAdEventType = googleAds.RewardedAdEventType;
    TestIds = googleAds.TestIds;
    BannerAd = googleAds.BannerAd;
    BannerAdSize = googleAds.BannerAdSize;
    
    // Validate all required components loaded
    if (!mobileAds || !AdEventType || !InterstitialAd || !BannerAd) {
      console.log('Some Google Mobile Ads components not available');
      return false;
    }
    
    console.log('Google Mobile Ads native module available');
    return true;
  } catch (error) {
    // More specific error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('TurboModuleRegistry.getEnforcing')) {
      console.log('Google Mobile Ads not available - running in Expo Go or native module not compiled');
    } else {
      console.log('Google Mobile Ads not available - unexpected error:', errorMessage);
    }
    return false;
  }
};

const NATIVE_ADS_AVAILABLE = isNativeModuleAvailable();

// Ad Unit IDs - Android only, using test IDs until production setup
const getAdUnits = () => {
  const testBanner = TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111';
  const testInterstitial = TestIds?.INTERSTITIAL || 'ca-app-pub-3940256099942544/1033173712';
  const testRewarded = TestIds?.REWARDED || 'ca-app-pub-3940256099942544/5224354917';
  
  return {
    // Using test IDs for now - replace with your production IDs when ready
    BANNER: __DEV__ ? testBanner : 'ca-app-pub-3940256099942544/6300978111',
    INTERSTITIAL: __DEV__ ? testInterstitial : 'ca-app-pub-3940256099942544/1033173712',
    REWARDED: __DEV__ ? testRewarded : 'ca-app-pub-3940256099942544/5224354917',
  };
};

// Ad frequency limits (prevent overwhelming users)
const AD_FREQUENCY = {
  INTERSTITIAL_MIN_INTERVAL: 5 * 60 * 1000, // 5 minutes between full-screen ads
  MAX_INTERSTITIALS_PER_SESSION: 3,
  MAX_INTERSTITIALS_PER_DAY: 8,
};

// Storage keys for tracking ad frequency
const STORAGE_KEYS = {
  LAST_INTERSTITIAL: 'lastInterstitialAd',
  INTERSTITIALS_TODAY: 'interstitialsToday',
  INTERSTITIALS_SESSION: 'interstitialsSession',
  LAST_DATE: 'lastAdDate',
};

interface AdFrequencyData {
  lastInterstitial: number;
  interstitialsToday: number;
  interstitialsSession: number;
  lastDate: string;
}

class AdService {
  private static instance: AdService;
  private isInitialized = false;
  private interstitialAd: any = null;
  private rewardedAd: any = null;
  private adFrequencyData: AdFrequencyData = {
    lastInterstitial: 0,
    interstitialsToday: 0,
    interstitialsSession: 0,
    lastDate: new Date().toDateString(),
  };

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  /**
   * Initialize AdMob service
   */
  async initialize(): Promise<void> {
    // Check if user has purchased ad-free version
    const isAdFree = await purchaseManager.isAdFreeUnlocked();
    
    // Skip initialization in multiple scenarios
    if (this.isInitialized || isProVersion() || isAdFree || !NATIVE_ADS_AVAILABLE) {
      console.log('Skipping ads initialization:', {
        isInitialized: this.isInitialized,
        isProVersion: isProVersion(),
        isAdFree: isAdFree,
        nativeAdsAvailable: NATIVE_ADS_AVAILABLE
      });
      return;
    }

    try {
      // Validate mobileAds is available before calling
      if (!mobileAds) {
        console.log('mobileAds not available - skipping initialization');
        return;
      }

      // Initialize the Mobile Ads SDK with error handling
      await mobileAds().initialize();
      
      // Load frequency data
      await this.loadAdFrequencyData();
      
      // Initialize ad units with validation
      if (InterstitialAd) {
        this.initializeInterstitialAd();
      }
      
      if (RewardedAd) {
        this.initializeRewardedAd();
      }
      
      this.isInitialized = true;
      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('AdMob initialization failed:', error);
      // Don't throw error - just log it and continue without ads
      this.isInitialized = false;
    }
  }

  /**
   * Check if ads should be shown (not disabled by purchase or pro version)
   */
  async shouldShowAds(): Promise<boolean> {
    if (isProVersion()) {
      return false;
    }
    
    const isAdFree = await purchaseManager.isAdFreeUnlocked();
    return !isAdFree;
  }

  /**
   * Get banner ad unit ID for Android
   */
  getBannerAdUnitId(): string {
    if (!NATIVE_ADS_AVAILABLE) {
      return ''; // Return empty string if native ads not available
    }
    return getAdUnits().BANNER;
  }

  /**
   * Initialize interstitial ad
   */
  private initializeInterstitialAd(): void {
    try {
      if (!InterstitialAd || !AdEventType) {
        console.log('Interstitial ad components not available');
        return;
      }

      const adUnitId = getAdUnits().INTERSTITIAL;
      if (!adUnitId) {
        console.log('Interstitial ad unit ID not available');
        return;
      }

      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('Interstitial ad loaded');
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('Interstitial ad closed');
        this.updateInterstitialFrequency();
        // Load the next ad
        this.interstitialAd?.load();
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.log('Interstitial ad error:', error);
      });

      // Load the first ad
      this.interstitialAd.load();
    } catch (error) {
      console.error('Failed to initialize interstitial ad:', error);
      this.interstitialAd = null;
    }
  }

  /**
   * Initialize rewarded ad
   */
  private initializeRewardedAd(): void {
    try {
      if (!RewardedAd || !RewardedAdEventType || !AdEventType) {
        console.log('Rewarded ad components not available');
        return;
      }

      const adUnitId = getAdUnits().REWARDED;
      if (!adUnitId) {
        console.log('Rewarded ad unit ID not available');
        return;
      }

      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('Rewarded ad loaded');
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
        console.log('User earned reward:', reward);
        // Handle reward logic here
      });

      this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        // Load the next ad
        this.rewardedAd?.load();
      });

      this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.log('Rewarded ad error:', error);
      });

      // Load the first ad
      this.rewardedAd.load();
    } catch (error) {
      console.error('Failed to initialize rewarded ad:', error);
      this.rewardedAd = null;
    }
  }

  /**
   * Show interstitial ad if conditions are met
   */
  async showInterstitialAd(context: string = 'general'): Promise<boolean> {
    // Check if ads should be disabled
    const isAdFree = await purchaseManager.isAdFreeUnlocked();
    if (!this.isInitialized || isProVersion() || isAdFree || !this.interstitialAd) {
      return false;
    }

    // Check frequency limits
    if (!(await this.canShowInterstitialAd())) {
      console.log(`Interstitial ad blocked by frequency limits (${context})`);
      return false;
    }

    try {
      if (this.interstitialAd.loaded) {
        await this.interstitialAd.show();
        console.log(`Interstitial ad shown (${context})`);
        return true;
      } else {
        console.log('Interstitial ad not loaded yet');
        return false;
      }
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  /**
   * Show rewarded ad
   */
  async showRewardedAd(): Promise<boolean> {
    // Check if ads should be disabled
    const isAdFree = await purchaseManager.isAdFreeUnlocked();
    if (!this.isInitialized || isProVersion() || isAdFree || !this.rewardedAd) {
      return false;
    }

    try {
      if (this.rewardedAd.loaded) {
        await this.rewardedAd.show();
        console.log('Rewarded ad shown');
        return true;
      } else {
        console.log('Rewarded ad not loaded yet');
        return false;
      }
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      return false;
    }
  }

  /**
   * Check if we can show an interstitial ad based on frequency limits
   */
  private async canShowInterstitialAd(): Promise<boolean> {
    const now = Date.now();
    const today = new Date().toDateString();

    // Reset daily counters if it's a new day
    if (this.adFrequencyData.lastDate !== today) {
      this.adFrequencyData.interstitialsToday = 0;
      this.adFrequencyData.lastDate = today;
      await this.saveAdFrequencyData();
    }

    // Check minimum time interval
    if (now - this.adFrequencyData.lastInterstitial < AD_FREQUENCY.INTERSTITIAL_MIN_INTERVAL) {
      return false;
    }

    // Check daily limit
    if (this.adFrequencyData.interstitialsToday >= AD_FREQUENCY.MAX_INTERSTITIALS_PER_DAY) {
      return false;
    }

    // Check session limit
    if (this.adFrequencyData.interstitialsSession >= AD_FREQUENCY.MAX_INTERSTITIALS_PER_SESSION) {
      return false;
    }

    return true;
  }

  /**
   * Update interstitial frequency counters
   */
  private async updateInterstitialFrequency(): Promise<void> {
    this.adFrequencyData.lastInterstitial = Date.now();
    this.adFrequencyData.interstitialsToday++;
    this.adFrequencyData.interstitialsSession++;
    await this.saveAdFrequencyData();
  }

  /**
   * Load ad frequency data from storage
   */
  private async loadAdFrequencyData(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('adFrequencyData');
      if (data) {
        this.adFrequencyData = { ...this.adFrequencyData, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Failed to load ad frequency data:', error);
    }
  }

  /**
   * Save ad frequency data to storage
   */
  private async saveAdFrequencyData(): Promise<void> {
    try {
      await AsyncStorage.setItem('adFrequencyData', JSON.stringify(this.adFrequencyData));
    } catch (error) {
      console.error('Failed to save ad frequency data:', error);
    }
  }

  /**
   * Reset session counters (call when app becomes active)
   */
  resetSessionCounters(): void {
    this.adFrequencyData.interstitialsSession = 0;
  }

  /**
   * Get ad revenue analytics data
   */
  getAdStats(): { 
    interstitialsToday: number; 
    interstitialsSession: number;
    canShowAd: boolean;
  } {
    return {
      interstitialsToday: this.adFrequencyData.interstitialsToday,
      interstitialsSession: this.adFrequencyData.interstitialsSession,
      canShowAd: this.canShowInterstitialAd() as any, // Simplified for stats
    };
  }
}

// Export singleton instance
export const AdManager = AdService.getInstance();

// Convenience functions
export const initializeAds = () => AdManager.initialize();
export const showInterstitialAd = (context?: string) => AdManager.showInterstitialAd(context);
export const showRewardedAd = () => AdManager.showRewardedAd();
export const getBannerAdUnitId = () => AdManager.getBannerAdUnitId();
export const shouldShowAds = () => AdManager.shouldShowAds();

// Strategic ad placement helpers
export const AdTriggers = {
  AFTER_ADD_IOU: 'after_add_iou',
  AFTER_SETTLE_IOU: 'after_settle_iou',
  VIEW_HISTORY: 'view_history',
  EXPORT_DATA: 'export_data',
  APP_BACKGROUND: 'app_background',
};