// RSS Feeds screen - Curated content for better betting decisions

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, useUserProfile } from '../src/hooks';
import { Card, Button, Banner, colors } from '../src/components/UI';
import {
  fetchAllFeeds,
  RSSFeedItem,
  RSSFeedConfig,
  CURATED_FEEDS,
  TriggerType,
  groupByFeedType,
  getHighPriorityItems,
} from '../src/services/rss';
import { updateUserSettings } from '../src/services/firebase';

const FEED_CACHE_KEY = '@tiltguard_rss_cache';

export default function FeedsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid || null);

  const [feeds, setFeeds] = useState<RSSFeedConfig[]>([...CURATED_FEEDS]);
  const [feedItems, setFeedItems] = useState<RSSFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | TriggerType>('all');

  useEffect(() => {
    loadCachedFeeds();
    if (profile?.settings.rss?.enabled) {
      refreshFeeds();
    }
  }, [profile]);

  const loadCachedFeeds = async () => {
    try {
      const cached = await AsyncStorage.getItem(FEED_CACHE_KEY);
      if (cached) {
        setFeedItems(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Error loading cached feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshFeeds = async () => {
    if (!profile?.settings.rss?.enabled) return;

    setRefreshing(true);
    try {
      // Filter feeds based on user settings
      const enabledFeedConfigs = feeds.filter((f) =>
        profile.settings.rss.enabledFeeds.includes(f.id)
      );

      const items = await fetchAllFeeds(enabledFeedConfigs);

      setFeedItems(items);

      // Cache the results
      await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(items));

      // Update last sync time
      if (user?.uid) {
        await updateUserSettings(user.uid, {
          rss: {
            ...profile.settings.rss,
            lastSync: Date.now(),
          },
        });
      }

      // Notify on high priority items if enabled
      if (profile.settings.rss.notifyOnHighPriority) {
        const highPriority = getHighPriorityItems(items);
        if (highPriority.length > 0) {
          const { scheduleMilestoneNotification } = await import(
            '../src/services/notifications'
          );
          if (profile.settings.notifications?.enabled) {
            await scheduleMilestoneNotification(
              'New Betting Insight',
              `${highPriority.length} important articles available in your feed`
            );
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing feeds:', error);
      Alert.alert('Error', 'Failed to refresh feeds. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleFeed = async (feedId: string) => {
    if (!user?.uid || !profile) return;

    const currentEnabled = profile.settings.rss.enabledFeeds;
    const newEnabled = currentEnabled.includes(feedId)
      ? currentEnabled.filter((id) => id !== feedId)
      : [...currentEnabled, feedId];

    try {
      await updateUserSettings(user.uid, {
        rss: {
          ...profile.settings.rss,
          enabledFeeds: newEnabled,
        },
      });

      // Refresh feeds with new configuration
      if (newEnabled.length > 0) {
        await refreshFeeds();
      }
    } catch (error) {
      console.error('Error updating feed settings:', error);
      Alert.alert('Error', 'Failed to update feed settings');
    }
  };

  const handleOpenArticle = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open article');
    }
  };

  const getFilteredItems = () => {
    if (selectedFilter === 'all') {
      return feedItems;
    }

    return feedItems.filter((item) => item.triggerType === selectedFilter);
  };

  const getFeedTypeIcon = (type: string) => {
    switch (type) {
      case 'responsible-gambling':
        return '🛡️';
      case 'betting-education':
        return '📚';
      case 'sports-news':
        return '📰';
      case 'injury-report':
        return '🏥';
      default:
        return '📄';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.danger;
      case 'medium':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!profile.settings.rss?.enabled) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Betting Insights</Text>
          <Text style={styles.subtitle}>
            Curated content to help you bet smarter
          </Text>
        </View>

        <Card style={styles.section}>
          <Text style={styles.disabledIcon}>📚</Text>
          <Text style={styles.disabledTitle}>Feeds Disabled</Text>
          <Text style={styles.disabledText}>
            Enable RSS feeds to get curated articles about responsible gambling,
            betting strategies, and sports news.
          </Text>
          <Button
            title="Enable Feeds"
            onPress={async () => {
              if (user?.uid) {
                await updateUserSettings(user.uid, {
                  rss: {
                    ...profile.settings.rss,
                    enabled: true,
                  },
                });
              }
            }}
            style={styles.enableButton}
          />
        </Card>

        <Button
          title="Back to Settings"
          onPress={() => router.back()}
          variant="outline"
          style={styles.backButton}
        />
      </ScrollView>
    );
  }

  const filteredItems = getFilteredItems();
  const groupedFeeds = groupByFeedType(filteredItems);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshFeeds} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Betting Insights 📚</Text>
        <Text style={styles.subtitle}>
          {feedItems.length} articles • Last updated{' '}
          {profile.settings.rss.lastSync
            ? new Date(profile.settings.rss.lastSync).toLocaleTimeString()
            : 'Never'}
        </Text>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <View style={styles.filters}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'tilt-management' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('tilt-management')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'tilt-management' &&
                  styles.filterChipTextActive,
              ]}
            >
              🛡️ Tilt Tips
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'bankroll-advice' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('bankroll-advice')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'bankroll-advice' &&
                  styles.filterChipTextActive,
              ]}
            >
              💰 Bankroll
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'strategy-tip' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('strategy-tip')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'strategy-tip' && styles.filterChipTextActive,
              ]}
            >
              📊 Strategy
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Feed Items */}
      {loading ? (
        <Card style={styles.section}>
          <Text style={styles.loadingText}>Loading feeds...</Text>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card style={styles.section}>
          <Text style={styles.emptyText}>
            {selectedFilter === 'all'
              ? 'No articles yet. Pull down to refresh!'
              : 'No articles in this category yet.'}
          </Text>
        </Card>
      ) : (
        filteredItems.map((item) => (
          <Card key={item.id} style={styles.articleCard}>
            <View style={styles.articleHeader}>
              <Text style={styles.articleSource}>
                {getFeedTypeIcon(item.feedType)} {item.source}
              </Text>
              {item.priority === 'high' && (
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(item.priority) },
                  ]}
                >
                  <Text style={styles.priorityText}>High Priority</Text>
                </View>
              )}
            </View>

            <Text style={styles.articleTitle}>{item.title}</Text>
            <Text style={styles.articleDescription} numberOfLines={3}>
              {item.description}
            </Text>

            <View style={styles.articleFooter}>
              <Text style={styles.articleDate}>
                {item.pubDate.toLocaleDateString()}
              </Text>
              <TouchableOpacity
                style={styles.readButton}
                onPress={() => handleOpenArticle(item.link)}
              >
                <Text style={styles.readButtonText}>Read Article →</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}

      {/* Feed Management */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Manage Feeds</Text>
        {feeds.map((feed) => (
          <View key={feed.id} style={styles.feedRow}>
            <View style={styles.feedInfo}>
              <Text style={styles.feedName}>
                {getFeedTypeIcon(feed.type)} {feed.name}
              </Text>
              <Text style={styles.feedType}>{feed.type.replace(/-/g, ' ')}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.feedToggle,
                profile.settings.rss.enabledFeeds.includes(feed.id) &&
                  styles.feedToggleActive,
              ]}
              onPress={() => handleToggleFeed(feed.id)}
            >
              <Text style={styles.feedToggleText}>
                {profile.settings.rss.enabledFeeds.includes(feed.id)
                  ? '✓'
                  : ' '}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </Card>

      <Button
        title="Back to Settings"
        onPress={() => router.back()}
        variant="outline"
        style={styles.backButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  articleCard: {
    marginHorizontal: 24,
    marginBottom: 12,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  articleSource: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 22,
  },
  articleDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  readButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  readButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  feedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feedInfo: {
    flex: 1,
  },
  feedName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  feedType: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  feedToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  feedToggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  disabledIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  disabledText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  enableButton: {
    marginTop: 8,
  },
  backButton: {
    marginHorizontal: 24,
    marginVertical: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
