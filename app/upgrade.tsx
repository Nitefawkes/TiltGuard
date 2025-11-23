// Upgrade/Paywall screen - Convert Free users to Pro

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { useAuth, useUserProfile } from '../src/hooks';
import { Button, Card, colors } from '../src/components/UI';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getProductPrice,
} from '../src/services/revenuecat';

type PricingPlan = 'monthly' | 'yearly';

export default function UpgradeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid || null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<{
    monthly: PurchasesPackage | null;
    yearly: PurchasesPackage | null;
  }>({ monthly: null, yearly: null });

  // Load offerings from RevenueCat
  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setLoading(true);
    try {
      const offerings = await getOfferings();
      if (offerings?.current) {
        const availablePackages = offerings.current.availablePackages;

        // Find packages by identifier
        const monthly = availablePackages.find((pkg: PurchasesPackage) =>
          pkg.identifier.includes('monthly')
        );
        const yearly = availablePackages.find((pkg: PurchasesPackage) =>
          pkg.identifier.includes('yearly')
        );

        setPackages({
          monthly: monthly || null,
          yearly: yearly || null,
        });
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
      Alert.alert(
        'Error',
        'Failed to load subscription options. Please check your internet connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Get pricing from RevenueCat packages or fallback to defaults
  const getPricing = () => {
    return {
      monthly: {
        price: packages.monthly ? getProductPrice(packages.monthly) : '$4.99',
        period: 'month',
        total: packages.monthly ? getProductPrice(packages.monthly) : '$4.99/mo',
        savings: null,
      },
      yearly: {
        price: packages.yearly ? getProductPrice(packages.yearly) : '$29.99',
        period: 'year',
        total: packages.yearly ? getProductPrice(packages.yearly) : '$29.99/yr',
        savings: 'Save 50%',
        monthlyEquivalent: packages.yearly ? '$2.50/mo' : '$2.50/mo',
      },
    };
  };

  const pricing = getPricing();

  const handlePurchase = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to upgrade');
      return;
    }

    const selectedPackage = packages[selectedPlan];
    if (!selectedPackage) {
      Alert.alert('Error', 'Selected plan is not available. Please try again.');
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchasePackage(selectedPackage, user.uid);

      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          'Welcome to TiltGuard Pro! You now have access to all Pro features.',
          [
            {
              text: 'Get Started',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        // Only show error if it's not a user cancellation
        if (result.error && !result.error.includes('cancelled')) {
          Alert.alert('Purchase Failed', result.error);
        }
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to complete purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setRestoring(true);
    try {
      const result = await restorePurchases(user.uid);

      if (result.success) {
        if (result.isPro) {
          Alert.alert(
            'Success! 🎉',
            'Your Pro subscription has been restored!',
            [
              {
                text: 'Continue',
                onPress: () => router.back(),
              },
            ]
          );
        } else {
          Alert.alert('No Purchases Found', result.error || 'No previous purchases found.');
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to restore purchases');
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  if (profile?.plan === 'pro') {
    return (
      <View style={styles.container}>
        <View style={styles.alreadyProContainer}>
          <Text style={styles.alreadyProIcon}>✅</Text>
          <Text style={styles.alreadyProTitle}>You're Already Pro!</Text>
          <Text style={styles.alreadyProText}>
            You have access to all TiltGuard Pro features.
          </Text>
          <Button title="Back to Dashboard" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // Show loading state while fetching offerings
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade to Pro 🛡️</Text>
          <Text style={styles.headerSubtitle}>
            Get the full TiltGuard experience
          </Text>
        </View>

        {/* Features Grid */}
        <Card style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Pro Features</Text>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>⏱️</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>60-Second Breather</Text>
              <Text style={styles.featureDescription}>
                Forced pause when triggers fire - can't skip the countdown
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🧊</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Cool-Off Timers</Text>
              <Text style={styles.featureDescription}>
                Block yourself from betting for 1 hour, 24 hours, or 3 days
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Patterns Analysis</Text>
              <Text style={styles.featureDescription}>
                See your best/worst sports, win rates, and betting trends
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎯</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Coach Tone Customization</Text>
              <Text style={styles.featureDescription}>
                Choose how TiltGuard speaks to you: calm, firm, or clinical
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔔</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Earlier Nudges</Text>
              <Text style={styles.featureDescription}>
                Get warnings before you hit your limits, not just after
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🛡️</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>All Future Pro Features</Text>
              <Text style={styles.featureDescription}>
                Get every new Pro feature we build at no extra cost
              </Text>
            </View>
          </View>
        </Card>

        {/* Pricing Plans */}
        <View style={styles.pricingContainer}>
          <Text style={styles.pricingTitle}>Choose Your Plan</Text>

          {/* Yearly Plan (Recommended) */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'yearly' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            {pricing.yearly.savings && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsBadgeText}>{pricing.yearly.savings}</Text>
              </View>
            )}
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingPeriod}>Yearly</Text>
              <Text style={styles.pricingPrice}>$29.99</Text>
              <Text style={styles.pricingSubtext}>$2.50/month</Text>
            </View>
            <View style={styles.pricingFeatures}>
              <Text style={styles.pricingFeature}>✓ All Pro features</Text>
              <Text style={styles.pricingFeature}>✓ Best value</Text>
              <Text style={styles.pricingFeature}>✓ Cancel anytime</Text>
            </View>
          </TouchableOpacity>

          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'monthly' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingPeriod}>Monthly</Text>
              <Text style={styles.pricingPrice}>$4.99</Text>
              <Text style={styles.pricingSubtext}>per month</Text>
            </View>
            <View style={styles.pricingFeatures}>
              <Text style={styles.pricingFeature}>✓ All Pro features</Text>
              <Text style={styles.pricingFeature}>✓ Flexible commitment</Text>
              <Text style={styles.pricingFeature}>✓ Cancel anytime</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CTA Button */}
        <Button
          title={`Start Pro ${
            selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'
          } - ${pricing[selectedPlan as 'monthly' | 'yearly'].total}`}
          onPress={handlePurchase}
          loading={purchasing}
          disabled={purchasing || restoring}
          style={styles.purchaseButton}
        />

        {/* Restore Purchases */}
        <TouchableOpacity
          onPress={handleRestore}
          style={styles.restoreButton}
          disabled={purchasing || restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text
              style={[
                styles.restoreButtonText,
                (purchasing || restoring) && styles.restoreButtonTextDisabled,
              ]}
            >
              Restore Purchases
            </Text>
          )}
        </TouchableOpacity>

        {/* Fine Print */}
        <View style={styles.finePrint}>
          <Text style={styles.finePrintText}>
            Payment will be charged to your account. Subscription automatically renews
            unless auto-renew is turned off at least 24 hours before the end of the
            current period. Cancel anytime in your account settings.
          </Text>
        </View>

        {/* Social Proof / Testimonials */}
        <Card style={styles.testimonialCard}>
          <Text style={styles.testimonialQuote}>
            "TiltGuard Pro literally saved my bankroll. The 60-second breather stopped
            me from chasing a bad loss streak. Worth every penny."
          </Text>
          <Text style={styles.testimonialAuthor}>- Florida bettor, 3 months Pro</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featuresCard: {
    gap: 16,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  feature: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  pricingContainer: {
    gap: 12,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pricingPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pricingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pricingFeatures: {
    gap: 8,
  },
  pricingFeature: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  purchaseButton: {
    marginTop: 8,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  restoreButtonTextDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  finePrint: {
    paddingHorizontal: 8,
  },
  finePrintText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  testimonialCard: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  testimonialQuote: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 12,
  },
  testimonialAuthor: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  alreadyProContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  alreadyProIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  alreadyProTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  alreadyProText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
});
