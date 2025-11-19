// Reusable UI components for TiltGuard

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';

// ==================== COLORS ====================

export const colors = {
  // Primary palette
  primary: '#6366f1', // Indigo
  primaryDark: '#4f46e5',
  secondary: '#10b981', // Green
  danger: '#ef4444', // Red
  warning: '#f59e0b', // Amber

  // Backgrounds
  background: '#0f172a', // Dark blue
  surface: '#1e293b',
  surfaceLight: '#334155',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Status
  success: '#10b981',
  error: '#ef4444',
  info: '#3b82f6',
};

// ==================== BUTTON COMPONENT ====================

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const base = styles.button;

    if (disabled) return { ...base, backgroundColor: colors.surfaceLight };

    switch (variant) {
      case 'primary':
        return { ...base, backgroundColor: colors.primary };
      case 'secondary':
        return { ...base, backgroundColor: colors.secondary };
      case 'danger':
        return { ...base, backgroundColor: colors.danger };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      default:
        return { ...base, backgroundColor: colors.primary };
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// ==================== CARD COMPONENT ====================

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ==================== STAT DISPLAY COMPONENT ====================

interface StatDisplayProps {
  label: string;
  value: string | number;
  positive?: boolean;
  negative?: boolean;
  style?: ViewStyle;
}

export function StatDisplay({
  label,
  value,
  positive = false,
  negative = false,
  style,
}: StatDisplayProps) {
  const getValueColor = (): string => {
    if (positive) return colors.success;
    if (negative) return colors.error;
    return colors.textPrimary;
  };

  return (
    <View style={[styles.statContainer, style]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: getValueColor() }]}>{value}</Text>
    </View>
  );
}

// ==================== INPUT COMPONENT ====================

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  secureTextEntry?: boolean;
  style?: ViewStyle;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  style,
}: InputProps) {
  return (
    <View style={[styles.inputContainer, style]}>
      <Text style={styles.inputText}>{value}</Text>
    </View>
  );
}

// ==================== PROGRESS BAR ====================

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = colors.primary,
  height = 8,
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.progressBackground, { height }, style]}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${clampedProgress * 100}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

// ==================== BANNER ====================

interface BannerProps {
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  style?: ViewStyle;
}

export function Banner({ message, type = 'info', style }: BannerProps) {
  const getBannerColor = (): string => {
    switch (type) {
      case 'info':
        return colors.info;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'success':
        return colors.success;
      default:
        return colors.info;
    }
  };

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: `${getBannerColor()}20`, borderColor: getBannerColor() },
        style,
      ]}
    >
      <Text style={[styles.bannerText, { color: getBannerColor() }]}>{message}</Text>
    </View>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statContainer: {
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  progressBackground: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 4,
  },
  banner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
