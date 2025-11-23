// Root layout with auth routing

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../src/hooks';
import { auth } from '../src/config/firebase';
import { FirebaseSetupScreen } from '../src/components/FirebaseSetupScreen';
import { initializeRevenueCat, syncSubscriptionStatus } from '../src/services/revenuecat';
import { hasCompletedOnboarding } from '../src/services/onboarding';

export default function RootLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [revenueCatInitialized, setRevenueCatInitialized] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Initialize RevenueCat when user is authenticated
  useEffect(() => {
    if (user?.uid && !revenueCatInitialized) {
      initializeRevenueCat(user.uid)
        .then(() => {
          setRevenueCatInitialized(true);
          console.log('RevenueCat initialized for user:', user.uid);
        })
        .catch((error) => {
          console.error('Failed to initialize RevenueCat:', error);
          // Continue even if RevenueCat fails - app should still work
        });
    }
  }, [user?.uid, revenueCatInitialized]);

  // Sync subscription status periodically
  useEffect(() => {
    if (!user?.uid || !revenueCatInitialized) return;

    // Sync immediately
    syncSubscriptionStatus(user.uid);

    // Sync every 5 minutes
    const interval = setInterval(() => {
      syncSubscriptionStatus(user.uid);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.uid, revenueCatInitialized]);

  // Check onboarding status when user is authenticated
  useEffect(() => {
    if (!user?.uid || onboardingChecked) return;

    hasCompletedOnboarding()
      .then((completed) => {
        setNeedsOnboarding(!completed);
        setOnboardingChecked(true);
      })
      .catch((error) => {
        console.error('Failed to check onboarding status:', error);
        setOnboardingChecked(true);
      });
  }, [user?.uid, onboardingChecked]);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // Redirect to onboarding or main app if authenticated
      if (needsOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/');
      }
    } else if (user && needsOnboarding && !inOnboarding) {
      // Redirect to onboarding if not completed
      router.replace('/onboarding');
    } else if (user && !needsOnboarding && inOnboarding) {
      // Redirect to main app if onboarding already completed
      router.replace('/');
    }
  }, [user, loading, segments, onboardingChecked, needsOnboarding]);

  // Show setup screen if Firebase is not configured
  if (!auth) {
    return <FirebaseSetupScreen />;
  }

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="upgrade" />
      <Stack.Screen name="reflection" options={{ presentation: 'modal' }} />
      <Stack.Screen name="cooloff" options={{ presentation: 'modal' }} />
      <Stack.Screen name="cooloff-complete" options={{ presentation: 'modal' }} />
      <Stack.Screen name="support" />
    </Stack>
  );
}
