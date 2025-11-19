// RevenueCat configuration

import { Platform } from 'react-native';

/**
 * RevenueCat API Keys
 * Get these from: https://app.revenuecat.com/
 * Settings > Apps > [Your App] > API Keys
 *
 * IMPORTANT: Use different keys for iOS and Android
 */
export const REVENUECAT_CONFIG = {
  // TODO: Replace with your actual RevenueCat API keys
  apiKey: Platform.select({
    ios: 'appl_YOUR_IOS_API_KEY',
    android: 'goog_YOUR_ANDROID_API_KEY',
  }) || '',

  // Offering identifiers (configured in RevenueCat dashboard)
  offeringId: 'default',

  // Product identifiers (must match App Store Connect / Google Play Console)
  products: {
    monthly: 'tiltguard_pro_monthly',
    yearly: 'tiltguard_pro_yearly',
  },

  // Entitlement identifier (what unlocks Pro features)
  entitlementId: 'pro',
};

/**
 * App Store / Play Store Configuration
 *
 * iOS (App Store Connect):
 * 1. Create In-App Purchase products:
 *    - ID: tiltguard_pro_monthly
 *    - Type: Auto-Renewable Subscription
 *    - Price: $4.99/month
 *
 *    - ID: tiltguard_pro_yearly
 *    - Type: Auto-Renewable Subscription
 *    - Price: $29.99/year
 *
 * Android (Google Play Console):
 * 1. Create subscription products with same IDs
 *
 * RevenueCat Dashboard:
 * 1. Create "default" offering
 * 2. Add both products to the offering
 * 3. Configure entitlement "pro" that both products unlock
 */
