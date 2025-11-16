// Root layout with auth routing

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../src/hooks';
import { initializeRevenueCat, syncSubscriptionStatus } from '../src/services/revenuecat';

export default function RootLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [revenueCatInitialized, setRevenueCatInitialized] = useState(false);

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

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/');
    }
  }, [user, loading, segments]);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
    </Stack>
  );
}
