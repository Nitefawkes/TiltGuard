// Signup screen with onboarding

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { createUserProfile } from '../../src/services/firebase';
import { Button, colors } from '../../src/components/UI';

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'account' | 'onboarding'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [weeklyBudget, setWeeklyBudget] = useState('');
  const [weeklyLossLimit, setWeeklyLossLimit] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setStep('onboarding');
  };

  const handleCompleteSignup = async () => {
    const budget = parseFloat(weeklyBudget);
    const limit = parseFloat(weeklyLossLimit);

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

    setLoading(true);
    try {
      // Create Firebase auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Create user profile in Firestore
      await createUserProfile(userCredential.user.uid, email, {
        weeklyBudget: budget,
        weeklyLossLimit: limit,
      });

      // Navigation handled by _layout.tsx
    } catch (error: any) {
      console.error('Signup error:', error);
      Alert.alert('Signup Failed', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'account') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.icon}>🛡️</Text>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join TiltGuard</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <Button
                title="Next"
                onPress={handleCreateAccount}
                style={styles.nextButton}
              />

              <Button
                title="Back to Login"
                onPress={() => router.back()}
                variant="outline"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Onboarding step
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Set Your Limits</Text>
            <Text style={styles.subtitle}>
              These help TiltGuard protect you from emotional betting
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Weekly Budget</Text>
              <Text style={styles.hint}>How much do you plan to bet this week?</Text>
              <View style={styles.dollarInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.dollarInput}
                  value={weeklyBudget}
                  onChangeText={setWeeklyBudget}
                  placeholder="150"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Weekly Loss Limit</Text>
              <Text style={styles.hint}>What's the maximum you're willing to lose?</Text>
              <View style={styles.dollarInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.dollarInput}
                  value={weeklyLossLimit}
                  onChangeText={setWeeklyLossLimit}
                  placeholder="100"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 TiltGuard will warn you when you approach these limits
              </Text>
            </View>

            <Button
              title="Complete Setup"
              onPress={handleCompleteSignup}
              loading={loading}
              style={styles.completeButton}
            />

            <Button
              title="Back"
              onPress={() => setStep('account')}
              variant="outline"
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
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
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 14,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  dollarInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
  },
  dollarInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  infoBox: {
    backgroundColor: `${colors.info}20`,
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  nextButton: {
    marginTop: 8,
  },
  completeButton: {
    marginTop: 8,
  },
});
