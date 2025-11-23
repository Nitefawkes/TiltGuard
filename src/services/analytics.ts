// Analytics calculation service for advanced charts and visualizations

import { Bet } from '../types';

export interface TimeSeriesData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export interface SportDistribution {
  sport: string;
  count: number;
  percentage: number;
  profit: number;
  color: string;
}

export interface DailyData {
  date: string;
  spend: number;
  wins: number;
  netPL: number;
  betCount: number;
}

export interface HourlyPattern {
  hour: number;
  betCount: number;
  avgAmount: number;
}

export interface DayOfWeekPattern {
  day: string;
  betCount: number;
  winRate: number;
  avgAmount: number;
}

/**
 * Calculate daily spend and wins over time
 */
export function calculateDailyTimeSeries(
  bets: Bet[],
  days: number = 30
): DailyData[] {
  const settledBets = bets.filter((b) => b.status === 'settled');
  if (settledBets.length === 0) return [];

  // Group bets by date
  const dailyMap: { [key: string]: DailyData } = {};

  settledBets.forEach((bet) => {
    const date = new Date(
      typeof bet.createdAt === 'number'
        ? bet.createdAt
        : bet.createdAt.toMillis()
    );
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = {
        date: dateKey,
        spend: 0,
        wins: 0,
        netPL: 0,
        betCount: 0,
      };
    }

    dailyMap[dateKey].betCount++;
    dailyMap[dateKey].spend += bet.amount;

    if (bet.result === 'won') {
      const payout =
        bet.odds > 0
          ? bet.amount * (bet.odds / 100)
          : bet.amount * (-100 / bet.odds);
      dailyMap[dateKey].wins += payout;
      dailyMap[dateKey].netPL += payout;
    } else if (bet.result === 'lost') {
      dailyMap[dateKey].netPL -= bet.amount;
    }
  });

  // Convert to array and sort by date
  const dailyData = Object.values(dailyMap).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Return last N days
  return dailyData.slice(-days);
}

/**
 * Prepare time series data for line charts
 */
