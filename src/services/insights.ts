// Smart Insights Engine - Personalized betting pattern analysis

import { Bet, UserStats } from '../types';

export interface Insight {
  id: string;
  type: 'positive' | 'warning' | 'neutral' | 'achievement';
  title: string;
  message: string;
  icon?: string;
  priority: number; // Higher = more important
}

/**
 * Generate personalized insights from betting data
 */
export function generateInsights(
  bets: Bet[],
  stats: UserStats
): Insight[] {
  const insights: Insight[] = [];

  // Only analyze if we have enough data
  if (bets.length < 5) {
    return [
      {
        id: 'not-enough-data',
        type: 'neutral',
        title: 'Getting Started',
        message: 'Track more bets to unlock personalized insights and patterns.',
        priority: 1,
      },
    ];
  }

  const settledBets = bets.filter((b) => b.status === 'settled');
  if (settledBets.length === 0) return insights;

  // Analyze day of week patterns
  const dayOfWeekInsight = analyzeDayOfWeek(settledBets);
  if (dayOfWeekInsight) insights.push(dayOfWeekInsight);

  // Analyze sport performance
  const sportInsight = analyzeSportPerformance(settledBets);
  if (sportInsight) insights.push(sportInsight);

  // Analyze bet sizing patterns
  const betSizingInsight = analyzeBetSizing(settledBets);
  if (betSizingInsight) insights.push(betSizingInsight);

  // Analyze time of day patterns
  const timeOfDayInsight = analyzeTimeOfDay(settledBets);
  if (timeOfDayInsight) insights.push(timeOfDayInsight);

  // Analyze improvement trends
  const improvementInsight = analyzeImprovement(settledBets, stats);
  if (improvementInsight) insights.push(improvementInsight);

  // Analyze losing streaks
  const streakInsight = analyzeStreaks(stats);
  if (streakInsight) insights.push(streakInsight);

  // Analyze weekly performance
  const weeklyInsight = analyzeWeeklyPerformance(stats);
  if (weeklyInsight) insights.push(weeklyInsight);

  // Sort by priority (highest first)
  return insights.sort((a, b) => b.priority - a.priority);
}

/**
 * Analyze betting patterns by day of week
 */
function analyzeDayOfWeek(bets: Bet[]): Insight | null {
  const dayBets: { [key: number]: { count: number; amount: number } } = {};

  bets.forEach((bet) => {
    const date = new Date(
      typeof bet.createdAt === 'number'
        ? bet.createdAt
        : bet.createdAt.toMillis()
    );
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday

    if (!dayBets[day]) {
      dayBets[day] = { count: 0, amount: 0 };
    }
    dayBets[day].count++;
    dayBets[day].amount += bet.amount;
  });

  // Find the day with most betting activity
  let maxDay = 0;
  let maxCount = 0;
  Object.entries(dayBets).forEach(([day, data]) => {
    if (data.count > maxCount) {
      maxCount = data.count;
      maxDay = parseInt(day);
    }
  });

  const avgCount = bets.length / 7;
  const percentageAboveAvg = ((maxCount - avgCount) / avgCount) * 100;

  if (percentageAboveAvg > 30) {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return {
      id: 'day-of-week',
      type: 'warning',
      title: `${dayNames[maxDay]} Pattern Detected`,
      message: `You bet ${percentageAboveAvg.toFixed(0)}% more on ${
        dayNames[maxDay]
      }s. Consider setting extra guardrails for this day.`,
      priority: 7,
    };
  }

  return null;
}

/**
 * Analyze performance by sport
 */
function analyzeSportPerformance(bets: Bet[]): Insight | null {
  const sportStats: {
    [key: string]: { wins: number; total: number; profit: number };
  } = {};

  bets.forEach((bet) => {
    if (!sportStats[bet.sport]) {
      sportStats[bet.sport] = { wins: 0, total: 0, profit: 0 };
    }
    sportStats[bet.sport].total++;

    if (bet.result === 'won') {
      sportStats[bet.sport].wins++;
      const payout = bet.odds > 0 ? bet.amount * (bet.odds / 100) : bet.amount * (-100 / bet.odds);
      sportStats[bet.sport].profit += payout;
    } else if (bet.result === 'lost') {
      sportStats[bet.sport].profit -= bet.amount;
    }
  });

  // Find best and worst performing sports
  let bestSport = '';
  let bestWinRate = 0;
  let worstSport = '';
  let worstWinRate = 100;

  Object.entries(sportStats).forEach(([sport, stats]) => {
    if (stats.total < 3) return; // Need at least 3 bets

    const winRate = (stats.wins / stats.total) * 100;

    if (winRate > bestWinRate) {
      bestWinRate = winRate;
      bestSport = sport;
    }

    if (winRate < worstWinRate) {
      worstWinRate = winRate;
      worstSport = sport;
    }
  });

  if (bestSport && worstSport && bestWinRate - worstWinRate > 15) {
    return {
      id: 'sport-performance',
      type: 'positive',
      title: 'Sport Performance Gap',
      message: `Your ${bestSport} win rate (${bestWinRate.toFixed(
        0
      )}%) is ${(bestWinRate - worstWinRate).toFixed(
        0
      )}% higher than ${worstSport}. Focus on your strengths!`,
      priority: 8,
    };
  }

  return null;
}

