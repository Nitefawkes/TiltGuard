// RevenueCat service layer - Subscription management

import Purchases, {
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { REVENUECAT_CONFIG } from '../config/revenuecat';
import { updateUserPlan } from './firebase';

/**
 * Initialize RevenueCat SDK
 * Call this once at app startup
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  try {
    // Configure SDK
    Purchases.setLogLevel(LOG_LEVEL.DEBUG); // Set to ERROR in production

    // Initialize with API key
    await Purchases.configure({
      apiKey: REVENUECAT_CONFIG.apiKey,
      appUserID: userId, // Link to Firebase UID
    });

    console.log('RevenueCat initialized successfully');

    // Sync subscription status
    await syncSubscriptionStatus(userId);
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    throw error;
  }
}

/**
 * Get available offerings (pricing plans)
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      console.warn('No offerings found. Check RevenueCat dashboard configuration.');
      return null;
    }

    return offerings;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Get specific package (monthly or yearly)
 */
export async function getPackage(
  type: 'monthly' | 'yearly'
): Promise<PurchasesPackage | null> {
  try {
    const offerings = await getOfferings();
    if (!offerings?.current) return null;

    // Find the package by identifier
    const packageId = REVENUECAT_CONFIG.products[type];
    const package_ = offerings.current.availablePackages.find(
      (pkg: PurchasesPackage) => pkg.identifier === packageId
    );

    if (!package_) {
      console.warn(`Package not found: ${packageId}`);
    }

    return package_ || null;
  } catch (error) {
    console.error('Failed to get package:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  package_: PurchasesPackage,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(package_);

    // Check if purchase was successful
    const isPro = hasProEntitlement(customerInfo);

    if (isPro) {
      // Update Firebase user plan
      await updateUserPlan(userId, 'pro');

      console.log('Purchase successful! User is now Pro.');
      return { success: true };
    } else {
      return {
        success: false,
        error: 'Purchase completed but Pro access not granted',
      };
    }
  } catch (error: any) {
    console.error('Purchase failed:', error);

    // Handle user cancellation
    if (error.userCancelled) {
      return { success: false, error: 'Purchase cancelled' };
    }

    // Handle other errors
    return {
      success: false,
      error: error.message || 'Purchase failed. Please try again.',
    };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(
  userId: string
): Promise<{ success: boolean; isPro: boolean; error?: string }> {
  try {
    const customerInfo = await Purchases.restorePurchases();

    const isPro = hasProEntitlement(customerInfo);

    if (isPro) {
      // Update Firebase user plan
      await updateUserPlan(userId, 'pro');
      console.log('Purchases restored! User is Pro.');
      return { success: true, isPro: true };
    } else {
      return {
        success: true,
        isPro: false,
        error: 'No previous purchases found',
      };
    }
  } catch (error: any) {
    console.error('Restore failed:', error);
    return {
      success: false,
      isPro: false,
      error: error.message || 'Failed to restore purchases',
    };
  }
}

/**
 * Get current customer info (subscription status)
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/**
 * Check if customer has Pro entitlement
 */
export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  const entitlement =
    customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId];
  return !!entitlement;
}

/**
 * Sync subscription status with Firebase
 * Call this periodically to ensure Firebase stays in sync
 */
export async function syncSubscriptionStatus(userId: string): Promise<void> {
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return;

    const isPro = hasProEntitlement(customerInfo);

    // Update Firebase to match RevenueCat
    await updateUserPlan(userId, isPro ? 'pro' : 'free');

    console.log(`Subscription synced: ${isPro ? 'Pro' : 'Free'}`);
  } catch (error) {
    console.error('Failed to sync subscription status:', error);
  }
}

/**
 * Get subscription expiration date
 */
export function getExpirationDate(customerInfo: CustomerInfo): Date | null {
  const entitlement =
    customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId];

  if (!entitlement || !entitlement.expirationDate) {
    return null;
  }

  return new Date(entitlement.expirationDate);
}

/**
 * Check if subscription will renew
 */
export function willRenew(customerInfo: CustomerInfo): boolean {
  const entitlement =
    customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId];

  if (!entitlement) return false;

  return entitlement.willRenew;
}

/**
 * Get product price for display
 */
export function getProductPrice(package_: PurchasesPackage): string {
  return package_.product.priceString;
}

/**
 * Format subscription period for display
 */
export function getSubscriptionPeriod(package_: PurchasesPackage): string {
  const period = package_.product.subscriptionPeriod;

  // This is a simplified version - RevenueCat provides detailed period info
  if (package_.identifier.includes('monthly')) {
    return 'month';
  } else if (package_.identifier.includes('yearly')) {
    return 'year';
  }

  return period || 'subscription';
}
