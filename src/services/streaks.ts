// Streaks and achievements service for positive reinforcement
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats } from '../types';

const STREAKS_KEY = '@tiltguard_streaks';
const ACHIEVEMENTS_KEY = '@tiltguard_achievements';

export interface Streaks {
  responsibleBetting: StreakData; // Days within budget + no tilt warnings
  budgetCompliance: StreakData; // Days under weekly budget
  noTilt: StreakData; // Days without tilt warnings
  sessionJournal: StreakData; // Consecutive sessions with journal entries
  lastUpdated: number;
}

export interface StreakData {
  current: number;
  best: number;
  lastIncrementDate: string; // YYYY-MM-DD format
}

export type AchievementId =
  | 'first_bet'
  | 'week_responsible'
  | 'month_responsible'
  | 'hundred_bets'
  | 'profitable_week'
  | 'profitable_month'
  | 'took_voluntary_break'
  | 'ten_journals'
  | 'budget_month'
  | 'explored_analytics'
  | 'explored_feeds'
  | 'set_limits'
  | 'three_day_notilt'
  | 'week_notilt'
  | 'used_all_features';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
  progress?: number; // 0-100 percentage
  target?: number; // Target value for progress-based achievements
}

export interface AchievementUnlock {
  achievement: Achievement;
  isNew: boolean; // True if just unlocked
}

/**
 * Get current streaks
 */
