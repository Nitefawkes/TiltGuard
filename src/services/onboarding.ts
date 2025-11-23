// Onboarding service for TiltGuard
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUserSettings } from './firebase';

const ONBOARDING_KEY = '@tiltguard_onboarding_completed';

export interface OnboardingData {
  weeklyBudget: number;
  weeklyLossLimit: number;
  coachTone: 'calm' | 'firm' | 'clinical';
  enableNotifications: boolean;
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.error('Error marking onboarding complete:', error);
    throw error;
  }
}

/**
 * Reset onboarding status (for testing/debugging)
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    throw error;
  }
}

/**
 * Complete onboarding and save user preferences
 */
export async function completeOnboarding(
  userId: string,
  data: OnboardingData
): Promise<void> {
  try {
    // Update user settings in Firebase
    await updateUserSettings(userId, {
      weeklyBudget: data.weeklyBudget,
      weeklyLossLimit: data.weeklyLossLimit,
      coachTone: data.coachTone,
      notifications: {
        enabled: data.enableNotifications,
        tiltWarnings: data.enableNotifications,
        coolOffReminders: data.enableNotifications,
        budgetAlerts: data.enableNotifications,
        weeklySummary: data.enableNotifications,
        milestones: data.enableNotifications,
        dailyReminder: false, // User can enable later
        dailyReminderTime: 20,
        pushToken: null,
      },
    });

    // Mark onboarding as complete locally
    await markOnboardingComplete();
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
}

/**
 * Onboarding steps content
 */
export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to TiltGuard',
    description:
      'Your personal coach for responsible sports betting. Track bets, detect tilt, and build better habits.',
    icon: '🛡️',
  },
  {
    id: 'tilt-detection',
    title: 'Tilt Detection',
    description:
      'We monitor your betting patterns and warn you when emotions might be taking over. Cool-off periods help you reset.',
    icon: '⚠️',
  },
  {
    id: 'analytics',
    title: 'Smart Analytics',
    description:
      'Discover patterns in your betting with charts, insights, and personalized recommendations based on your data.',
    icon: '📊',
  },
  {
    id: 'budget',
    title: 'Budget Management',
    description:
      'Set weekly budgets and loss limits. Get alerts before you exceed them. Stay in control of your spending.',
    icon: '💰',
  },
  {
    id: 'notifications',
    title: 'Stay Informed',
    description:
      'Receive tilt warnings, budget alerts, cool-off reminders, and curated content from responsible gambling experts.',
    icon: '🔔',
  },
  {
    id: 'setup',
    title: "Let's Get Started",
    description:
      'Set your budget and choose your coach tone. You can always change these later in settings.',
    icon: '⚙️',
  },
];

/**
 * Default budget suggestions
 */
export const BUDGET_PRESETS = [
  { label: '$50/week', value: 50 },
  { label: '$100/week', value: 100 },
  { label: '$250/week', value: 250 },
  { label: '$500/week', value: 500 },
  { label: 'Custom', value: 0 },
];

/**
 * Coach tone options with descriptions
 */
export const COACH_TONE_OPTIONS = [
  {
    value: 'calm' as const,
    label: 'Calm',
    description: 'Gentle reminders and supportive guidance',
    emoji: '🧘',
  },
  {
    value: 'firm' as const,
    label: 'Firm',
    description: 'Direct, no-nonsense accountability',
    emoji: '💪',
  },
  {
    value: 'clinical' as const,
    label: 'Clinical',
    description: 'Data-focused, objective analysis',
    emoji: '📋',
  },
];
