// Patterns screen - Analysis of betting patterns (Pro feature)

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth, useUserProfile } from '../../src/hooks';
import { Card, Button, colors } from '../../src/components/UI';
import { getAllSettledBets } from '../../src/services/firebase';
import { Bet, SportPattern, PatternsData } from '../../src/types';

export default function PatternsScreen() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid || null);
  const [patterns, setPatterns] = useState<PatternsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
  }, [user?.uid]);

  const loadPatterns = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const bets = await getAllSettledBets(user.uid);
      const computed = computePatterns(bets);
      setPatterns(computed);
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const computePatterns = (bets: Bet[]): PatternsData => {
    if (bets.length < 5) {
      return {
        bestSport: null,
        worstSport: null,
        mostActiveDay: null,
        sportBreakdown: [],
      };
    }

    // Group by sport
    const sportMap = new Map<string, SportPattern>();

    bets.forEach((bet) => {
      if (!sportMap.has(bet.sport)) {
        sportMap.set(bet.sport, {
          sport: bet.sport,
          totalPL: 0,
          totalWagered: 0,
          betCount: 0,
          winRate: 0,
        });
      }

      const pattern = sportMap.get(bet.sport)!;
      pattern.betCount += 1;
      pattern.totalWagered += bet.amount;

      if (bet.result === 'win') {
        const profit = calculateProfit(bet.amount, bet.odds);
        pattern.totalPL += profit;
      } else if (bet.result === 'loss') {
        pattern.totalPL -= bet.amount;
      }
    });

    // Calculate win rates
    sportMap.forEach((pattern) => {
      const wins = bets.filter((b) => b.sport === pattern.sport && b.result === 'win').length;
      pattern.winRate = pattern.betCount > 0 ? wins / pattern.betCount : 0;
    });

    const sportBreakdown = Array.from(sportMap.values()).sort(
      (a, b) => b.totalPL - a.totalPL
    );

    const bestSport = sportBreakdown[0] || null;
    const worstSport = sportBreakdown[sportBreakdown.length - 1] || null;

    // Most active day (simplified - would need full implementation)
    const mostActiveDay = 'Monday'; // Placeholder

    return {
      bestSport,
      worstSport,
      mostActiveDay,
      sportBreakdown,
    };
  };

  const calculateProfit = (amount: number, odds: number): number => {
    if (odds > 0) {
      return (amount * odds) / 100;
    } else {
      return (amount * 100) / Math.abs(odds);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading patterns...</Text>
      </View>
    );
  }

  // Free user upgrade prompt
  if (profile?.plan === 'free') {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Patterns 📊</Text>
          </View>

          <Card style={styles.upgradeCard}>
            <Text style={styles.upgradeIcon}>🔒</Text>
            <Text style={styles.upgradeTitle}>Pro Feature</Text>
            <Text style={styles.upgradeText}>
              Upgrade to Pro to see detailed betting patterns including:
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Best and worst sports by P/L</Text>
              <Text style={styles.featureItem}>• Win rates by sport</Text>
              <Text style={styles.featureItem}>• Most active betting days</Text>
              <Text style={styles.featureItem}>• Full sport breakdown</Text>
            </View>
            <Button
              title="Upgrade to Pro - $4.99/mo"
              onPress={() => alert('Upgrade flow coming soon!')}
              style={styles.upgradeButton}
            />
          </Card>
        </ScrollView>
      </View>
    );
  }

  // Not enough data
  if (!patterns || !patterns.bestSport) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Patterns 📊</Text>
          </View>
          <Card>
            <Text style={styles.emptyText}>
              Not enough data yet. Settle at least 5 bets to see patterns.
            </Text>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Patterns 📊</Text>
          <Text style={styles.headerSubtitle}>Insights from your betting history</Text>
        </View>

        {/* Best Sport */}
        {patterns.bestSport && (
          <Card>
            <Text style={styles.cardTitle}>🏆 Best Sport</Text>
            <Text style={styles.sportName}>{patterns.bestSport.sport}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>P/L</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  ${patterns.bestSport.totalPL.toFixed(2)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Bets</Text>
                <Text style={styles.statValue}>{patterns.bestSport.betCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Win Rate</Text>
                <Text style={styles.statValue}>
                  {(patterns.bestSport.winRate * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Worst Sport */}
        {patterns.worstSport && (
          <Card>
            <Text style={styles.cardTitle}>⚠️ Worst Sport</Text>
            <Text style={styles.sportName}>{patterns.worstSport.sport}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>P/L</Text>
                <Text style={[styles.statValue, { color: colors.error }]}>
                  ${patterns.worstSport.totalPL.toFixed(2)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Bets</Text>
                <Text style={styles.statValue}>{patterns.worstSport.betCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Win Rate</Text>
                <Text style={styles.statValue}>
                  {(patterns.worstSport.winRate * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Full Breakdown */}
        <Card>
          <Text style={styles.cardTitle}>Sport Breakdown</Text>
          {patterns.sportBreakdown.map((sport) => (
            <View key={sport.sport} style={styles.sportRow}>
              <Text style={styles.sportRowName}>{sport.sport}</Text>
              <Text
                style={[
                  styles.sportRowPL,
                  sport.totalPL > 0 ? { color: colors.success } : { color: colors.error },
                ]}
              >
                ${sport.totalPL.toFixed(2)}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  header: {
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  loadingText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  upgradeCard: {
    alignItems: 'center',
  },
  upgradeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  upgradeText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  upgradeButton: {
    width: '100%',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sportName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sportRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sportRowPL: {
    fontSize: 14,
    fontWeight: '600',
  },
});
