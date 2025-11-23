// Firebase service layer - Database operations for TiltGuard

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  UserProfile,
  UserSettings,
  UserStats,
  Bet,
  BetInput,
  BetResult,
  PERIOD_DURATION_MS,
  TILT_CONSTANTS,
} from '../types';

// ==================== USER OPERATIONS ====================

/**
 * Create a new user profile with initial settings
 */
export async function createUserProfile(
  uid: string,
  email: string,
  settings: Omit<UserSettings, 'periodType' | 'coachTone' | 'periodStart' | 'notifications'>
): Promise<void> {
  const now = Date.now();

  const userProfile: Omit<UserProfile, 'uid'> = {
    email,
    createdAt: now,
    plan: 'free',
    settings: {
      ...settings,
      periodStart: now,
      periodType: 'week',
      coachTone: 'calm',
      notifications: {
        enabled: false,
        tiltWarnings: true,
        coolOffReminders: true,
        budgetAlerts: true,
        weeklySummary: true,
        milestones: true,
        dailyReminder: false,
        dailyReminderTime: 20,
        pushToken: null,
      },
    },
  };

  // Create user profile
  await setDoc(doc(db, 'users', uid), userProfile);

  // Initialize stats document
  const initialStats: UserStats = {
    totalPL: 0,
    totalWagered: 0,
    consecutiveLosses: 0,
    weeklySpend: 0,
    periodStart: now,
    lastBetAt: null,
    recentBetsWindowStart: null,
    recentBetsWindowCount: 0,
    coolOffUntil: null,
  };

  await setDoc(doc(db, 'users', uid, 'stats', 'main'), initialStats);
}

/**
 * Get user profile
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));

  if (!userDoc.exists()) return null;

  return {
    uid,
    ...userDoc.data(),
  } as UserProfile;
}

/**
 * Get user stats
 */
export async function getUserStats(uid: string): Promise<UserStats | null> {
  const statsDoc = await getDoc(doc(db, 'users', uid, 'stats', 'main'));

  if (!statsDoc.exists()) return null;

  return statsDoc.data() as UserStats;
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  uid: string,
  updates: Partial<UserSettings>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const currentSettings = userDoc.data().settings as UserSettings;
  const updatedSettings = { ...currentSettings, ...updates };

  await updateDoc(userRef, { settings: updatedSettings });
}

/**
 * Update user plan (free/pro)
 */
export async function updateUserPlan(
  uid: string,
  plan: 'free' | 'pro'
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { plan });
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  uid: string,
  notificationUpdates: Partial<import('../types').NotificationSettings>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const currentSettings = userDoc.data().settings as UserSettings;
  const updatedNotifications = {
    ...currentSettings.notifications,
    ...notificationUpdates,
  };

  await updateDoc(userRef, {
    'settings.notifications': updatedNotifications,
  });
}

// ==================== BET OPERATIONS ====================

/**
 * Add a new bet
 */
export async function addBet(uid: string, betInput: BetInput): Promise<string> {
  const now = Date.now();

  const bet: Omit<Bet, 'id'> = {
    ...betInput,
    status: 'active',
    result: null,
    createdAt: now,
    settledAt: null,
  };

  const betRef = await addDoc(collection(db, 'users', uid, 'bets'), bet);

  // Update session tracking in stats
  await updateSessionTracking(uid);

  return betRef.id;
}

/**
 * Settle a bet
 */
export async function settleBet(
  uid: string,
  betId: string,
  result: BetResult
): Promise<void> {
  if (!result) {
    throw new Error('Result must be win, loss, or push');
  }

  const betRef = doc(db, 'users', uid, 'bets', betId);
  const betDoc = await getDoc(betRef);

  if (!betDoc.exists()) {
    throw new Error('Bet not found');
  }

  const bet = { id: betId, ...betDoc.data() } as Bet;
  const now = Date.now();

  // Update bet
  await updateDoc(betRef, {
    status: 'settled',
    result,
    settledAt: now,
  });

  // Update stats based on result
  await updateStatsAfterSettle(uid, bet, result);
}

/**
 * Get recent bets for a user
 */
export async function getRecentBets(uid: string, limitCount = 20): Promise<Bet[]> {
  const betsQuery = query(
    collection(db, 'users', uid, 'bets'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(betsQuery);
  return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data(),
  })) as Bet[];
}

/**
 * Get all settled bets (for patterns analysis)
 */
