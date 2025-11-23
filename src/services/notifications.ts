// Push Notification service for TiltGuard

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { TriggerType, UserStats } from '../types';

/**
 * Configure notification handler
 * This determines how notifications are shown when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get push token
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });

    // Create specific channels for different notification types
    await Notifications.setNotificationChannelAsync('tilt-warnings', {
      name: 'Tilt Warnings',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#ef4444',
      description: 'Notifications when tilt triggers are detected',
    });

    await Notifications.setNotificationChannelAsync('cool-off', {
      name: 'Cool-Off Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f59e0b',
      description: 'Reminders about active cool-off periods',
    });

    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Achievements',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#10b981',
      description: 'Milestone celebrations and achievements',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: 'your-expo-project-id', // TODO: Replace with actual project ID
        })
      ).data;
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a tilt warning notification
 */
export async function scheduleTiltWarningNotification(
  triggerType: TriggerType,
  message: string
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🛡️ TiltGuard Alert',
        body: message,
        data: { type: 'tilt-warning', triggerType },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'tilt-warning',
      },
      trigger: null, // Send immediately
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling tilt warning notification:', error);
    return null;
  }
}

/**
 * Schedule a cool-off reminder notification
 */
export async function scheduleCoolOffReminder(
  endTime: number,
  duration: string
): Promise<string | null> {
  try {
    const now = Date.now();
    const timeUntilEnd = endTime - now;

    if (timeUntilEnd <= 0) return null;

    // Schedule notification for when cool-off ends
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Cool-Off Complete',
        body: `Your ${duration} cool-off period has ended. You can now place bets again.`,
        data: { type: 'cool-off-end' },
        sound: true,
        categoryIdentifier: 'cool-off',
      },
      trigger: {
        seconds: Math.floor(timeUntilEnd / 1000),
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling cool-off reminder:', error);
    return null;
  }
}

/**
 * Schedule a budget warning notification
 */
export async function scheduleBudgetWarningNotification(
  percentageUsed: number,
  weeklySpend: number,
  weeklyLimit: number
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Budget Alert',
        body: `You've used ${percentageUsed.toFixed(
          0
        )}% of your weekly budget ($${weeklySpend.toFixed(
          2
        )} / $${weeklyLimit.toFixed(2)})`,
        data: { type: 'budget-warning', percentageUsed },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        categoryIdentifier: 'budget',
      },
      trigger: null,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling budget warning:', error);
    return null;
  }
}

/**
 * Schedule a weekly summary notification
 */
export async function scheduleWeeklySummaryNotification(
  stats: UserStats
): Promise<string | null> {
  try {
    const weeklyNetPL = stats.weeklyWins - stats.weeklyLosses;
    const isProfit = weeklyNetPL > 0;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: isProfit ? '🎉 Great Week!' : '📊 Weekly Summary',
        body: `This week: ${stats.totalBets} bets, ${
          isProfit ? `+$${weeklyNetPL.toFixed(2)}` : `-$${Math.abs(weeklyNetPL).toFixed(2)}`
        } P/L. ${isProfit ? 'Keep up the disciplined betting!' : 'Stay focused on your strategy.'}`,
        data: { type: 'weekly-summary', stats },
        sound: true,
        categoryIdentifier: 'summary',
      },
      trigger: null,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling weekly summary:', error);
    return null;
  }
}

/**
 * Schedule a milestone achievement notification
 */
export async function scheduleMilestoneNotification(
  milestone: string,
  description: string
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏆 ${milestone}`,
        body: description,
        data: { type: 'milestone', milestone },
        sound: true,
        categoryIdentifier: 'achievements',
      },
      trigger: null,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling milestone notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(
  notificationId: string
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Check milestone achievements and notify
 */
export function checkMilestones(stats: UserStats): {
  milestone: string;
  description: string;
} | null {
  // Check for various milestones
  if (stats.totalBets === 10) {
    return {
      milestone: 'First 10 Bets',
      description: "You've tracked your first 10 bets. Great start!",
    };
  }

  if (stats.totalBets === 50) {
    return {
      milestone: '50 Bets Tracked',
      description: 'Halfway to 100! Your data is getting more valuable.',
    };
  }

  if (stats.totalBets === 100) {
    return {
      milestone: '100 Bets Milestone',
      description: 'Century! Your betting patterns are now crystal clear.',
    };
  }

  if (stats.consecutiveLosses === 0 && stats.totalBets > 5) {
    return {
      milestone: 'Breaking the Streak',
      description: 'No active losing streak. Disciplined betting pays off!',
    };
  }

  if (stats.winRate >= 60 && stats.totalBets >= 20) {
    return {
      milestone: '60% Win Rate',
      description: `Impressive ${stats.winRate.toFixed(0)}% win rate over ${
        stats.totalBets
      } bets!`,
    };
  }

  if (stats.totalPL > 500) {
    return {
      milestone: '$500 Profit',
      description: `You're up $${stats.totalPL.toFixed(2)}! Excellent work.`,
    };
  }

  return null;
}

/**
 * Schedule a daily reminder notification
 */
export async function scheduleDailyReminder(
  hour: number = 20
): Promise<string | null> {
  try {
    // Cancel any existing daily reminders first
    const scheduled = await getAllScheduledNotifications();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'daily-reminder') {
        await cancelNotification(notif.identifier);
      }
    }

    // Schedule new daily reminder
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🛡️ Daily Check-In',
        body: 'How did your betting go today? Track your bets to stay accountable.',
        data: { type: 'daily-reminder' },
        sound: true,
        categoryIdentifier: 'reminder',
      },
      trigger: {
        hour,
        minute: 0,
        repeats: true,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return null;
  }
}

/**
 * Cancel daily reminder
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    const scheduled = await getAllScheduledNotifications();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'daily-reminder') {
        await cancelNotification(notif.identifier);
      }
    }
  } catch (error) {
    console.error('Error cancelling daily reminder:', error);
  }
}
