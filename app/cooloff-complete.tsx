// Welcome back screen after cool-off period completes
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useUserSettings, useUserStats } from '../src/hooks';

export default function CoolOffCompleteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useUserSettings(user?.uid || null);
  const { stats } = useUserStats(user?.uid || null);

  const weeklyBudget = settings?.weeklyBudget || 0;
  const weeklySpend = stats?.weeklySpend || 0;
  const budgetRemaining = weeklyBudget - weeklySpend;
  const budgetUsedPercent = weeklyBudget > 0 ? (weeklySpend / weeklyBudget) * 100 : 0;

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  const handleReviewSettings = () => {
    router.replace('/(tabs)/settings');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🎯</Text>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Your cool-off period is complete. Ready to bet with a clear mind?
          </Text>
        </View>

        {/* Before You Start */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before You Start</Text>
          <Text style={styles.sectionText}>
            Take a moment to remind yourself why you took this break and commit to
            betting responsibly.
          </Text>
        </View>

        {/* Budget Status */}
        <View style={styles.budgetCard}>
          <Text style={styles.budgetTitle}>Your Budget Status</Text>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Weekly Budget:</Text>
            <Text style={styles.budgetValue}>${weeklyBudget.toFixed(2)}</Text>
          </View>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Already Spent:</Text>
            <Text style={[styles.budgetValue, styles.budgetSpent]}>
              ${weeklySpend.toFixed(2)}
            </Text>
          </View>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Remaining:</Text>
            <Text
              style={[
                styles.budgetValue,
                styles.budgetRemaining,
                budgetRemaining < 0 && styles.budgetOver,
              ]}
            >
              ${budgetRemaining.toFixed(2)}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.min(100, budgetUsedPercent)}%` },
                budgetUsedPercent > 100 && styles.progressBarOver,
              ]}
            />
          </View>
          {budgetRemaining < 0 && (
            <Text style={styles.budgetWarning}>
              ⚠️ You've exceeded your weekly budget. Consider taking the rest of the week
              off.
            </Text>
          )}
        </View>

        {/* Commitments Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fresh Start Commitments</Text>
          <View style={styles.commitmentCard}>
            <Text style={styles.commitmentIcon}>✓</Text>
            <Text style={styles.commitmentText}>
              I will stick to my budget and loss limits
            </Text>
          </View>
          <View style={styles.commitmentCard}>
            <Text style={styles.commitmentIcon}>✓</Text>
            <Text style={styles.commitmentText}>
              I will only bet when I'm calm and focused
            </Text>
          </View>
          <View style={styles.commitmentCard}>
            <Text style={styles.commitmentIcon}>✓</Text>
            <Text style={styles.commitmentText}>
              I will not chase losses or bet impulsively
            </Text>
          </View>
          <View style={styles.commitmentCard}>
            <Text style={styles.commitmentIcon}>✓</Text>
            <Text style={styles.commitmentText}>
              I will listen to TiltGuard warnings and take breaks when needed
            </Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips for Success</Text>
          <Text style={styles.tipText}>
            • Start small - Consider placing smaller bets as you ease back in
          </Text>
          <Text style={styles.tipText}>
            • Track reasoning - Write detailed notes about why you're making each bet
          </Text>
          <Text style={styles.tipText}>
            • Review data - Check your patterns to learn from recent performance
          </Text>
          <Text style={styles.tipText}>
            • Set a timer - Plan to check in with yourself after 30 minutes
          </Text>
        </View>

        {/* Support Reminder */}
        <View style={styles.supportCard}>
          <Text style={styles.supportText}>
            Remember: If you ever feel out of control, TiltGuard is here to help. Our
            tilt detection will watch for warning signs, but you know yourself best.
          </Text>
          <Text style={styles.supportText}>
            📞 National Helpline: 1-800-522-4700
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.settingsButton} onPress={handleReviewSettings}>
          <Text style={styles.settingsButtonText}>Review Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Let's Go</Text>
        </TouchableOpacity>
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
    textAlign: 'center',
    lineHeight: 22,
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
  sectionText: {
    fontSize: 15,
    color: '#aaa',
    lineHeight: 22,
  },
  budgetCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#333',
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  budgetLabel: {
    fontSize: 15,
    color: '#aaa',
  },
  budgetValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  budgetSpent: {
    color: '#FF9800',
  },
  budgetRemaining: {
    color: '#4CAF50',
  },
  budgetOver: {
    color: '#f44336',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressBarOver: {
    backgroundColor: '#f44336',
  },
  budgetWarning: {
    fontSize: 13,
    color: '#f44336',
    lineHeight: 18,
    marginTop: 4,
  },
  commitmentCard: {
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  commitmentIcon: {
    fontSize: 20,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  commitmentText: {
    fontSize: 14,
    color: '#ddd',
    flex: 1,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: '#1a1a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 22,
    marginBottom: 6,
  },
  supportCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  supportText: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
    marginBottom: 8,
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
  settingsButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
