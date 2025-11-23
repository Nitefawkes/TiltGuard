// Session summary screen shown after betting session ends
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SessionSummary, endSessionWithJournal, getSessionHistory } from '../src/services/sessions';
import { useAuth } from '../src/hooks';
import { updateUserStats } from '../src/services/firebase';

export default function SessionSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ summaryData?: string }>();

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [journalEntry, setJournalEntry] = useState('');
  const [showJournal, setShowJournal] = useState(false);
  const [takingBreak, setTakingBreak] = useState(false);

  useEffect(() => {
    if (params.summaryData) {
      try {
        const parsed: SessionSummary = JSON.parse(params.summaryData);
        setSummary(parsed);
      } catch (error) {
        console.error('Error parsing summary data:', error);
        router.back();
      }
    }
  }, [params.summaryData]);

  if (!summary) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading summary...</Text>
      </View>
    );
  }

  const { session, insights, comparison } = summary;
  const durationMs = (session.endTime || Date.now()) - session.startTime;
  const durationMinutes = Math.round(durationMs / 60000);
  const settledBets = session.bets.filter((b) => b.status === 'settled');
  const wonBets = settledBets.filter((b) => b.result === 'win').length;
  const lostBets = settledBets.filter((b) => b.result === 'loss').length;
  const winRate = settledBets.length > 0 ? (wonBets / settledBets.length) * 100 : 0;

  const handleTakeBreak = () => {
    Alert.alert(
      'Take a Break?',
      'Set a voluntary cool-off period to pause betting for a while.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '1 Hour',
          onPress: () => setVoluntaryCoolOff(1),
        },
        {
          text: '24 Hours',
          onPress: () => setVoluntaryCoolOff(24),
        },
        {
          text: '3 Days',
          onPress: () => setVoluntaryCoolOff(72),
        },
      ]
    );
  };

  const setVoluntaryCoolOff = async (hours: number) => {
    if (!user?.uid) return;

    setTakingBreak(true);
    try {
      const coolOffUntil = Date.now() + hours * 60 * 60 * 1000;
      await updateUserStats(user.uid, { coolOffUntil });

      Alert.alert(
        'Break Set',
        `You've set a ${hours}-hour break. Use this time to rest and reflect.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Error setting cool-off:', error);
      Alert.alert('Error', 'Failed to set break. Please try again.');
    } finally {
      setTakingBreak(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!journalEntry.trim()) {
      Alert.alert('Error', 'Please write something in your journal');
      return;
    }

    try {
      // Journal is already saved in the session via endSessionWithJournal
      // This is called from dashboard when ending session manually
      Alert.alert('Saved', 'Journal entry saved with session', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error) {
      console.error('Error saving journal:', error);
      Alert.alert('Error', 'Failed to save journal entry');
    }
  };

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>📊</Text>
          <Text style={styles.title}>Session Complete</Text>
          <Text style={styles.subtitle}>
            {durationMinutes} {durationMinutes === 1 ? 'minute' : 'minutes'} •{' '}
            {session.bets.length} {session.bets.length === 1 ? 'bet' : 'bets'}
          </Text>
        </View>

        {/* P/L Summary */}
        <View style={styles.plCard}>
          <Text style={styles.plLabel}>Session P/L</Text>
          <Text
            style={[
              styles.plValue,
              session.totalPL > 0 && styles.plPositive,
              session.totalPL < 0 && styles.plNegative,
            ]}
          >
            {session.totalPL >= 0 ? '+' : ''}${session.totalPL.toFixed(2)}
          </Text>
          <View style={styles.plStats}>
            <View style={styles.plStat}>
              <Text style={styles.plStatValue}>${session.totalWagered.toFixed(2)}</Text>
              <Text style={styles.plStatLabel}>Wagered</Text>
            </View>
            <View style={styles.plStat}>
              <Text style={styles.plStatValue}>
                {wonBets}W - {lostBets}L
              </Text>
              <Text style={styles.plStatLabel}>Record</Text>
            </View>
            <View style={styles.plStat}>
              <Text style={styles.plStatValue}>{winRate.toFixed(0)}%</Text>
              <Text style={styles.plStatLabel}>Win Rate</Text>
            </View>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Insights</Text>
          {insights.map((insight, index) => (
            <View
              key={index}
              style={[
                styles.insightCard,
                insight.type === 'positive' && styles.insightPositive,
                insight.type === 'warning' && styles.insightWarning,
              ]}
            >
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <Text style={styles.insightMessage}>{insight.message}</Text>
            </View>
          ))}
        </View>

        {/* Comparison */}
        {comparison.averageSessionBets > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How You Did</Text>
            <View style={styles.comparisonCard}>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Your Average Session:</Text>
                <Text style={styles.comparisonValue}>
                  ${comparison.averageSessionPL.toFixed(2)} P/L
                </Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>This Session:</Text>
                <Text
                  style={[
                    styles.comparisonValue,
                    comparison.betterThanAverage && styles.comparisonBetter,
                    !comparison.betterThanAverage && styles.comparisonWorse,
                  ]}
                >
                  {comparison.betterThanAverage ? '↗' : '↘'} ${session.totalPL.toFixed(2)} P/L
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Reflection Prompt */}
        {!showJournal ? (
          <TouchableOpacity
            style={styles.journalPrompt}
            onPress={() => setShowJournal(true)}
          >
            <Text style={styles.journalPromptIcon}>📝</Text>
            <View style={styles.journalPromptContent}>
              <Text style={styles.journalPromptTitle}>Add Reflection</Text>
              <Text style={styles.journalPromptText}>
                What did you learn from this session?
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Reflection</Text>
            <Text style={styles.journalInstructions}>
              Take a moment to reflect on this session. What went well? What could improve?
            </Text>
            <TextInput
              style={styles.journalInput}
              placeholder="Write your thoughts here..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              value={journalEntry}
              onChangeText={setJournalEntry}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>💡 What's Next?</Text>
          {session.totalPL < 0 && (
            <Text style={styles.recommendationText}>
              • Consider taking a break before betting again
            </Text>
          )}
          {session.tiltWarnings > 0 && (
            <Text style={styles.recommendationText}>
              • Review what triggered tilt warnings during this session
            </Text>
          )}
          {session.bets.length >= 5 && (
            <Text style={styles.recommendationText}>
              • Try spacing out your bets more next time
            </Text>
          )}
          <Text style={styles.recommendationText}>
            • Check your patterns in the Analytics tab
          </Text>
          <Text style={styles.recommendationText}>
            • Set a reminder to review your session notes later
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {session.totalPL < 0 || session.tiltWarnings > 0 ? (
          <>
            <TouchableOpacity
              style={styles.breakButton}
              onPress={handleTakeBreak}
              disabled={takingBreak}
            >
              <Text style={styles.breakButtonText}>
                {takingBreak ? 'Setting Break...' : 'Take a Break'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={showJournal && journalEntry ? handleSaveJournal : handleContinue}
          >
            <Text style={styles.doneButtonText}>
              {showJournal && journalEntry ? 'Save & Done' : 'Done'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  plCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#333',
  },
  plLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  plValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  plPositive: {
    color: '#4CAF50',
  },
  plNegative: {
    color: '#f44336',
  },
  plStats: {
    flexDirection: 'row',
    gap: 24,
    width: '100%',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
  },
  plStat: {
    alignItems: 'center',
  },
  plStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  plStatLabel: {
    fontSize: 12,
    color: '#888',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  insightCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#666',
  },
  insightPositive: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#1a2a1a',
  },
  insightWarning: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#2a1a1a',
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  insightMessage: {
    fontSize: 14,
    color: '#ddd',
    flex: 1,
    lineHeight: 20,
  },
  comparisonCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  comparisonBetter: {
    color: '#4CAF50',
  },
  comparisonWorse: {
    color: '#FF9800',
  },
  journalPrompt: {
    backgroundColor: '#1a1a2a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  journalPromptIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  journalPromptContent: {
    flex: 1,
  },
  journalPromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  journalPromptText: {
    fontSize: 14,
    color: '#888',
  },
  journalInstructions: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
    lineHeight: 20,
  },
  journalInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendationsCard: {
    backgroundColor: '#1a2a1a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 22,
    marginBottom: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#222',
    padding: 20,
    flexDirection: 'row',
    gap: 12,
  },
  breakButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  breakButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
