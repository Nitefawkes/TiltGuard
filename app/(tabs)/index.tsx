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

export default function DashboardScreen() {
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

  // Load recent bets
  useEffect(() => {
    loadRecentBets();
    if (user?.uid) {
      checkAndResetPeriod(user.uid);
    }
  }, [user?.uid]);

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
      Alert.alert(
        'Cool-Off Active',
        `You're in cool-off mode for ${getCoolOffRemaining(stats)}.`
      );
      return;
    }

    // Check tilt triggers
    const tiltCheck = checkTiltTriggers(stats, profile.settings);

    if (tiltCheck.triggered) {
      setTiltTriggerType(tiltCheck.triggerType);
      setTiltMessage(tiltCheck.message);
      setTiltModalVisible(true);
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
      await addBet(user.uid, {
        amount: betAmount,
        odds: betOdds,
        sport,
        notes,
      });

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
    if (!user?.uid) return;

    try {
      await settleBet(user.uid, betId, result);
      await Promise.all([refreshStats(), loadRecentBets()]);
      Alert.alert('Success', 'Bet settled!');
    } catch (error) {
      console.error('Error settling bet:', error);
      Alert.alert('Error', 'Failed to settle bet');
    }
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
});
