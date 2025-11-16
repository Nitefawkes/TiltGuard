// Custom React hooks for TiltGuard

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, UserStats } from '../types';
import { getUserProfile, getUserStats } from '../services/firebase';

/**
 * Hook to track authentication state
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for user profile
    const unsubscribe = onSnapshot(
      doc(db, 'users', uid),
      (doc) => {
        if (doc.exists()) {
          setProfile({ uid, ...doc.data() } as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user profile:', err);
        setError(err as Error);
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
    if (!uid) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for stats
    const unsubscribe = onSnapshot(
      doc(db, 'users', uid, 'stats', 'main'),
      (doc) => {
        if (doc.exists()) {
          setStats(doc.data() as UserStats);
        } else {
          setStats(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user stats:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const refresh = async () => {
    if (!uid) return;
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