export async function getStreaks(): Promise<Streaks> {
  try {
    const data = await AsyncStorage.getItem(STREAKS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error getting streaks:', error);
  }

  // Return default streaks
  return {
    responsibleBetting: { current: 0, best: 0, lastIncrementDate: '' },
    budgetCompliance: { current: 0, best: 0, lastIncrementDate: '' },
    noTilt: { current: 0, best: 0, lastIncrementDate: '' },
    sessionJournal: { current: 0, best: 0, lastIncrementDate: '' },
    lastUpdated: Date.now(),
  };
}

/**
 * Save streaks
 */
async function saveStreaks(streaks: Streaks): Promise<void> {
  try {
    streaks.lastUpdated = Date.now();
    await AsyncStorage.setItem(STREAKS_KEY, JSON.stringify(streaks));
  } catch (error) {
    console.error('Error saving streaks:', error);
  }
}

/**
 * Update streaks based on daily activity
 */
export async function updateDailyStreaks(
  stats: UserStats,
  settings: { weeklyBudget: number; weeklyLossLimit: number },
  hadTiltWarning: boolean
): Promise<Streaks> {
  const streaks = await getStreaks();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Check if we need to update (only once per day)
  if (streaks.responsibleBetting.lastIncrementDate === today) {
    return streaks; // Already updated today
  }

  // Check if user stayed within budget
  const withinBudget = stats.weeklySpend <= settings.weeklyLossLimit;

  // Update budget compliance streak
  if (withinBudget) {
    incrementStreak(streaks.budgetCompliance, today);
  } else {
    resetStreak(streaks.budgetCompliance);
  }

  // Update no-tilt streak
  if (!hadTiltWarning) {
    incrementStreak(streaks.noTilt, today);
  } else {
    resetStreak(streaks.noTilt);
  }

  // Update responsible betting streak (within budget AND no tilt)
  if (withinBudget && !hadTiltWarning) {
    incrementStreak(streaks.responsibleBetting, today);
  } else {
    resetStreak(streaks.responsibleBetting);
  }

  await saveStreaks(streaks);
  return streaks;
}

/**
 * Update session journal streak
 */
export async function updateJournalStreak(hasJournal: boolean): Promise<Streaks> {
  const streaks = await getStreaks();
  const today = new Date().toISOString().split('T')[0];

  if (hasJournal) {
    incrementStreak(streaks.sessionJournal, today);
  } else {
    // Don't reset immediately, only after missed sessions
    // This is updated per session, not per day
  }

  await saveStreaks(streaks);
  return streaks;
}

/**
 * Helper to increment streak
 */
function incrementStreak(streak: StreakData, today: string): void {
  const yesterday = getYesterdayDate();

  // Check if this is continuation of streak or new start
  if (streak.lastIncrementDate === yesterday || streak.lastIncrementDate === today) {
    streak.current += streak.lastIncrementDate === yesterday ? 1 : 0;
  } else if (!streak.lastIncrementDate) {
    // First time
    streak.current = 1;
  } else {
    // Streak broken, start over
    streak.current = 1;
  }

  streak.lastIncrementDate = today;

  // Update best
  if (streak.current > streak.best) {
    streak.best = streak.current;
  }
}

/**
 * Helper to reset streak
 */
function resetStreak(streak: StreakData): void {
  streak.current = 0;
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Get all achievements
 */
export async function getAchievements(): Promise<Achievement[]> {
  try {
    const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error getting achievements:', error);
  }

  // Return default achievements
  return getDefaultAchievements();
}

/**
 * Get default achievements
 */
function getDefaultAchievements(): Achievement[] {
  return [
    {
      id: 'first_bet',
      title: 'Getting Started',
      description: 'Track your first bet',
      icon: '🎯',
      unlockedAt: null,
    },
    {
      id: 'set_limits',
      title: 'Setting Boundaries',
      description: 'Set your weekly budget and loss limits',
      icon: '🛡️',
      unlockedAt: null,
    },
    {
      id: 'week_responsible',
      title: '7-Day Streak',
      description: 'Stay within budget with no tilt warnings for 7 days',
      icon: '🔥',
      unlockedAt: null,
    },
    {
      id: 'month_responsible',
      title: '30-Day Champion',
      description: 'Maintain responsible betting for 30 days',
      icon: '🏆',
      unlockedAt: null,
    },
    {
      id: 'three_day_notilt',
      title: 'Cool & Collected',
      description: '3 days without tilt warnings',
      icon: '🧘',
      unlockedAt: null,
    },
    {
      id: 'week_notilt',
      title: 'Tilt Master',
      description: '7 days without tilt warnings',
      icon: '🎓',
      unlockedAt: null,
    },
    {
      id: 'ten_journals',
      title: 'Reflective Bettor',
      description: 'Journal 10 betting sessions',
      icon: '📝',
      unlockedAt: null,
    },
    {
      id: 'took_voluntary_break',
      title: 'Self-Aware',
      description: 'Take a voluntary cool-off break',
      icon: '💆',
      unlockedAt: null,
    },
    {
      id: 'hundred_bets',
      title: 'Dedicated Tracker',
      description: 'Track 100 bets in TiltGuard',
      icon: '💯',
      unlockedAt: null,
    },
    {
      id: 'profitable_week',
      title: 'Weekly Winner',
      description: 'Finish a week with positive P/L',
      icon: '📈',
      unlockedAt: null,
    },
    {
      id: 'profitable_month',
      title: 'Monthly Master',
      description: 'Finish a month with positive P/L',
      icon: '💰',
      unlockedAt: null,
    },
    {
      id: 'budget_month',
      title: 'Budget Boss',
      description: 'Stay under budget for 4 weeks straight',
      icon: '💎',
      unlockedAt: null,
    },
    {
      id: 'explored_analytics',
      title: 'Data Driven',
      description: 'Review your betting patterns and analytics',
      icon: '📊',
      unlockedAt: null,
    },
    {
      id: 'explored_feeds',
      title: 'Knowledge Seeker',
      description: 'Browse responsible gambling resources',
      icon: '📚',
      unlockedAt: null,
    },
    {
      id: 'used_all_features',
      title: 'TiltGuard Pro',
      description: 'Explore all TiltGuard features',
      icon: '⭐',
      unlockedAt: null,
    },
  ];
}

/**
 * Save achievements
 */
async function saveAchievements(achievements: Achievement[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  } catch (error) {
    console.error('Error saving achievements:', error);
  }
}

/**
 * Check and unlock achievements
 */
export async function checkAchievements(context: {
  totalBets?: number;
  streaks?: Streaks;
  totalPL?: number;
  weeklyPL?: number;
  monthlyPL?: number;
  journalCount?: number;
  tookVoluntaryBreak?: boolean;
  visitedAnalytics?: boolean;
  visitedFeeds?: boolean;
  hasSetLimits?: boolean;
}): Promise<AchievementUnlock[]> {
  const achievements = await getAchievements();
  const unlocked: AchievementUnlock[] = [];

  // Check each achievement
  for (const achievement of achievements) {
    // Skip already unlocked
    if (achievement.unlockedAt) {
      unlocked.push({ achievement, isNew: false });
      continue;
    }

    let shouldUnlock = false;

    switch (achievement.id) {
      case 'first_bet':
        shouldUnlock = (context.totalBets ?? 0) >= 1;
        break;

      case 'set_limits':
        shouldUnlock = context.hasSetLimits ?? false;
        break;

      case 'week_responsible':
        shouldUnlock = (context.streaks?.responsibleBetting.current ?? 0) >= 7;
        break;

      case 'month_responsible':
        shouldUnlock = (context.streaks?.responsibleBetting.current ?? 0) >= 30;
        break;

      case 'three_day_notilt':
        shouldUnlock = (context.streaks?.noTilt.current ?? 0) >= 3;
        break;

      case 'week_notilt':
        shouldUnlock = (context.streaks?.noTilt.current ?? 0) >= 7;
        break;

      case 'ten_journals':
        shouldUnlock = (context.journalCount ?? 0) >= 10;
        break;

      case 'took_voluntary_break':
        shouldUnlock = context.tookVoluntaryBreak ?? false;
        break;

      case 'hundred_bets':
        shouldUnlock = (context.totalBets ?? 0) >= 100;
        break;

      case 'profitable_week':
        shouldUnlock = (context.weeklyPL ?? 0) > 0;
        break;

      case 'profitable_month':
        shouldUnlock = (context.monthlyPL ?? 0) > 0;
        break;

      case 'budget_month':
        shouldUnlock = (context.streaks?.budgetCompliance.current ?? 0) >= 28;
        break;

      case 'explored_analytics':
        shouldUnlock = context.visitedAnalytics ?? false;
        break;

      case 'explored_feeds':
        shouldUnlock = context.visitedFeeds ?? false;
        break;

      case 'used_all_features':
        shouldUnlock =
          (context.visitedAnalytics ?? false) &&
          (context.visitedFeeds ?? false) &&
          (context.journalCount ?? 0) >= 1 &&
          (context.totalBets ?? 0) >= 10;
        break;
    }

    if (shouldUnlock) {
      achievement.unlockedAt = Date.now();
      unlocked.push({ achievement, isNew: true });
    }
  }

  // Save updated achievements
  await saveAchievements(achievements);

  return unlocked;
}

/**
 * Get achievement statistics
 */
export async function getAchievementStats(): Promise<{
  total: number;
  unlocked: number;
  percentage: number;
}> {
  const achievements = await getAchievements();
  const total = achievements.length;
  const unlocked = achievements.filter((a) => a.unlockedAt !== null).length;
  const percentage = total > 0 ? (unlocked / total) * 100 : 0;

  return { total, unlocked, percentage };
}

/**
 * Manually unlock achievement (for specific events)
 */
export async function unlockAchievement(
  achievementId: AchievementId
): Promise<Achievement | null> {
  const achievements = await getAchievements();
  const achievement = achievements.find((a) => a.id === achievementId);

  if (achievement && !achievement.unlockedAt) {
    achievement.unlockedAt = Date.now();
    await saveAchievements(achievements);
    return achievement;
  }

  return null;
}
