// Notification Settings screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useUserProfile, useNotifications } from '../src/hooks';
import { Card, Button, Banner, colors } from '../src/components/UI';
import { updateNotificationSettings } from '../src/services/firebase';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../src/services/notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid || null);
  const {
    permission,
    requestPermissions,
    disableNotifications,
    checkPermissions,
  } = useNotifications(user?.uid || null);

  const [enabled, setEnabled] = useState(false);
  const [tiltWarnings, setTiltWarnings] = useState(true);
  const [coolOffReminders, setCoolOffReminders] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [milestones, setMilestones] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.settings.notifications) {
      const notifSettings = profile.settings.notifications;
      setEnabled(notifSettings.enabled);
      setTiltWarnings(notifSettings.tiltWarnings);
      setCoolOffReminders(notifSettings.coolOffReminders);
      setBudgetAlerts(notifSettings.budgetAlerts);
      setWeeklySummary(notifSettings.weeklySummary);
      setMilestones(notifSettings.milestones);
      setDailyReminder(notifSettings.dailyReminder);
      setDailyReminderTime(notifSettings.dailyReminderTime);
    }
  }, [profile]);

  const handleEnableNotifications = async (value: boolean) => {
    if (!user?.uid) return;

    if (value && permission !== 'granted') {
      // Request permissions
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in your device settings to use this feature.'
        );
        return;
      }
    }

    setEnabled(value);

    if (!value) {
      // Disable all notifications
      await disableNotifications();
    } else {
      // Enable notifications
      await updateNotificationSettings(user.uid, { enabled: true });
    }
  };

  const handleToggleSetting = async (
    key: keyof typeof profile.settings.notifications,
    value: boolean
  ) => {
    if (!user?.uid || !enabled) return;

    setSaving(true);
    try {
      await updateNotificationSettings(user.uid, { [key]: value });

      // Update local state
      switch (key) {
        case 'tiltWarnings':
          setTiltWarnings(value);
          break;
        case 'coolOffReminders':
          setCoolOffReminders(value);
          break;
        case 'budgetAlerts':
          setBudgetAlerts(value);
          break;
        case 'weeklySummary':
          setWeeklySummary(value);
          break;
        case 'milestones':
          setMilestones(value);
          break;
        case 'dailyReminder':
          setDailyReminder(value);
          // Schedule or cancel daily reminder
          if (value) {
            await scheduleDailyReminder(dailyReminderTime);
          } else {
            await cancelDailyReminder();
          }
          break;
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeDailyReminderTime = async (hour: number) => {
    if (!user?.uid || !enabled) return;

    setSaving(true);
    try {
      setDailyReminderTime(hour);
      await updateNotificationSettings(user.uid, { dailyReminderTime: hour });

      if (dailyReminder) {
        // Reschedule with new time
        await scheduleDailyReminder(hour);
      }
    } catch (error) {
      console.error('Error updating reminder time:', error);
      Alert.alert('Error', 'Failed to update reminder time');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          Stay on track with real-time alerts and reminders
        </Text>
      </View>

      {/* Permission Banner */}
      {permission === 'denied' && (
        <Banner
          message="Notifications are disabled. Enable them in your device settings to receive alerts."
          type="warning"
          style={styles.banner}
        />
      )}

      {permission === 'undetermined' && (
        <Banner
          message="Enable notifications to get real-time tilt warnings and helpful reminders."
          type="info"
          style={styles.banner}
        />
      )}

      {/* Master Switch */}
      <Card style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Enable Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive push notifications for important events
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleEnableNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>
      </Card>

      {/* Notification Types */}
      {enabled && (
        <>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Alert Types</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>🛡️ Tilt Warnings</Text>
                <Text style={styles.settingDescription}>
                  Get notified when tilt triggers are detected
                </Text>
              </View>
              <Switch
                value={tiltWarnings}
                onValueChange={(value) =>
                  handleToggleSetting('tiltWarnings', value)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textPrimary}
                disabled={!enabled}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>⏰ Cool-Off Reminders</Text>
                <Text style={styles.settingDescription}>
                  Reminders when cool-off periods end
                </Text>
              </View>
              <Switch
                value={coolOffReminders}
                onValueChange={(value) =>
                  handleToggleSetting('coolOffReminders', value)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textPrimary}
                disabled={!enabled}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>💰 Budget Alerts</Text>
                <Text style={styles.settingDescription}>
                  Alerts when approaching weekly budget limits
                </Text>
              </View>
              <Switch
                value={budgetAlerts}
                onValueChange={(value) =>
                  handleToggleSetting('budgetAlerts', value)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textPrimary}
                disabled={!enabled}
              />
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Reports & Celebrations</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>📊 Weekly Summary</Text>
                <Text style={styles.settingDescription}>
                  Get weekly performance summaries
                </Text>
              </View>
              <Switch
                value={weeklySummary}
                onValueChange={(value) =>
                  handleToggleSetting('weeklySummary', value)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textPrimary}
                disabled={!enabled}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>🏆 Milestones</Text>
                <Text style={styles.settingDescription}>
                  Celebrate achievements and milestones
                </Text>
              </View>
              <Switch
                value={milestones}
                onValueChange={(value) =>
                  handleToggleSetting('milestones', value)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textPrimary}
                disabled={!enabled}
              />
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Reminder</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>📅 Daily Check-In</Text>
                <Text style={styles.settingDescription}>
                  Daily reminder to track your bets
                </Text>
              </View>
              <Switch
                value={dailyReminder}
                onValueChange={(value) =>
                  handleToggleSetting('dailyReminder', value)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textPrimary}
                disabled={!enabled}
              />
            </View>

            {dailyReminder && (
              <View style={styles.timeSelector}>
                <Text style={styles.timeSelectorLabel}>Reminder Time:</Text>
                <View style={styles.timeButtons}>
                  {[18, 19, 20, 21, 22].map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.timeButton,
                        dailyReminderTime === hour && styles.timeButtonActive,
                      ]}
                      onPress={() => handleChangeDailyReminderTime(hour)}
                    >
                      <Text
                        style={[
                          styles.timeButtonText,
                          dailyReminderTime === hour &&
                            styles.timeButtonTextActive,
                        ]}
                      >
                        {hour > 12 ? `${hour - 12} PM` : `${hour} PM`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </Card>
        </>
      )}

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
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  banner: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  timeSelector: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  timeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  timeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeButtonTextActive: {
    color: colors.primary,
  },
  backButton: {
    marginHorizontal: 24,
    marginVertical: 24,
  },
  loadingText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
});
