// Enhanced cool-off screen with supportive content
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useUserSettings, useUserStats } from '../src/hooks';

export default function CoolOffScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useUserSettings(user?.uid || null);
  const { stats } = useUserStats(user?.uid || null);

  const [timeRemaining, setTimeRemaining] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    if (!stats?.coolOffUntil) {
      // No active cool-off, redirect back
      router.back();
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = stats.coolOffUntil! - now;

      if (remaining <= 0) {
        // Cool-off ended
        router.replace('/cooloff-complete');
        return;
      }

      // Calculate time remaining
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        setTimeRemaining(`${days}d ${remainingHours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }

      // Calculate progress (assuming cool-off started when stats.lastBetAt was set)
      // For simplicity, we'll estimate 1 hour cool-off for progress bar
      const estimatedDuration = 60 * 60 * 1000; // 1 hour
      const elapsed = estimatedDuration - remaining;
      const progress = Math.min(100, Math.max(0, (elapsed / estimatedDuration) * 100));
      setProgressPercent(progress);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [stats?.coolOffUntil]);

  const handleSupportLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🧘</Text>
          <Text style={styles.title}>Taking a Breather</Text>
          <Text style={styles.subtitle}>
            You're on a cool-off period. This is your future self protecting you.
          </Text>
        </View>

        {/* Timer */}
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Time Remaining</Text>
          <Text style={styles.timerValue}>{timeRemaining}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Why Cool-Off Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Am I Locked Out?</Text>
          <Text style={styles.sectionText}>
            Our tilt detection system identified patterns suggesting you might be betting
            emotionally rather than logically. This cool-off period helps you reset and
            come back with a clear mind.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Studies show that taking breaks improves decision-making and reduces losses
              by up to 40%.
            </Text>
          </View>
        </View>

        {/* What To Do Now */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Should I Do Now?</Text>
          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionIcon}>🚶</Text>
            <Text style={styles.suggestionTitle}>Take a Walk</Text>
            <Text style={styles.suggestionText}>
              Physical activity helps clear your mind and reduces stress.
            </Text>
          </View>
          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionIcon}>🧠</Text>
            <Text style={styles.suggestionTitle}>Practice Mindfulness</Text>
            <Text style={styles.suggestionText}>
              Try a 5-minute breathing exercise or meditation.
            </Text>
          </View>
          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionIcon}>📊</Text>
            <Text style={styles.suggestionTitle}>Review Your Data</Text>
            <Text style={styles.suggestionText}>
              Look at your patterns and stats to learn from recent bets.
            </Text>
          </View>
          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionIcon}>💬</Text>
            <Text style={styles.suggestionTitle}>Talk to Someone</Text>
            <Text style={styles.suggestionText}>
              Reach out to a friend or family member about how you're feeling.
            </Text>
          </View>
        </View>

        {/* Support Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need Support?</Text>
          <TouchableOpacity
            style={styles.resourceButton}
            onPress={() => handleSupportLink('tel:1-800-522-4700')}
          >
            <Text style={styles.resourceIcon}>📞</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>National Problem Gambling Helpline</Text>
              <Text style={styles.resourceSubtitle}>1-800-522-4700 (24/7 free)</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resourceButton}
            onPress={() => handleSupportLink('sms:233-HOPE')}
          >
            <Text style={styles.resourceIcon}>💬</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Crisis Text Line</Text>
              <Text style={styles.resourceSubtitle}>Text HOPE to 233-HOPE</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resourceButton}
            onPress={() => handleSupportLink('https://www.ncpgambling.org/chat')}
          >
            <Text style={styles.resourceIcon}>💻</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Live Chat Support</Text>
              <Text style={styles.resourceSubtitle}>ncpgambling.org/chat</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Encouragement */}
        <View style={styles.encouragementCard}>
          <Text style={styles.encouragementText}>
            "The most successful bettors know when to walk away. You're doing the right thing
            by taking this break. Be patient with yourself."
          </Text>
          <Text style={styles.encouragementAuthor}>— TiltGuard Community</Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
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
    paddingBottom: 100,
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
  timerCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#333',
  },
  timerLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
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
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 20,
  },
  suggestionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
    flex: 1,
  },
  suggestionText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    position: 'absolute',
    left: 60,
    right: 16,
    top: 40,
  },
  resourceButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  resourceIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  resourceSubtitle: {
    fontSize: 14,
    color: '#2196F3',
  },
  encouragementCard: {
    backgroundColor: '#1a1a2a',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  encouragementText: {
    fontSize: 15,
    color: '#ddd',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  encouragementAuthor: {
    fontSize: 14,
    color: '#888',
    textAlign: 'right',
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
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