export function prepareTimeSeriesChart(
  dailyData: DailyData[]
): TimeSeriesData {
  if (dailyData.length === 0) {
    return {
      labels: [],
      datasets: [{ data: [] }],
    };
  }

  const labels = dailyData.map((d) => {
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  return {
    labels,
    datasets: [
      {
        data: dailyData.map((d) => d.netPL),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`, // Primary blue
        strokeWidth: 2,
      },
    ],
  };
}

/**
 * Calculate sport distribution
 */
export function calculateSportDistribution(
  bets: Bet[]
): SportDistribution[] {
  const settledBets = bets.filter((b) => b.status === 'settled');
  if (settledBets.length === 0) return [];

  const sportMap: {
    [key: string]: { count: number; profit: number };
  } = {};

  settledBets.forEach((bet) => {
    if (!sportMap[bet.sport]) {
      sportMap[bet.sport] = { count: 0, profit: 0 };
    }

    sportMap[bet.sport].count++;

    if (bet.result === 'won') {
      const payout =
        bet.odds > 0
          ? bet.amount * (bet.odds / 100)
          : bet.amount * (-100 / bet.odds);
      sportMap[bet.sport].profit += payout;
    } else if (bet.result === 'lost') {
      sportMap[bet.sport].profit -= bet.amount;
    }
  });

  const colors = [
    '#6366f1', // Indigo
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#84cc16', // Lime
  ];

  const distribution = Object.entries(sportMap)
    .map(([sport, data], index) => ({
      sport,
      count: data.count,
      percentage: (data.count / settledBets.length) * 100,
      profit: data.profit,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.count - a.count);

  return distribution;
}

/**
 * Calculate hourly betting patterns
 */
export function calculateHourlyPatterns(bets: Bet[]): HourlyPattern[] {
  const hourMap: { [key: number]: { count: number; totalAmount: number } } = {};

  bets.forEach((bet) => {
    const date = new Date(
      typeof bet.createdAt === 'number'
        ? bet.createdAt
        : bet.createdAt.toMillis()
    );
    const hour = date.getHours();

    if (!hourMap[hour]) {
      hourMap[hour] = { count: 0, totalAmount: 0 };
    }

    hourMap[hour].count++;
    hourMap[hour].totalAmount += bet.amount;
  });

  return Object.entries(hourMap)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      betCount: data.count,
      avgAmount: data.totalAmount / data.count,
    }))
    .sort((a, b) => a.hour - b.hour);
}

/**
 * Calculate day of week patterns
 */
export function calculateDayOfWeekPatterns(bets: Bet[]): DayOfWeekPattern[] {
  const settledBets = bets.filter((b) => b.status === 'settled');
  if (settledBets.length === 0) return [];

  const dayMap: {
    [key: number]: {
      count: number;
      wins: number;
      totalAmount: number;
    };
  } = {};

  settledBets.forEach((bet) => {
    const date = new Date(
      typeof bet.createdAt === 'number'
        ? bet.createdAt
        : bet.createdAt.toMillis()
    );
    const day = date.getDay(); // 0 = Sunday

    if (!dayMap[day]) {
      dayMap[day] = { count: 0, wins: 0, totalAmount: 0 };
    }

    dayMap[day].count++;
    dayMap[day].totalAmount += bet.amount;

    if (bet.result === 'won') {
      dayMap[day].wins++;
    }
  });

  const dayNames = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ];

  return Object.entries(dayMap)
    .map(([day, data]) => ({
      day: dayNames[parseInt(day)],
      betCount: data.count,
      winRate: (data.wins / data.count) * 100,
      avgAmount: data.totalAmount / data.count,
    }))
    .sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day));
}

/**
 * Calculate win rate trend over time
 */
export function calculateWinRateTrend(
  bets: Bet[],
  bucketSize: number = 10
): { bucket: number; winRate: number }[] {
  const settledBets = bets
    .filter((b) => b.status === 'settled')
    .sort((a, b) => {
      const aTime =
        typeof a.createdAt === 'number'
          ? a.createdAt
          : a.createdAt.toMillis();
      const bTime =
        typeof b.createdAt === 'number'
          ? b.createdAt
          : b.createdAt.toMillis();
      return aTime - bTime;
    });

  if (settledBets.length < bucketSize) return [];

  const trend: { bucket: number; winRate: number }[] = [];

  for (let i = 0; i <= settledBets.length - bucketSize; i += bucketSize) {
    const bucket = settledBets.slice(i, i + bucketSize);
    const wins = bucket.filter((b) => b.result === 'won').length;
    const winRate = (wins / bucket.length) * 100;

    trend.push({
      bucket: Math.floor(i / bucketSize) + 1,
      winRate,
    });
  }

  return trend;
}

/**
 * Calculate monthly comparison data
 */
export function calculateMonthlyComparison(bets: Bet[]): {
  currentMonth: { spend: number; wins: number; netPL: number; betCount: number };
  lastMonth: { spend: number; wins: number; netPL: number; betCount: number };
  change: { spend: number; wins: number; netPL: number; betCount: number };
} {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const calculateMonthStats = (startDate: Date, endDate: Date) => {
    const monthBets = bets.filter((b) => {
      const betDate = new Date(
        typeof b.createdAt === 'number'
          ? b.createdAt
          : b.createdAt.toMillis()
      );
      return (
        betDate >= startDate &&
        betDate <= endDate &&
        b.status === 'settled'
      );
    });

    let spend = 0;
    let wins = 0;
    let netPL = 0;

    monthBets.forEach((bet) => {
      spend += bet.amount;

      if (bet.result === 'won') {
        const payout =
          bet.odds > 0
            ? bet.amount * (bet.odds / 100)
            : bet.amount * (-100 / bet.odds);
        wins += payout;
        netPL += payout;
      } else if (bet.result === 'lost') {
        netPL -= bet.amount;
      }
    });

    return { spend, wins, netPL, betCount: monthBets.length };
  };

  const currentMonth = calculateMonthStats(currentMonthStart, now);
  const lastMonth = calculateMonthStats(lastMonthStart, lastMonthEnd);

  const calculateChange = (current: number, last: number) => {
    if (last === 0) return 0;
    return ((current - last) / last) * 100;
  };

  return {
    currentMonth,
    lastMonth,
    change: {
      spend: calculateChange(currentMonth.spend, lastMonth.spend),
      wins: calculateChange(currentMonth.wins, lastMonth.wins),
      netPL: calculateChange(currentMonth.netPL, lastMonth.netPL),
      betCount: calculateChange(currentMonth.betCount, lastMonth.betCount),
    },
  };
}
