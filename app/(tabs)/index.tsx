// Dashboard screen - Main screen with bet tracking

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useUserProfile, useUserStats } from '../../src/hooks';
import {
  Button,
  Card,
  StatDisplay,
  ProgressBar,
  Banner,
  colors,
} from '../../src/components/UI';
import { TiltModal } from '../../src/components/TiltModal';
import {
  checkTiltTriggers,
  isCoolOffActive,
  getCoolOffRemaining,
} from '../../src/services/tiltDetection';
import {
  addBet,
  settleBet,
  getRecentBets,
  checkAndResetPeriod,
} from '../../src/services/firebase';
import { Bet, BetResult, SPORTS_OPTIONS } from '../../src/types';
import { generateInsights, Insight } from '../../src/services/insights';
import {
  getActiveSession,
  addBetToSession,
  updateSessionOnBetSettle,
  recordTiltWarning,
  endSession,
  BettingSession,
} from '../../src/services/sessions';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid || null);
  const { stats, loading: statsLoading, refresh: refreshStats } = useUserStats(user?.uid || null);

  const [showBetForm, setShowBetForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [odds, setOdds] = useState('');
  const [sport, setSport] = useState('NFL');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  const [tiltModalVisible, setTiltModalVisible] = useState(false);
  const [tiltTriggerType, setTiltTriggerType] = useState<any>(null);
  const [tiltMessage, setTiltMessage] = useState('');

  const [recentBets, setRecentBets] = useState<Bet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeSession, setActiveSession] = useState<BettingSession | null>(null);

  // Load recent bets and active session
  useEffect(() => {
    loadRecentBets();
    loadActiveSession();
    if (user?.uid) {
      checkAndResetPeriod(user.uid);
    }
  }, [user?.uid]);

  const loadActiveSession = async () => {
    try {
      const session = await getActiveSession();
      setActiveSession(session);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // Generate insights when bets or stats change
  useEffect(() => {
    if (stats && recentBets.length > 0) {
      const generated = generateInsights(recentBets, stats);
      setInsights(generated);
    }
  }, [recentBets, stats]);

  const loadRecentBets = async () => {
    if (!user?.uid) return;
    try {
      const bets = await getRecentBets(user.uid, 100); // Get more for insights
      setRecentBets(bets);
    } catch (error) {
      console.error('Error loading bets:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), loadRecentBets()]);
    setRefreshing(false);
  };

  const handleAddNewBet = () => {
    if (!stats || !profile) return;

    // Check cool-off
    if (isCoolOffActive(stats)) {
      router.push('/cooloff');
      return;
    }

    // Check tilt triggers
    const tiltCheck = checkTiltTriggers(stats, profile.settings);

    if (tiltCheck.triggered) {
      // Record tilt warning in session
      recordTiltWarning();

      // Navigate to reflection screen for user to pause and think
      router.push({
        pathname: '/reflection',
        params: {
          triggerType: tiltCheck.triggerType,
          message: tiltCheck.message,
          consecutiveLosses: stats.consecutiveLosses.toString(),
          weeklySpend: stats.weeklySpend.toString(),
          weeklyBudget: profile.settings.weeklyBudget.toString(),
        },
      });
      return;
    }

    // All clear, show form
    setShowBetForm(true);
  };

  const handleSubmitBet = async () => {
    const betAmount = parseFloat(amount);
    const betOdds = parseInt(odds);

    if (isNaN(betAmount) || betAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (isNaN(betOdds)) {
      Alert.alert('Error', 'Please enter valid odds (e.g., -110 or +150)');
      return;
    }

    if (!user?.uid) return;

    setAdding(true);
    try {
      const newBet = await addBet(user.uid, {
        amount: betAmount,
        odds: betOdds,
        sport,
        notes,
      });

      // Add bet to session tracking
      if (newBet) {
        const updatedSession = await addBetToSession(newBet);
        setActiveSession(updatedSession);
      }

      // Reset form
      setAmount('');
      setOdds('');
      setNotes('');
      setShowBetForm(false);

      // Reload data
      await Promise.all([refreshStats(), loadRecentBets()]);
    } catch (error) {
      console.error('Error adding bet:', error);
      Alert.alert('Error', 'Failed to add bet');
    } finally {
      setAdding(false);
    }
  };

  const handleSettleBet = async (betId: string, result: BetResult) => {
    if (!user?.uid || !profile) return;

    try {
      await settleBet(user.uid, betId, result);

      // Update session with settled bet
      const updatedSession = await updateSessionOnBetSettle(betId, result);
      setActiveSession(updatedSession);

      await Promise.all([refreshStats(), loadRecentBets()]);
      Alert.alert('Success', 'Bet settled!');

      // Send notifications if enabled
      if (profile.settings.notifications?.enabled) {
        const {
          scheduleTiltWarningNotification,
          scheduleBudgetWarningNotification,
          scheduleMilestoneNotification,
          checkMilestones,
        } = await import('../../src/services/notifications');
        const { getUserStats } = await import('../../src/services/firebase');

        // Get updated stats
        const updatedStats = await getUserStats(user.uid);
        if (!updatedStats) return;

        // Check for tilt triggers
        if (profile.settings.notifications.tiltWarnings) {
          const tiltCheck = checkTiltTriggers(updatedStats, profile.settings);
          if (tiltCheck.triggered) {
            await scheduleTiltWarningNotification(
              tiltCheck.triggerType!,
              tiltCheck.message
            );
          }
        }

        // Check for budget warnings
        if (profile.settings.notifications.budgetAlerts) {
          const budgetPercent =
            (updatedStats.weeklySpend / profile.settings.weeklyLossLimit) *
            100;
          if (budgetPercent >= 80 && budgetPercent < 100) {
            await scheduleBudgetWarningNotification(
              budgetPercent,
              updatedStats.weeklySpend,
              profile.settings.weeklyLossLimit
            );
          }
        }

        // Check for milestones
        if (profile.settings.notifications.milestones) {
          const milestone = checkMilestones(updatedStats);
          if (milestone) {
            await scheduleMilestoneNotification(
              milestone.milestone,
              milestone.description
            );
          }
        }
      }
    } catch (error) {
      console.error('Error settling bet:', error);
      Alert.alert('Error', 'Failed to settle bet');
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    Alert.alert(
      'End Session?',
      'Review your session performance and optionally add a journal entry.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          onPress: async () => {
            try {
              const summary = await endSession(activeSession);
              setActiveSession(null);

              // Navigate to session summary screen
              router.push({
                pathname: '/session-summary',
                params: {
                  summaryData: JSON.stringify(summary),
                },
              });
            } catch (error) {
              console.error('Error ending session:', error);
              Alert.alert('Error', 'Failed to end session');
            }
          },
        },
      ]
    );
  };

  if (statsLoading || !stats || !profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const roi = stats.totalWagered > 0 ? (stats.totalPL / stats.totalWagered) * 100 : 0;
  const weeklyProgress = stats.weeklySpend / profile.settings.weeklyLossLimit;
  const isCoolOff = isCoolOffActive(stats);

  // Calculate session stats
  const sessionBets = activeSession?.bets.length || 0;
  const sessionPL = activeSession?.totalPL || 0;
  const sessionDuration = activeSession
    ? Math.round((Date.now() - activeSession.startTime) / 60000)
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TiltGuard 🛡️</Text>
          <Text style={styles.headerSubtitle}>
            {profile.plan === 'pro' ? 'Pro' : 'Free'} Plan
          </Text>
        </View>

        {/* Cool-off Banner */}
        {isCoolOff && (
          <Banner
            message={`Cool-off active: ${getCoolOffRemaining(stats)} remaining`}
            type="warning"
            style={styles.banner}
          />
        )}

        {/* Active Session Card */}
        {activeSession && (
          <Card style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View>
                <Text style={styles.sessionTitle}>🎯 Active Session</Text>
                <Text style={styles.sessionDuration}>{sessionDuration} min</Text>
              </View>
              <TouchableOpacity style={styles.endSessionButton} onPress={handleEndSession}>
                <Text style={styles.endSessionText}>End Session</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sessionStats}>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>{sessionBets}</Text>
                <Text style={styles.sessionStatLabel}>Bets</Text>
              </View>
              <View style={styles.sessionStat}>
                <Text
                  style={[
                    styles.sessionStatValue,
                    sessionPL > 0 && styles.sessionPLPositive,
                    sessionPL < 0 && styles.sessionPLNegative,
                  ]}
                >
                  {sessionPL >= 0 ? '+' : ''}${sessionPL.toFixed(2)}
                </Text>
                <Text style={styles.sessionStatLabel}>Session P/L</Text>
              </View>
              {activeSession.tiltWarnings > 0 && (
                <View style={styles.sessionStat}>
                  <Text style={[styles.sessionStatValue, styles.sessionWarning]}>
                    {activeSession.tiltWarnings}
                  </Text>
                  <Text style={styles.sessionStatLabel}>Warnings</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <StatDisplay
              label="Total P/L"
              value={`$${stats.totalPL.toFixed(2)}`}
              positive={stats.totalPL > 0}
              negative={stats.totalPL < 0}
            />
          </Card>
          <Card style={styles.statCard}>
            <StatDisplay label="ROI" value={`${roi.toFixed(1)}%`} />
          </Card>
          <Card style={styles.statCard}>
            <StatDisplay label="Loss Streak" value={stats.consecutiveLosses} />
          </Card>
        </View>

        {/* Weekly Progress */}
        <Card>
          <Text style={styles.cardTitle}>Weekly Spend</Text>
          <Text style={styles.progressText}>
            ${stats.weeklySpend.toFixed(2)} / ${profile.settings.weeklyLossLimit.toFixed(2)}
          </Text>
          <ProgressBar
            progress={weeklyProgress}
            color={weeklyProgress >= 0.8 ? colors.danger : colors.primary}
            style={styles.progressBar}
          />
        </Card>

        {/* Smart Insights */}
        {insights.length > 0 && (
          <Card style={styles.insightsCard}>
            <Text style={styles.cardTitle}>💡 Smart Insights</Text>
            {insights.slice(0, 3).map((insight) => (
              <View key={insight.id} style={styles.insightItem}>
                <View
                  style={[
                    styles.insightIndicator,
                    {
                      backgroundColor:
                        insight.type === 'positive' || insight.type === 'achievement'
                          ? colors.success
                          : insight.type === 'warning'
                          ? colors.warning
                          : colors.info,
                    },
                  ]}
                />
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightMessage}>{insight.message}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Add New Bet */}
        {!showBetForm && (
          <Button
            title={isCoolOff ? 'Cool-Off Active' : 'Add New Bet'}
            onPress={handleAddNewBet}
            disabled={isCoolOff}
            style={styles.addButton}
          />
        )}

        {/* Bet Form */}
        {showBetForm && (
          <Card style={styles.betForm}>
            <Text style={styles.formTitle}>New Bet</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="20"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Odds (American)</Text>
              <TextInput
                style={styles.input}
                value={odds}
                onChangeText={setOdds}
                placeholder="-110 or +150"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sport</Text>
              <Text style={styles.input}>{sport}</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add details..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.formActions}>
              <Button title="Add Bet" onPress={handleSubmitBet} loading={adding} />
              <Button
                title="Cancel"
                onPress={() => setShowBetForm(false)}
                variant="outline"
                disabled={adding}
              />
            </View>
          </Card>
        )}

        {/* Recent Bets */}
        <Card>
          <Text style={styles.cardTitle}>Recent Bets</Text>
          {recentBets.length === 0 ? (
            <Text style={styles.emptyText}>No bets yet. Add your first bet!</Text>
          ) : (
            recentBets.map((bet: Bet) => (
              <View key={bet.id} style={styles.betItem}>
                <View style={styles.betInfo}>
                  <Text style={styles.betSport}>{bet.sport}</Text>
                  <Text style={styles.betDetails}>
                    ${bet.amount} @ {bet.odds > 0 ? '+' : ''}
                    {bet.odds}
                  </Text>
                </View>
                {bet.status === 'active' ? (
                  <View style={styles.betActions}>
                    <TouchableOpacity
                      style={styles.settleButton}
                      onPress={() => handleSettleBet(bet.id, 'win')}
                    >
                      <Text style={styles.settleButtonText}>Win</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.settleButton}
                      onPress={() => handleSettleBet(bet.id, 'loss')}
                    >
                      <Text style={styles.settleButtonText}>Loss</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.betStatus,
                      bet.result === 'win' && styles.betStatusWin,
                      bet.result === 'loss' && styles.betStatusLoss,
                    ]}
                  >
                    {bet.result?.toUpperCase()}
                  </Text>
                )}
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* Tilt Modal */}
      {profile && tiltTriggerType && (
        <TiltModal
          visible={tiltModalVisible}
          onClose={() => {
            setTiltModalVisible(false);
            setShowBetForm(true);
          }}
          triggerType={tiltTriggerType}
          message={tiltMessage}
          userPlan={profile.plan}
          userId={user?.uid || ''}
        />
      )}
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
  banner: {
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    marginTop: 4,
  },
  addButton: {
    marginTop: 8,
  },
  betForm: {
    gap: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  formActions: {
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  betItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  betInfo: {
    flex: 1,
  },
  betSport: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  betDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  betActions: {
    flexDirection: 'row',
    gap: 8,
  },
  settleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
  },
  settleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  betStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  betStatusWin: {
    color: colors.success,
  },
  betStatusLoss: {
    color: colors.error,
  },
  loadingText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  insightsCard: {
    marginTop: 8,
  },
  insightItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  insightIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sessionCard: {
    marginBottom: 8,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sessionDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  endSessionButton: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  endSessionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 24,
  },
  sessionStat: {
    alignItems: 'center',
  },
  sessionStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sessionPLPositive: {
    color: colors.success,
  },
  sessionPLNegative: {
    color: colors.error,
  },
  sessionWarning: {
    color: colors.warning,
  },
  sessionStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
