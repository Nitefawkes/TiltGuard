// Custom React hooks for TiltGuard

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { CustomerInfo } from 'react-native-purchases';
import { auth, db } from '../config/firebase';
import { UserProfile, UserStats } from '../types';
import { getUserProfile, getUserStats } from '../services/firebase';
import { getCustomerInfo, hasProEntitlement } from '../services/revenuecat';

/**
 * Hook to track authentication state
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If auth is not configured, just set loading to false
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}

/**
 * Hook to get user profile data
 */
export function useUserProfile(uid: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid || !db) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for user profile
    const unsubscribe = onSnapshot(
      doc(db, 'users', uid),
      (doc: DocumentSnapshot) => {
        if (doc.exists()) {
          setProfile({ uid, ...doc.data() } as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err: Error) => {
        console.error('Error fetching user profile:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return { profile, loading, error };
}

/**
 * Hook to get user stats (real-time)
 */
export function useUserStats(uid: string | null) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid || !db) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for stats
    const unsubscribe = onSnapshot(
      doc(db, 'users', uid, 'stats', 'main'),
      (doc: DocumentSnapshot) => {
        if (doc.exists()) {
          setStats(doc.data() as UserStats);
        } else {
          setStats(null);
        }
        setLoading(false);
      },
      (err: Error) => {
        console.error('Error fetching user stats:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const refresh = async () => {
    if (!uid || !db) return;
    try {
      const freshStats = await getUserStats(uid);
      setStats(freshStats);
    } catch (err) {
      console.error('Error refreshing stats:', err);
      setError(err as Error);
    }
  };

  return { stats, loading, error, refresh };
}

/**
 * Hook to check subscription status from RevenueCat
 * Returns Pro status and customer info
 */
export function useSubscription() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionStatus();

    // Refresh every minute to catch updates
    const interval = setInterval(() => {
      loadSubscriptionStatus();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const info = await getCustomerInfo();
      if (info) {
        setCustomerInfo(info);
        setIsPro(hasProEntitlement(info));
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  return { customerInfo, isPro, loading, refresh: loadSubscriptionStatus };
}

/**
 * Hook to manage push notifications
 */
export function useNotifications(userId: string | null) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  useEffect(() => {
    if (!userId) return;

    // Check notification permissions on mount
    checkPermissions();
  }, [userId]);

  const checkPermissions = async () => {
    const { areNotificationsEnabled } = await import('../services/notifications');
    const enabled = await areNotificationsEnabled();
    setPermission(enabled ? 'granted' : 'denied');
  };

  const requestPermissions = async (): Promise<boolean> => {
    const { requestNotificationPermissions, registerForPushNotificationsAsync } = await import('../services/notifications');
    const { updateNotificationSettings } = await import('../services/firebase');

    const granted = await requestNotificationPermissions();
    setPermission(granted ? 'granted' : 'denied');

    if (granted && userId) {
      // Register for push notifications and get token
      const token = await registerForPushNotificationsAsync();

      if (token) {
        // Save token to user profile
        await updateNotificationSettings(userId, {
          enabled: true,
          pushToken: token,
        });
        setIsRegistered(true);
      }
    }

    return granted;
  };

  const disableNotifications = async () => {
    if (!userId) return;

    const { updateNotificationSettings } = await import('../services/firebase');
    const { cancelAllNotifications } = await import('../services/notifications');

    // Cancel all scheduled notifications
    await cancelAllNotifications();

    // Update settings
    await updateNotificationSettings(userId, {
      enabled: false,
    });

    setIsRegistered(false);
  };

  return {
    isRegistered,
    permission,
    requestPermissions,
    disableNotifications,
    checkPermissions,
  };
}
