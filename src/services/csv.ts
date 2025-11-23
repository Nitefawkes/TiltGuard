// CSV Export/Import service for TiltGuard

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Bet, UserStats } from '../types';
import { addBet } from './firebase';

/**
 * Convert bets array to CSV string
 */
export function betsToCSV(bets: Bet[]): string {
  if (bets.length === 0) {
    return 'id,sport,amount,odds,result,status,createdAt,settledAt,notes\n';
  }

  const headers = [
    'id',
    'sport',
    'amount',
    'odds',
    'result',
    'status',
    'createdAt',
    'settledAt',
    'notes',
  ];

  const rows = bets.map((bet) => {
    const createdAt = bet.createdAt
      ? new Date(
          typeof bet.createdAt === 'number'
            ? bet.createdAt
            : bet.createdAt.toMillis()
        ).toISOString()
      : '';

    const settledAt = bet.settledAt
      ? new Date(
          typeof bet.settledAt === 'number'
            ? bet.settledAt
            : bet.settledAt.toMillis()
        ).toISOString()
      : '';

    return [
      bet.id || '',
      bet.sport || '',
      bet.amount?.toString() || '',
      bet.odds?.toString() || '',
      bet.result || '',
      bet.status || '',
      createdAt,
      settledAt,
      bet.notes || '',
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Convert stats to CSV string
 */
export function statsToCSV(stats: UserStats): string {
  const headers = ['metric', 'value'];
  const rows = [
    ['Total Bets', stats.totalBets.toString()],
    ['Total Won', stats.totalWon.toString()],
    ['Total Lost', stats.totalLost.toString()],
    ['Win Rate', `${stats.winRate.toFixed(2)}%`],
    ['Net Profit/Loss', `$${stats.netPL.toFixed(2)}`],
    ['Weekly Spend', `$${stats.weeklySpend.toFixed(2)}`],
    ['Weekly Wins', `$${stats.weeklyWins.toFixed(2)}`],
    ['Weekly Losses', `$${stats.weeklyLosses.toFixed(2)}`],
    ['Consecutive Losses', stats.consecutiveLosses.toString()],
    ['Period Start', new Date(stats.periodStart).toISOString()],
  ];

  return [
    headers.join(','),
    ...rows.map((row) => row.map((field) => `"${field}"`).join(',')),
  ].join('\n');
}

/**
 * Parse CSV string to bets array
 */
export function csvToBets(csvContent: string): Partial<Bet>[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const bets: Partial<Bet>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV line respecting quoted fields
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const bet: Partial<Bet> = {};
    headers.forEach((header, index) => {
      const value = values[index]?.replace(/^"|"$/g, '') || '';

      switch (header.toLowerCase()) {
        case 'sport':
          bet.sport = value;
          break;
        case 'amount':
          bet.amount = parseFloat(value) || 0;
          break;
        case 'odds':
          bet.odds = parseFloat(value) || 0;
          break;
        case 'result':
          bet.result = value as 'won' | 'lost' | 'push';
          break;
        case 'status':
          bet.status = value as 'pending' | 'settled';
          break;
        case 'notes':
          bet.notes = value;
          break;
        case 'createdat':
          if (value) bet.createdAt = new Date(value).getTime();
          break;
        case 'settledat':
          if (value) bet.settledAt = new Date(value).getTime();
          break;
      }
    });

    if (bet.sport && bet.amount && bet.odds) {
      bets.push(bet);
    }
  }

  return bets;
}

/**
 * Export bets to CSV file and share
 */
export async function exportBetsToCSV(
  bets: Bet[],
  filename?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const csv = betsToCSV(bets);
    const fileName = filename || `tiltguard-bets-${Date.now()}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Betting History',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error exporting bets to CSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export stats to CSV file and share
 */
export async function exportStatsToCSV(
  stats: UserStats,
  filename?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const csv = statsToCSV(stats);
    const fileName = filename || `tiltguard-stats-${Date.now()}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Stats',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error exporting stats to CSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import bets from CSV file
 */
export async function importBetsFromCSV(
  fileUri: string,
  userId: string
): Promise<{ success: boolean; imported: number; error?: string }> {
  try {
    const csvContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const bets = csvToBets(csvContent);
    let imported = 0;

    for (const bet of bets) {
      if (bet.sport && bet.amount && bet.odds) {
        try {
          await addBet(userId, {
            sport: bet.sport,
            amount: bet.amount,
            odds: bet.odds,
            notes: bet.notes,
          });
          imported++;
        } catch (err) {
          console.error('Error importing bet:', err);
        }
      }
    }

    return { success: true, imported };
  } catch (error) {
    console.error('Error importing bets from CSV:', error);
    return {
      success: false,
      imported: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download CSV template for manual entry
 */
export async function downloadCSVTemplate(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const template = betsToCSV([]);
    const fileName = `tiltguard-import-template.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, template, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Download CSV Template',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error downloading CSV template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