export async function getAllSettledBets(uid: string): Promise<Bet[]> {
  const betsQuery = query(
    collection(db, 'users', uid, 'bets'),
    orderBy('settledAt', 'desc')
  );

  const snapshot = await getDocs(betsQuery);
  return snapshot.docs
    .map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((bet: any) => bet.status === 'settled') as Bet[];
}

// ==================== STATS OPERATIONS ====================

/**
 * Update session tracking (for SESSION trigger)
 */
async function updateSessionTracking(uid: string): Promise<void> {
  const statsRef = doc(db, 'users', uid, 'stats', 'main');
  const statsDoc = await getDoc(statsRef);

  if (!statsDoc.exists()) return;

  const stats = statsDoc.data() as UserStats;
  const now = Date.now();
  const sessionWindowMs = TILT_CONSTANTS.SESSION_WINDOW_MINUTES * 60 * 1000;

  let newWindowStart = stats.recentBetsWindowStart || now;
  let newWindowCount = stats.recentBetsWindowCount || 0;

  // Check if we're still in the same window
  if (stats.recentBetsWindowStart && now - stats.recentBetsWindowStart < sessionWindowMs) {
    // Same window, increment count
    newWindowCount += 1;
  } else {
    // New window
    newWindowStart = now;
    newWindowCount = 1;
  }

  await updateDoc(statsRef, {
    recentBetsWindowStart: newWindowStart,
    recentBetsWindowCount: newWindowCount,
    lastBetAt: now,
  });
}

/**
 * Update stats after settling a bet
 */
async function updateStatsAfterSettle(
  uid: string,
  bet: Bet,
  result: BetResult
): Promise<void> {
  const statsRef = doc(db, 'users', uid, 'stats', 'main');
  const statsDoc = await getDoc(statsRef);

  if (!statsDoc.exists()) return;

  const stats = statsDoc.data() as UserStats;
  const now = Date.now();

  // Check if we need to reset weekly period
  const needsWeeklyReset = now - stats.periodStart >= PERIOD_DURATION_MS;

  // Calculate P/L change
  const plChange = calculatePLChange(bet.amount, bet.odds, result);

  // Update consecutive losses
  let newConsecutiveLosses = stats.consecutiveLosses;
  if (result === 'loss') {
    newConsecutiveLosses += 1;
  } else if (result === 'win' || result === 'push') {
    newConsecutiveLosses = 0;
  }

  // Update weekly spend (only losses count)
  let newWeeklySpend = needsWeeklyReset ? 0 : stats.weeklySpend;
  if (result === 'loss') {
    newWeeklySpend += bet.amount;
  }

  // Apply updates
  await updateDoc(statsRef, {
    totalPL: stats.totalPL + plChange,
    totalWagered: stats.totalWagered + bet.amount,
    consecutiveLosses: newConsecutiveLosses,
    weeklySpend: newWeeklySpend,
    periodStart: needsWeeklyReset ? now : stats.periodStart,
  });
}

/**
 * Calculate P/L change based on bet result
 */
function calculatePLChange(amount: number, odds: number, result: BetResult): number {
  if (result === 'push') return 0;
  if (result === 'loss') return -amount;

  // Win: calculate profit based on American odds
  if (odds > 0) {
    // Positive odds (e.g., +150)
    return (amount * odds) / 100;
  } else {
    // Negative odds (e.g., -110)
    return (amount * 100) / Math.abs(odds);
  }
}

/**
 * Set cool-off period
 */
export async function setCoolOff(
  uid: string,
  coolOffUntil: number | null
): Promise<void> {
  const statsRef = doc(db, 'users', uid, 'stats', 'main');
  await updateDoc(statsRef, { coolOffUntil });
}

/**
 * Cancel cool-off period
 */
export async function cancelCoolOff(uid: string): Promise<void> {
  await setCoolOff(uid, null);
}

/**
 * Check and reset weekly period if needed
 */
export async function checkAndResetPeriod(uid: string): Promise<void> {
  const statsRef = doc(db, 'users', uid, 'stats', 'main');
  const statsDoc = await getDoc(statsRef);

  if (!statsDoc.exists()) return;

  const stats = statsDoc.data() as UserStats;
  const now = Date.now();

  if (now - stats.periodStart >= PERIOD_DURATION_MS) {
    await updateDoc(statsRef, {
      weeklySpend: 0,
      periodStart: now,
    });
  }
}
