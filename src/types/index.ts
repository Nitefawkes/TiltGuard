// TypeScript type definitions for TiltGuard

// ==================== CORE TYPES ====================

export type UserPlan = 'free' | 'pro';
export type CoachTone = 'calm' | 'firm' | 'clinical';
export type BetStatus = 'active' | 'settled';
export type BetResult = 'win' | 'loss' | 'push' | null;
export type TriggerType = 'LOSS_STREAK' | 'DRAWDOWN' | 'SESSION';

// ==================== USER TYPES ====================

export interface UserProfile {
  uid: string;
  email: string;
  createdAt: number;
  plan: UserPlan;
  settings: UserSettings;
}

export interface UserSettings {
  weeklyBudget: number;
  weeklyLossLimit: number;
  periodStart: number; // timestamp
  periodType: 'week';
  coachTone: CoachTone;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  enabled: boolean;
  tiltWarnings: boolean;
  coolOffReminders: boolean;
  budgetAlerts: boolean;
  weeklySummary: boolean;
  milestones: boolean;
  dailyReminder: boolean;
  dailyReminderTime: number; // Hour of day (0-23)
  pushToken: string | null;
}

// ==================== STATS TYPES ====================

export interface UserStats {
  totalPL: number;
  totalWagered: number;
  consecutiveLosses: number;
  weeklySpend: number;
  periodStart: number; // timestamp
  lastBetAt: number | null;
  recentBetsWindowStart: number | null;
  recentBetsWindowCount: number;
  coolOffUntil: number | null; // timestamp
}

// ==================== BET TYPES ====================

export interface Bet {
  id: string;
  amount: number;
  odds: number; // American odds (e.g., -110, +150)
  sport: string;
  notes: string;
  status: BetStatus;
  result: BetResult;
  createdAt: number; // timestamp
  settledAt: number | null;
}

export interface BetInput {
  amount: number;
  odds: number;
  sport: string;
  notes: string;
}

// ==================== TILT DETECTION TYPES ====================

export interface TiltCheckResult {
  triggered: boolean;
  triggerType: TriggerType | null;
  message: string;
}

export interface TriggerMessageParams {
  triggerType: TriggerType;
  tone: CoachTone;
  stats?: UserStats;
  settings?: UserSettings;
}

// ==================== PATTERNS TYPES ====================

export interface SportPattern {
  sport: string;
  totalPL: number;
  totalWagered: number;
  betCount: number;
  winRate: number;
}

export interface PatternsData {
  bestSport: SportPattern | null;
  worstSport: SportPattern | null;
  mostActiveDay: string | null;
  sportBreakdown: SportPattern[];
}

// ==================== CONSTANTS ====================

export const TILT_CONSTANTS = {
  // LOSS_STREAK trigger
  LOSS_STREAK_THRESHOLD: 3,

  // DRAWDOWN trigger
  DRAWDOWN_PCT_THRESHOLD: 0.8, // 80% of weekly loss limit

  // SESSION trigger
  SESSION_WINDOW_MINUTES: 60,
  SESSION_BET_COUNT_THRESHOLD: 5,

  // Cool-off durations (in milliseconds)
  COOL_OFF_1H: 60 * 60 * 1000,
  COOL_OFF_24H: 24 * 60 * 60 * 1000,
  COOL_OFF_3D: 3 * 24 * 60 * 60 * 1000,

  // Breather duration
  BREATHER_DURATION_SECONDS: 60,
};

export const SPORTS_OPTIONS = [
  'NFL',
  'NBA',
  'MLB',
  'NHL',
  'College Football',
  'College Basketball',
  'Soccer',
  'Tennis',
  'Golf',
  'MMA/Boxing',
  'Other',
];

export const PERIOD_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
