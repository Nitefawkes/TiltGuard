// Tilt Detection Service - The Brain of TiltGuard
// Implements 3 core triggers: LOSS_STREAK, DRAWDOWN, SESSION

import {
  UserStats,
  UserSettings,
  TiltCheckResult,
  TriggerType,
  CoachTone,
  TriggerMessageParams,
  TILT_CONSTANTS,
} from '../types';

/**
 * Check if any tilt triggers are activated
 * This is the main function that runs before allowing a new bet
 */
export function checkTiltTriggers(
  stats: UserStats,
  settings: UserSettings
): TiltCheckResult {
  // Check LOSS_STREAK trigger (3+ consecutive losses)
  if (stats.consecutiveLosses >= TILT_CONSTANTS.LOSS_STREAK_THRESHOLD) {
    return {
      triggered: true,
      triggerType: 'LOSS_STREAK',
      message: getTriggerMessage({
        triggerType: 'LOSS_STREAK',
        tone: settings.coachTone,
        stats,
        settings,
      }),
    };
  }

  // Check DRAWDOWN trigger (80%+ of weekly loss limit)
  const drawdownThreshold =
    settings.weeklyLossLimit * TILT_CONSTANTS.DRAWDOWN_PCT_THRESHOLD;
  if (stats.weeklySpend >= drawdownThreshold) {
    return {
      triggered: true,
      triggerType: 'DRAWDOWN',
      message: getTriggerMessage({
        triggerType: 'DRAWDOWN',
        tone: settings.coachTone,
        stats,
        settings,
      }),
    };
  }

  // Check SESSION trigger (5+ bets in last 60 minutes)
  const now = Date.now();
  const sessionWindowMs = TILT_CONSTANTS.SESSION_WINDOW_MINUTES * 60 * 1000;

  if (
    stats.recentBetsWindowStart &&
    now - stats.recentBetsWindowStart < sessionWindowMs &&
    stats.recentBetsWindowCount >= TILT_CONSTANTS.SESSION_BET_COUNT_THRESHOLD
  ) {
    return {
      triggered: true,
      triggerType: 'SESSION',
      message: getTriggerMessage({
        triggerType: 'SESSION',
        tone: settings.coachTone,
        stats,
        settings,
      }),
    };
  }

  // No triggers activated
  return {
    triggered: false,
    triggerType: null,
    message: '',
  };
}

/**
 * Get the appropriate message for a trigger based on coach tone
 */
export function getTriggerMessage(params: TriggerMessageParams): string {
  const { triggerType, tone, stats, settings } = params;

  switch (triggerType) {
    case 'LOSS_STREAK':
      return getLossStreakMessage(tone, stats);

    case 'DRAWDOWN':
      return getDrawdownMessage(tone, stats, settings);

    case 'SESSION':
      return getSessionMessage(tone);

    default:
      return 'TiltGuard detected concerning betting behavior.';
  }
}

/**
 * LOSS_STREAK trigger messages
 */
function getLossStreakMessage(tone: CoachTone, stats?: UserStats): string {
  const count = stats?.consecutiveLosses || 3;

  switch (tone) {
    case 'calm':
      return `You've lost ${count} in a row. Take a breath — the book isn't going anywhere.`;

    case 'firm':
      return `${count} losses straight. Stop. This is exactly when bad decisions happen.`;

    case 'clinical':
      return `Consecutive loss streak detected (${count}). Historical data shows increased risk of tilt behavior.`;

    default:
      return `You've lost ${count} bets in a row. Let's take a moment before continuing.`;
  }
}

/**
 * DRAWDOWN trigger messages
 */
function getDrawdownMessage(
  tone: CoachTone,
  stats?: UserStats,
  settings?: UserSettings
): string {
  const weeklySpend = stats?.weeklySpend || 0;
  const weeklyLimit = settings?.weeklyLossLimit || 0;
  const pct = weeklyLimit > 0 ? Math.round((weeklySpend / weeklyLimit) * 100) : 80;

  switch (tone) {
    case 'calm':
      return `You're at ${pct}% of the $${weeklyLimit} weekly limit you set for yourself. Is this still aligned with your goals?`;

    case 'firm':
      return `You told yourself your weekly limit was $${weeklyLimit}. You're at ${pct}%. Time to honor that commitment.`;

    case 'clinical':
      return `Weekly spend: $${weeklySpend.toFixed(2)} of $${weeklyLimit} limit (${pct}%). Threshold breach detected.`;

    default:
      return `You're approaching your weekly loss limit of $${weeklyLimit}.`;
  }
}

/**
 * SESSION trigger messages
 */
function getSessionMessage(tone: CoachTone): string {
  const count = TILT_CONSTANTS.SESSION_BET_COUNT_THRESHOLD;
  const minutes = TILT_CONSTANTS.SESSION_WINDOW_MINUTES;

  switch (tone) {
    case 'calm':
      return `That's ${count} bets in ${minutes} minutes. Maybe step away for a bit?`;

    case 'firm':
      return `${count} bets in ${minutes} minutes. You're firing too fast. Slow down.`;

    case 'clinical':
      return `High-velocity betting detected: ${count} bets in ${minutes}-minute window. Pattern indicates emotional decision-making.`;

    default:
      return `You've placed ${count} bets in the last ${minutes} minutes.`;
  }
}

/**
 * Check if user is currently in cool-off period
 */
export function isCoolOffActive(stats: UserStats): boolean {
  if (!stats.coolOffUntil) return false;
  return Date.now() < stats.coolOffUntil;
}

/**
 * Get remaining cool-off time in human-readable format
 */
export function getCoolOffRemaining(stats: UserStats): string {
  if (!stats.coolOffUntil) return '';

  const remaining = stats.coolOffUntil - Date.now();
  if (remaining <= 0) return '';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0
      ? `${days}d ${remainingHours}h`
      : `${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Calculate cool-off end time based on duration
 */
export function calculateCoolOffEnd(duration: '1h' | '24h' | '3d'): number {
  const now = Date.now();

  switch (duration) {
    case '1h':
      return now + TILT_CONSTANTS.COOL_OFF_1H;
    case '24h':
      return now + TILT_CONSTANTS.COOL_OFF_24H;
    case '3d':
      return now + TILT_CONSTANTS.COOL_OFF_3D;
    default:
      return now + TILT_CONSTANTS.COOL_OFF_1H;
  }
}
