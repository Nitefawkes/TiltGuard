// Settings screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { useAuth, useUserProfile, useUserStats } from '../../src/hooks';
import { Card, Button, Banner, colors } from '../../src/components/UI';
import {
  updateUserSettings,
  cancelCoolOff,
} from '../../src/services/firebase';
import { isCoolOffActive, getCoolOffRemaining } from '../../src/services/tiltDetection';
import { CoachTone } from '../../src/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid || null);
  const { stats, refresh: refreshStats } = useUserStats(user?.uid || null);

  const [weeklyBudget, setWeeklyBudget] = useState('');
  const [weeklyLossLimit, setWeeklyLossLimit] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdateLimits = async () => {
    if (!user?.uid || !profile) return;

    const budget = weeklyBudget ? parseFloat(weeklyBudget) : profile.settings.weeklyBudget;
    const limit = weeklyLossLimit
      ? parseFloat(weeklyLossLimit)
      : profile.settings.weeklyLossLimit;

    if (isNaN(budget) || budget <= 0) {
      Alert.alert('Error', 'Please enter a valid weekly budget');
      return;
    }

    if (isNaN(limit) || limit <= 0) {
      Alert.alert('Error', 'Please enter a valid weekly loss limit');
      return;
    }

    if (limit > budget) {
      Alert.alert('Error', 'Loss limit cannot exceed your budget');
      return;
    }

    setUpdating(true);
    try {
      await updateUserSettings(user.uid, {
        weeklyBudget: budget,
        weeklyLossLimit: limit,
      });

      setWeeklyBudget('');
      setWeeklyLossLimit('');
      Alert.alert('Success', 'Limits updated successfully');
    } catch (error) {
      console.error('Error updating limits:', error);
      Alert.alert('Error', 'Failed to update limits');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeCoachTone = async (tone: CoachTone) => {
    if (!user?.uid) return;

    try {
      await updateUserSettings(user.uid, { coachTone: tone });
      Alert.alert('Success', `Coach tone changed to ${tone}`);
    } catch (error) {
      console.error('Error changing tone:', error);
      Alert.alert('Error', 'Failed to change coach tone');
    }
  };

  const handleCancelCoolOff = async () => {
    if (!user?.uid) return;

    Alert.alert(
      'Cancel Cool-Off',
      'Are you sure you want to cancel your cool-off period?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await cancelCoolOff(user.uid);
              await refreshStats();
              Alert.alert('Success', 'Cool-off cancelled');
            } catch (error) {
              console.error('Error cancelling cool-off:', error);
              Alert.alert('Error', 'Failed to cancel cool-off');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  if (profileLoading || !profile || !stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const isCoolOff = isCoolOffActive(stats);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings ⚙️</Text>
        </View>

        {/* Account Info */}
        <Card>
          <Text style={styles.cardTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan</Text>
            <Text style={styles.infoValue}>
              {profile.plan === 'pro' ? 'Pro' : 'Free'}
            </Text>
          </View>
          {profile.plan === 'free' && (
            <Button
              title="Upgrade to Pro - $4.99/mo"
              onPress={() => router.push('/upgrade')}
              style={styles.upgradeButton}
            />
          )}
        </Card>

        {/* Update Limits */}
        <Card>
          <Text style={styles.cardTitle}>Update Limits</Text>
          <View style={styles.currentLimits}>
            <Text style={styles.currentLimitText}>
              Current Budget: ${profile.settings.weeklyBudget.toFixed(2)}
            </Text>
            <Text style={styles.currentLimitText}>
              Current Loss Limit: ${profile.settings.weeklyLossLimit.toFixed(2)}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Weekly Budget ($)</Text>
            <TextInput
              style={styles.input}
              value={weeklyBudget}
              onChangeText={setWeeklyBudget}
              placeholder={profile.settings.weeklyBudget.toString()}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Weekly Loss Limit ($)</Text>
            <TextInput
              style={styles.input}
              value={weeklyLossLimit}
              onChangeText={setWeeklyLossLimit}
              placeholder={profile.settings.weeklyLossLimit.toString()}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <Button title="Update Limits" onPress={handleUpdateLimits} loading={updating} />
        </Card>

        {/* Coach Tone (Pro Feature) */}
        {profile.plan === 'pro' && (
          <Card>
            <Text style={styles.cardTitle}>Coach Tone</Text>
            <Text style={styles.cardSubtitle}>
              How TiltGuard speaks to you when triggers fire
            </Text>
            <View style={styles.toneButtons}>
              <TouchableOpacity
                style={[
                  styles.toneButton,
                  profile.settings.coachTone === 'calm' && styles.toneButtonActive,
                ]}
                onPress={() => handleChangeCoachTone('calm')}
              >
                <Text style={styles.toneButtonText}>Calm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toneButton,
                  profile.settings.coachTone === 'firm' && styles.toneButtonActive,
                ]}
                onPress={() => handleChangeCoachTone('firm')}
              >
                <Text style={styles.toneButtonText}>Firm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toneButton,
                  profile.settings.coachTone === 'clinical' && styles.toneButtonActive,
                ]}
                onPress={() => handleChangeCoachTone('clinical')}
              >
                <Text style={styles.toneButtonText}>Clinical</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Cool-Off Status */}
        {isCoolOff && (
          <Card>
            <Text style={styles.cardTitle}>Cool-Off Active</Text>
            <Banner
              message={`${getCoolOffRemaining(stats)} remaining`}
              type="warning"
              style={styles.coolOffBanner}
            />
            <Button title="Cancel Cool-Off" onPress={handleCancelCoolOff} variant="outline" />
          </Card>
        )}

        {/* Sign Out */}
        <Button title="Sign Out" onPress={handleSignOut} variant="danger" />
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
  loadingText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  upgradeButton: {
    marginTop: 12,
  },
  currentLimits: {
    marginBottom: 16,
  },
  currentLimitText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
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
  toneButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toneButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  toneButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  toneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  coolOffBanner: {
    marginBottom: 12,
  },
});