/**
 * Analyze bet sizing patterns
 */
function analyzeBetSizing(bets: Bet[]): Insight | null {
  const amounts = bets.map((b) => b.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

  // Check for increasing bet sizes (chasing)
  const recentBets = bets.slice(-10);
  const recentAvg =
    recentBets.reduce((a, b) => a + b.amount, 0) / recentBets.length;

  if (recentAvg > avgAmount * 1.5) {
    return {
      id: 'bet-sizing',
      type: 'warning',
      title: 'Bet Size Increasing',
      message: `Your recent average bet ($${recentAvg.toFixed(
        2
      )}) is ${(((recentAvg - avgAmount) / avgAmount) * 100).toFixed(
        0
      )}% higher than usual. This could indicate chasing losses.`,
      priority: 9,
    };
  }

  return null;
}

/**
 * Analyze betting patterns by time of day
 */
function analyzeTimeOfDay(bets: Bet[]): Insight | null {
  const hourBets: { [key: number]: number } = {};

  bets.forEach((bet) => {
    const date = new Date(
      typeof bet.createdAt === 'number'
        ? bet.createdAt
        : bet.createdAt.toMillis()
    );
    const hour = date.getHours();
    hourBets[hour] = (hourBets[hour] || 0) + 1;
  });

  // Find peak betting hour
  let peakHour = 0;
  let peakCount = 0;
  Object.entries(hourBets).forEach(([hour, count]) => {
    if (count > peakCount) {
      peakCount = count;
      peakHour = parseInt(hour);
    }
  });

  // Check if peak is late night (11pm - 3am)
  if (
    (peakHour >= 23 || peakHour <= 3) &&
    peakCount > bets.length * 0.3
  ) {
    const timeStr =
      peakHour === 0
        ? '12 AM'
        : peakHour > 12
        ? `${peakHour - 12} PM`
        : `${peakHour} AM`;

    return {
      id: 'time-of-day',
      type: 'warning',
      title: 'Late Night Betting Pattern',
      message: `${((peakCount / bets.length) * 100).toFixed(
        0
      )}% of your bets are around ${timeStr}. Late-night decisions may be more impulsive.`,
      priority: 6,
    };
  }

  return null;
}

/**
 * Analyze improvement over time
 */
function analyzeImprovement(bets: Bet[], stats: UserStats): Insight | null {
  if (bets.length < 20) return null;

  // Split bets into first half and second half
  const midpoint = Math.floor(bets.length / 2);
  const firstHalf = bets.slice(0, midpoint).filter((b) => b.status === 'settled');
  const secondHalf = bets.slice(midpoint).filter((b) => b.status === 'settled');

  const firstWinRate =
    (firstHalf.filter((b) => b.result === 'won').length / firstHalf.length) * 100;
  const secondWinRate =
    (secondHalf.filter((b) => b.result === 'won').length / secondHalf.length) *
    100;

  const improvement = secondWinRate - firstWinRate;

  if (improvement > 10) {
    return {
      id: 'improvement',
      type: 'achievement',
      title: 'Performance Improving!',
      message: `Your win rate improved by ${improvement.toFixed(
        1
      )}% in recent bets. Keep up the disciplined approach!`,
      priority: 10,
    };
  } else if (improvement < -10) {
    return {
      id: 'decline',
      type: 'warning',
      title: 'Performance Declining',
      message: `Your win rate dropped ${Math.abs(improvement).toFixed(
        1
      )}% recently. Consider taking a break or reviewing your strategy.`,
      priority: 9,
    };
  }

  return null;
}

/**
 * Analyze losing streaks
 */
function analyzeStreaks(stats: UserStats): Insight | null {
  if (stats.consecutiveLosses === 0) {
    return {
      id: 'no-streak',
      type: 'positive',
      title: 'Breaking the Streak!',
      message: "No active losing streak. You're maintaining good discipline.",
      priority: 5,
    };
  } else if (stats.consecutiveLosses >= 2) {
    return {
      id: 'streak-warning',
      type: 'warning',
      title: `${stats.consecutiveLosses} Losses in a Row`,
      message:
        'Consider taking a break. Chasing losses often leads to bigger problems.',
      priority: 10,
    };
  }

  return null;
}

/**
 * Analyze weekly performance vs budget
 */
function analyzeWeeklyPerformance(stats: UserStats): Insight | null {
  const weeklyNetPL = stats.weeklyWins - stats.weeklyLosses;
  const roi = stats.weeklySpend > 0 ? (weeklyNetPL / stats.weeklySpend) * 100 : 0;

  if (weeklyNetPL > 0) {
    return {
      id: 'weekly-positive',
      type: 'achievement',
      title: 'Profitable Week!',
      message: `You're up $${weeklyNetPL.toFixed(2)} this week (${roi.toFixed(
        1
      )}% ROI). Great job staying disciplined!`,
      priority: 8,
    };
  } else if (weeklyNetPL < -stats.weeklySpend * 0.5) {
    return {
      id: 'weekly-negative',
      type: 'warning',
      title: 'Rough Week',
      message: `Down $${Math.abs(weeklyNetPL).toFixed(
        2
      )} this week. Consider reducing bet sizes or taking a break.`,
      priority: 9,
    };
  }

  return null;
}
