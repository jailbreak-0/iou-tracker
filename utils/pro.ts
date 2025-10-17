/**
 * App Features Management
 * Only specific features are enabled
 */

// Available features enum
export enum ProFeature {
  CONTACTS_INTEGRATION = 'contacts_integration', 
  CUSTOM_CATEGORIES = 'custom_categories',
  EXPORT = 'export', // PDF/CSV export functionality
  // Removed features: SMS_REMINDERS, ADVANCED_REMINDERS, CUSTOM_SMS_MESSAGES, EXPORT_SCHEDULING
}

/**
 * Check if the app is a Pro version (always false - unified free version)
 */
export function isProVersion(): boolean {
  return false;
}

/**
 * Check if a specific feature is available
 */
export function hasProFeature(feature: ProFeature): boolean {
  const enabledFeatures = [
    ProFeature.CONTACTS_INTEGRATION,
    ProFeature.CUSTOM_CATEGORIES,
    ProFeature.EXPORT
  ];
  return enabledFeatures.includes(feature);
}

/**
 * Get the app variant (always 'free' for unified version)
 */
export function getAppVariant(): 'free' | 'pro' {
  return 'free';
}

/**
 * Check if feature should show upgrade prompts (never for enabled features)
 */
export function shouldShowUpgradePrompt(feature: ProFeature): boolean {
  return !hasProFeature(feature);
}

/**
 * Get feature availability with user-friendly messages
 */
export function getFeatureAvailability(feature: ProFeature): {
  available: boolean;
  requiresUpgrade: boolean;
  message?: string;
} {
  const isAvailable = hasProFeature(feature);
  return {
    available: isAvailable,
    requiresUpgrade: !isAvailable,
    message: isAvailable ? 'Feature is available' : 'This feature is not available in this version'
  };
}

// Legacy compatibility exports
export const ProVersionManager = {
  getInstance: () => ({
    isProVersion: () => false,
    hasFeature: (feature: ProFeature) => hasProFeature(feature),
    getAppVariant: () => 'free' as const
  })
};