// TiltModal - 60-second breather modal for Pro users

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, colors } from './UI';
import { TriggerType, UserPlan, TILT_CONSTANTS } from '../types';
import { setCoolOff } from '../services/firebase';
import { calculateCoolOffEnd } from '../services/tiltDetection';

interface TiltModalProps {
  visible: boolean;
  onClose: () => void;
  triggerType: TriggerType;
  message: string;
  userPlan: UserPlan;
  userId: string;
}

export function TiltModal({
  visible,
  onClose,
  triggerType,
  message,
  userPlan,
  userId,
}: TiltModalProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(TILT_CONSTANTS.BREATHER_DURATION_SECONDS);
  const [coolOffInProgress, setCoolOffInProgress] = useState(false);

  // Reset countdown when modal opens
  useEffect(() => {
    if (visible) {
      setCountdown(TILT_CONSTANTS.BREATHER_DURATION_SECONDS);
    }
  }, [visible]);

  // Countdown timer for Pro users
  useEffect(() => {
    if (!visible || userPlan !== 'pro' || countdown === 0) return;

    const timer = setInterval(() => {
      setCountdown((prev: number) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, userPlan, countdown]);

  const handleCoolOff = async (duration: '1h' | '24h' | '3d') => {
    try {
      setCoolOffInProgress(true);
      const coolOffEnd = calculateCoolOffEnd(duration);
      await setCoolOff(userId, coolOffEnd);
      onClose();
    } catch (error) {
      console.error('Error setting cool-off:', error);
      alert('Failed to set cool-off. Please try again.');
    } finally {
      setCoolOffInProgress(false);
    }
  };

  const getTriggerIcon = (): string => {
    switch (triggerType) {
      case 'LOSS_STREAK':
        return '📉';
      case 'DRAWDOWN':
        return '⚠️';
      case 'SESSION':
        return '⚡';
      default:
        return '🛡️';
    }
  };

  const getTriggerTitle = (): string => {
    switch (triggerType) {
      case 'LOSS_STREAK':
        return 'Loss Streak Detected';
      case 'DRAWDOWN':
        return 'Approaching Your Limit';
      case 'SESSION':
        return 'High Velocity Betting';
      default:
        return 'TiltGuard Activated';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Free users can close, Pro users must wait
        if (userPlan === 'free' || countdown === 0) {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.icon}>{getTriggerIcon()}</Text>
            <Text style={styles.title}>{getTriggerTitle()}</Text>
          </View>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Pro User: Countdown Timer */}
          {userPlan === 'pro' && countdown > 0 && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Take a breath...</Text>
              <Text style={styles.countdown}>{countdown}s</Text>
            </View>
          )}

          {/* Pro User: Cool-off Options (after countdown) */}
          {userPlan === 'pro' && countdown === 0 && (
            <View style={styles.coolOffContainer}>
              <Text style={styles.coolOffTitle}>Want to take a longer break?</Text>
              <View style={styles.coolOffButtons}>
                <TouchableOpacity
                  style={styles.coolOffButton}
                  onPress={() => handleCoolOff('1h')}
                  disabled={coolOffInProgress}
                >
                  <Text style={styles.coolOffButtonText}>1 Hour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.coolOffButton}
                  onPress={() => handleCoolOff('24h')}
                  disabled={coolOffInProgress}
                >
                  <Text style={styles.coolOffButtonText}>24 Hours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.coolOffButton}
                  onPress={() => handleCoolOff('3d')}
                  disabled={coolOffInProgress}
                >
                  <Text style={styles.coolOffButtonText}>3 Days</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Free User: Upgrade CTA */}
          {userPlan === 'free' && (
            <View style={styles.upgradeContainer}>
              <Text style={styles.upgradeText}>
                Upgrade to Pro for 60-second breather pauses and cool-off features.
              </Text>
              <Button
                title="Upgrade to Pro"
                onPress={() => {
                  onClose();
                  router.push('/upgrade');
                }}
                variant="primary"
                style={styles.upgradeButton}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {userPlan === 'pro' && countdown === 0 && (
              <Button
                title="Continue"
                onPress={onClose}
                variant="primary"
                disabled={coolOffInProgress}
              />
            )}
            {userPlan === 'free' && (
              <Button
                title="Continue Anyway"
                onPress={onClose}
                variant="outline"
                style={styles.continueButton}
              />
            )}
          </View>

          {coolOffInProgress && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  countdownLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  countdown: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
  },
  coolOffContainer: {
    marginBottom: 24,
  },
  coolOffTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  coolOffButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  coolOffButton: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coolOffButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  upgradeContainer: {
    marginBottom: 16,
  },
  upgradeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  upgradeButton: {
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
  continueButton: {
    marginTop: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
});
