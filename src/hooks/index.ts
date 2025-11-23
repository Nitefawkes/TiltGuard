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
