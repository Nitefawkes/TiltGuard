// Session tracking service for betting sessions
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bet, UserStats } from '../types';

const SESSION_KEY = '@tiltguard_active_session';
const SESSION_HISTORY_KEY = '@tiltguard_session_history';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface BettingSession {
  id: string;
  startTime: number;
  endTime: number | null;
  bets: Bet[];
  totalWagered: number;
  totalPL: number;
  tiltWarnings: number;
  highestStreak: number; // Highest win or loss streak during session
  isActive: boolean;
  journalEntry?: string;
}

export interface SessionSummary {
  session: BettingSession;
  insights: SessionInsight[];
  comparison: {
    betterThanAverage: boolean;
    averageSessionPL: number;
    averageSessionBets: number;
  };
}

export interface SessionInsight {
  type: 'positive' | 'warning' | 'neutral';
  icon: string;
  message: string;
}

/**
 * Get active session if exists and not timed out
 */
export async function getActiveSession(): Promise<BettingSession | null> {
  try {
    const sessionData = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;

    const session: BettingSession = JSON.parse(sessionData);

    // Check if session timed out
    const lastBetTime =
      session.bets.length > 0
        ? Math.max(...session.bets.map((b) => b.createdAt))
        : session.startTime;
    const timeSinceLastBet = Date.now() - lastBetTime;

    if (timeSinceLastBet > SESSION_TIMEOUT_MS) {
      // Session timed out, end it automatically
      await endSession(session, true);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
}

/**
 * Start a new betting session
 */
export async function startSession(firstBet: Bet): Promise<BettingSession> {
  const session: BettingSession = {
    id: `session_${Date.now()}`,
    startTime: Date.now(),
    endTime: null,
    bets: [firstBet],
    totalWagered: firstBet.amount,
    totalPL: 0, // Will be calculated when bets settle
    tiltWarnings: 0,
    highestStreak: 0,
    isActive: true,
  };

  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error starting session:', error);
  }

  return session;
}

/**
 * Add bet to active session
 */
export async function addBetToSession(bet: Bet): Promise<BettingSession | null> {
  try {
    const session = await getActiveSession();

    if (!session) {
      // No active session, start new one
      return await startSession(bet);
    }

    // Add bet to session
    session.bets.push(bet);
    session.totalWagered += bet.amount;

    // Recalculate P/L from settled bets
    session.totalPL = calculateSessionPL(session.bets);

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('Error adding bet to session:', error);
    return null;
  }
}

/**
 * Update session when bet is settled
 */
export async function updateSessionOnBetSettle(
  betId: string,
  result: 'win' | 'loss' | 'push'
): Promise<BettingSession | null> {
  try {
    const session = await getActiveSession();
    if (!session) return null;

    // Find and update bet
    const betIndex = session.bets.findIndex((b) => b.id === betId);
    if (betIndex !== -1) {
      session.bets[betIndex].result = result;
      session.bets[betIndex].status = 'settled';
      session.bets[betIndex].settledAt = Date.now();
    }

    // Recalculate P/L
    session.totalPL = calculateSessionPL(session.bets);

    // Update highest streak
    const currentStreak = calculateCurrentStreak(session.bets);
    if (Math.abs(currentStreak) > Math.abs(session.highestStreak)) {
      session.highestStreak = currentStreak;
    }

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('Error updating session on settle:', error);
    return null;
  }
}

/**
 * Record tilt warning in session
 */
export async function recordTiltWarning(): Promise<void> {
  try {
    const session = await getActiveSession();
    if (!session) return;

    session.tiltWarnings += 1;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error recording tilt warning:', error);
  }
}

/**
 * End current session
 */
export async function endSession(
  session: BettingSession,
  autoEnded: boolean = false
): Promise<SessionSummary> {
  session.endTime = Date.now();
  session.isActive = false;

  try {
    // Save to session history
    const historyData = await AsyncStorage.getItem(SESSION_HISTORY_KEY);
    const history: BettingSession[] = historyData ? JSON.parse(historyData) : [];
    history.unshift(session); // Add to beginning

    // Keep last 50 sessions
    const trimmedHistory = history.slice(0, 50);
    await AsyncStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(trimmedHistory));

    // Clear active session
    await AsyncStorage.removeItem(SESSION_KEY);

    // Generate summary
    const summary = generateSessionSummary(session, trimmedHistory);
    return summary;
  } catch (error) {
    console.error('Error ending session:', error);
    throw error;
  }
}

/**
 * Manually end session with journal entry
 */
export async function endSessionWithJournal(
  journalEntry: string
): Promise<SessionSummary | null> {
  try {
    const session = await getActiveSession();
    if (!session) return null;

    session.journalEntry = journalEntry;
    return await endSession(session);
  } catch (error) {
    console.error('Error ending session with journal:', error);
    return null;
  }
}

/**
 * Get session history
 */
