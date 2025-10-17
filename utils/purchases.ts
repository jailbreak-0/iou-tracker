/**
 * Purchase Manager - Handle one-time ad removal purchase
 * Manages in-app purchases to remove ads permanently
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Alert } from 'react-native';

export interface PurchaseState {
  adFreeUnlocked: boolean;
  purchaseDate?: string;
  transactionId?: string;
}

export class PurchaseManager {
  private static instance: PurchaseManager;
  private static readonly AD_FREE_STORAGE_KEY = 'iou_tracker_ad_free_purchased';
  private static readonly AD_FREE_PRODUCT_ID = 'iou_tracker_remove_ads';
  
  // Price for removing ads (in USD cents, e.g., 299 = $2.99)
  public static readonly AD_FREE_PRICE = 299;
  public static readonly AD_FREE_PRICE_DISPLAY = '$2.99';

  public static getInstance(): PurchaseManager {
    if (!PurchaseManager.instance) {
      PurchaseManager.instance = new PurchaseManager();
    }
    return PurchaseManager.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Check if user has purchased ad-free version
   */
  public async isAdFreeUnlocked(): Promise<boolean> {
    try {
      const purchaseData = await AsyncStorage.getItem(PurchaseManager.AD_FREE_STORAGE_KEY);
      if (!purchaseData) {
        return false;
      }

      const purchase: PurchaseState = JSON.parse(purchaseData);
      return purchase.adFreeUnlocked || false;
    } catch (error) {
      console.error('Error checking ad-free status:', error);
      return false;
    }
  }

  /**
   * Get purchase state details
   */
  public async getPurchaseState(): Promise<PurchaseState> {
    try {
      const purchaseData = await AsyncStorage.getItem(PurchaseManager.AD_FREE_STORAGE_KEY);
      if (!purchaseData) {
        return { adFreeUnlocked: false };
      }

      return JSON.parse(purchaseData);
    } catch (error) {
      console.error('Error getting purchase state:', error);
      return { adFreeUnlocked: false };
    }
  }

  /**
   * Simulate purchase process (since we don't have real in-app purchases set up)
   * In production, this would integrate with Google Play Billing or App Store
   */
  public async purchaseAdFree(): Promise<boolean> {
    try {
      // Show confirmation dialog
      return new Promise((resolve) => {
        Alert.alert(
          'Remove Ads',
          `Purchase ad-free version for ${PurchaseManager.AD_FREE_PRICE_DISPLAY}?\n\nThis will permanently remove all advertisements from the app.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false)
            },
            {
              text: 'Purchase',
              style: 'default',
              onPress: async () => {
                try {
                  // Simulate purchase process
                  const success = await this.simulatePurchase();
                  if (success) {
                    await this.unlockAdFree();
                    Alert.alert(
                      'Purchase Successful!',
                      'Ads have been permanently removed from your app. Thank you for your support!',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            // Optionally ask for app store review
                            this.requestReview();
                          }
                        }
                      ]
                    );
                  }
                  resolve(success);
                } catch (error) {
                  console.error('Purchase failed:', error);
                  Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again later.');
                  resolve(false);
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('Error initiating purchase:', error);
      Alert.alert('Error', 'Unable to start purchase process.');
      return false;
    }
  }

  /**
   * Simulate purchase transaction
   * In production, replace this with actual Google Play Billing or App Store integration
   */
  private async simulatePurchase(): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For now, always succeed (in production, this would handle real payment processing)
    return true;
  }

  /**
   * Unlock ad-free version locally
   */
  private async unlockAdFree(): Promise<void> {
    const purchaseState: PurchaseState = {
      adFreeUnlocked: true,
      purchaseDate: new Date().toISOString(),
      transactionId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    await AsyncStorage.setItem(
      PurchaseManager.AD_FREE_STORAGE_KEY,
      JSON.stringify(purchaseState)
    );
  }

  /**
   * Restore purchases (for app reinstalls)
   */
  public async restorePurchases(): Promise<boolean> {
    try {
      // In production, this would query the app stores for previous purchases
      Alert.alert(
        'Restore Purchases',
        'This feature will be available when in-app purchases are fully implemented.',
        [{ text: 'OK' }]
      );
      return false;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Unable to restore purchases.');
      return false;
    }
  }

  /**
   * Reset purchase state (for testing)
   */
  public async resetPurchases(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PurchaseManager.AD_FREE_STORAGE_KEY);
      console.log('Purchase state reset');
    } catch (error) {
      console.error('Error resetting purchases:', error);
    }
  }

  /**
   * Request app store review after successful purchase
   */
  private async requestReview(): Promise<void> {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    } catch (error) {
      console.error('Error requesting review:', error);
    }
  }
}

// Export singleton instance
export const purchaseManager = PurchaseManager.getInstance();