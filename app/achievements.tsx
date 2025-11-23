// Achievements and streaks screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getStreaks,
  getAchievements,
  getAchievementStats,
  Streaks,
  Achievement,
} from '../src/services/streaks';

export default function AchievementsScreen() {
  const router = useRouter();
  const [streaks, setStreaks] = useState<Streaks | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState({ total: 0, unlocked: 0, percentage: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [streaksData, achievementsData, statsData] = await Promise.all([
        getStreaks(),
        getAchievements(),
        getAchievementStats(),
      ]);
      setStreaks(streaksData);
      setAchievements(achievementsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const unlockedAchievements = achievements.filter((a) => a.unlockedAt);
  const lockedAchievements = achievements.filter((a) => !a.unlockedAt);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Achievements</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Overall Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Your Progress</Text>
          <View style={styles.progressRing}>
            <Text style={styles.progressPercentage}>{Math.round(stats.percentage)}%</Text>
            <Text style={styles.progressLabel}>Complete</Text>
          </View>
          <Text style={styles.progressStats}>
            {stats.unlocked} / {stats.total} Achievements Unlocked
          </Text>
        </View>

        {/* Active Streaks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Active Streaks</Text>
          {streaks && (
            <View style={styles.streaksGrid}>
              <View style={styles.streakCard}>
                <Text style={styles.streakIcon}>🛡️</Text>
                <Text style={styles.streakValue}>{streaks.responsibleBetting.current}</Text>
                <Text style={styles.streakLabel}>Responsible Days</Text>
                <Text style={styles.streakBest}>Best: {streaks.responsibleBetting.best}</Text>
              </View>

              <View style={styles.streakCard}>
                <Text style={styles.streakIcon}>💰</Text>
                <Text style={styles.streakValue}>{streaks.budgetCompliance.current}</Text>
                <Text style={styles.streakLabel}>Budget Days</Text>
                <Text style={styles.streakBest}>Best: {streaks.budgetCompliance.best}</Text>
              </View>

              <View style={styles.streakCard}>
                <Text style={styles.streakIcon}>🧘</Text>
                <Text style={styles.streakValue}>{streaks.noTilt.current}</Text>
                <Text style={styles.streakLabel}>No-Tilt Days</Text>
                <Text style={styles.streakBest}>Best: {streaks.noTilt.best}</Text>
              </View>

              <View style={styles.streakCard}>
                <Text style={styles.streakIcon}>📝</Text>
                <Text style={styles.streakValue}>{streaks.sessionJournal.current}</Text>
                <Text style={styles.streakLabel}>Journal Sessions</Text>
                <Text style={styles.streakBest}>Best: {streaks.sessionJournal.best}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Unlocked ({unlockedAchievements.length})</Text>
            {unlockedAchievements
              .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0))
              .map((achievement) => (
                <View key={achievement.id} style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                    {achievement.unlockedAt && (
                      <Text style={styles.achievementDate}>
                        Unlocked {formatDate(achievement.unlockedAt)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              ))}
          </View>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Locked ({lockedAchievements.length})</Text>
            {lockedAchievements.map((achievement) => (
              <View key={achievement.id} style={[styles.achievementCard, styles.lockedCard]}>
                <Text style={styles.achievementIconLocked}>{achievement.icon}</Text>
                <View style={styles.achievementContent}>
                  <Text style={styles.achievementTitleLocked}>{achievement.title}</Text>
                  <Text style={styles.achievementDescriptionLocked}>
                    {achievement.description}
                  </Text>
                </View>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            ))}
          </View>
        )}

        {/* Streak Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📖 About Streaks</Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Responsible Days:</Text> Stay within budget AND avoid
            tilt warnings
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Budget Days:</Text> Stay under your weekly loss limit
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>No-Tilt Days:</Text> Avoid tilt warnings and
            interventions
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Journal Sessions:</Text> Add reflections after betting
            sessions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  progressCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  progressStats: {
    fontSize: 14,
    color: '#aaa',
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
  streaksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  streakCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  streakIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 4,
  },
  streakBest: {
    fontSize: 10,
    color: '#666',
  },
  achievementCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  lockedCard: {
    borderColor: '#333',
    opacity: 0.7,
  },
  achievementIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  achievementIconLocked: {
    fontSize: 40,
    marginRight: 16,
    opacity: 0.4,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 18,
    marginBottom: 4,
  },
  achievementDescriptionLocked: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  achievementDate: {
    fontSize: 11,
    color: '#4CAF50',
  },
  checkmark: {
    fontSize: 24,
    color: '#4CAF50',
    marginLeft: 12,
  },
  lockIcon: {
    fontSize: 20,
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: '#1a1a2a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#ddd',
    lineHeight: 20,
    marginBottom: 8,
  },
  infoBold: {
    fontWeight: '600',
    color: '#fff',
  },
});