export async function getSessionHistory(limit: number = 10): Promise<BettingSession[]> {
  try {
    const historyData = await AsyncStorage.getItem(SESSION_HISTORY_KEY);
    if (!historyData) return [];

    const history: BettingSession[] = JSON.parse(historyData);
    return history.slice(0, limit);
  } catch (error) {
    console.error('Error getting session history:', error);
    return [];
  }
}

/**
 * Calculate P/L for session
 */
function calculateSessionPL(bets: Bet[]): number {
  return bets.reduce((total, bet) => {
    if (bet.status !== 'settled' || !bet.result) return total;

    if (bet.result === 'win') {
      const odds = bet.odds;
      const profit = odds > 0 ? (bet.amount * odds) / 100 : (bet.amount * 100) / Math.abs(odds);
      return total + profit;
    } else if (bet.result === 'loss') {
      return total - bet.amount;
    }
    // push = no change
    return total;
  }, 0);
}

/**
 * Calculate current streak (positive for wins, negative for losses)
 */
function calculateCurrentStreak(bets: Bet[]): number {
  const settledBets = bets
    .filter((b) => b.status === 'settled' && b.result && b.result !== 'push')
    .sort((a, b) => (b.settledAt || 0) - (a.settledAt || 0));

  if (settledBets.length === 0) return 0;

  let streak = 0;
  const lastResult = settledBets[0].result;

  for (const bet of settledBets) {
    if (bet.result === lastResult) {
      streak += lastResult === 'win' ? 1 : -1;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Generate session summary with insights
 */
function generateSessionSummary(
  session: BettingSession,
  history: BettingSession[]
): SessionSummary {
  const insights: SessionInsight[] = [];

  // Calculate session duration
  const durationMs = (session.endTime || Date.now()) - session.startTime;
  const durationMinutes = Math.round(durationMs / 60000);

  // P/L insights
  if (session.totalPL > 0) {
    insights.push({
      type: 'positive',
      icon: '✅',
      message: `Profitable session! You won $${session.totalPL.toFixed(2)}`,
    });
  } else if (session.totalPL < 0) {
    insights.push({
      type: 'warning',
      icon: '📉',
      message: `Session ended down $${Math.abs(session.totalPL).toFixed(2)}`,
    });
  } else {
    insights.push({
      type: 'neutral',
      icon: '➖',
      message: 'Break-even session',
    });
  }

  // Bet count insights
  if (session.bets.length === 1) {
    insights.push({
      type: 'positive',
      icon: '🎯',
      message: 'Single bet session - disciplined approach',
    });
  } else if (session.bets.length >= 5) {
    insights.push({
      type: 'warning',
      icon: '⚡',
      message: `${session.bets.length} bets in ${durationMinutes} minutes - watch your pace`,
    });
  }

  // Tilt warnings
  if (session.tiltWarnings === 0) {
    insights.push({
      type: 'positive',
      icon: '🧘',
      message: 'No tilt warnings - stayed in control',
    });
  } else {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      message: `${session.tiltWarnings} tilt warning${session.tiltWarnings > 1 ? 's' : ''} during session`,
    });
  }

  // Streak insights
  if (session.highestStreak >= 3) {
    insights.push({
      type: 'positive',
      icon: '🔥',
      message: `${session.highestStreak}-bet win streak!`,
    });
  } else if (session.highestStreak <= -3) {
    insights.push({
      type: 'warning',
      icon: '❄️',
      message: `${Math.abs(session.highestStreak)}-bet losing streak encountered`,
    });
  }

  // Calculate comparison to average
  const completedSessions = history.filter((s) => !s.isActive);
  const averageSessionPL =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + s.totalPL, 0) / completedSessions.length
      : 0;
  const averageSessionBets =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + s.bets.length, 0) / completedSessions.length
      : 0;

  const betterThanAverage = session.totalPL > averageSessionPL;

  // Comparison insight
  if (completedSessions.length >= 3) {
    if (betterThanAverage && session.totalPL > 0) {
      insights.push({
        type: 'positive',
        icon: '📈',
        message: 'Better than your average session!',
      });
    } else if (!betterThanAverage && session.totalPL < averageSessionPL) {
      insights.push({
        type: 'neutral',
        icon: '📊',
        message: 'Below your typical session performance',
      });
    }
  }

  return {
    session,
    insights,
    comparison: {
      betterThanAverage,
      averageSessionPL,
      averageSessionBets,
    },
  };
}

/**
 * Check if session should auto-end based on inactivity
 */
export async function checkSessionTimeout(): Promise<SessionSummary | null> {
  const session = await getActiveSession();
  if (!session) return null;

  const lastBetTime =
    session.bets.length > 0
      ? Math.max(...session.bets.map((b) => b.createdAt))
      : session.startTime;
  const timeSinceLastBet = Date.now() - lastBetTime;

  if (timeSinceLastBet > SESSION_TIMEOUT_MS) {
    return await endSession(session, true);
  }

  return null;
}
