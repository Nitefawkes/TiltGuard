// Onboarding screen for TiltGuard
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks';
import {
  completeOnboarding,
  ONBOARDING_STEPS,
  BUDGET_PRESETS,
  COACH_TONE_OPTIONS,
  OnboardingData,
} from '../src/services/onboarding';
import { requestPermissions } from '../src/services/notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [weeklyBudget, setWeeklyBudget] = useState(100);
  const [customBudget, setCustomBudget] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(1); // $100
  const [coachTone, setCoachTone] = useState<'calm' | 'firm' | 'clinical'>('calm');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  const totalPages = ONBOARDING_STEPS.length;

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const goToPage = (page: number) => {
    scrollViewRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
    setCurrentPage(page);
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Onboarding?',
      'You can always update your preferences in Settings later.',
      [
        { text: 'Continue Setup', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              setIsCompleting(true);
              // Use default values
              await completeOnboarding(user.uid, {
                weeklyBudget: 100,
                weeklyLossLimit: 80,
                coachTone: 'calm',
                enableNotifications: false,
              });
              router.replace('/(tabs)');
            } catch (error) {
              Alert.alert('Error', 'Failed to skip onboarding. Please try again.');
            } finally {
              setIsCompleting(false);
            }
          },
        },
      ]
    );
  };

  const handleComplete = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to complete onboarding.');
      return;
    }

    // Validate budget
    const finalBudget = selectedPreset === 4 ? parseFloat(customBudget) : weeklyBudget;
    if (isNaN(finalBudget) || finalBudget <= 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid budget amount.');
      return;
    }

    setIsCompleting(true);

    try {
      // Request notification permissions if enabled
      if (enableNotifications) {
        await requestPermissions();
      }

      // Complete onboarding with user preferences
      const data: OnboardingData = {
        weeklyBudget: finalBudget,
        weeklyLossLimit: finalBudget * 0.8, // Default to 80% of budget
        coachTone,
        enableNotifications,
      };

      await completeOnboarding(user.uid, data);

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Onboarding completion error:', error);
      Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleBudgetPresetSelect = (index: number, value: number) => {
    setSelectedPreset(index);
    if (value > 0) {
      setWeeklyBudget(value);
    }
  };

  const renderInfoPage = (step: typeof ONBOARDING_STEPS[0]) => (
    <View style={styles.page} key={step.id}>
      <View style={styles.content}>
        <Text style={styles.icon}>{step.icon}</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
      </View>
    </View>
  );

  const renderSetupPage = () => (
    <View style={styles.page} key="setup">
      <ScrollView style={styles.setupContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.setupIcon}>⚙️</Text>
        <Text style={styles.title}>Let's Get Started</Text>
        <Text style={styles.setupSubtitle}>
          Set your preferences. You can change these anytime in Settings.
        </Text>

        {/* Budget Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Budget</Text>
          <View style={styles.presetGrid}>
            {BUDGET_PRESETS.map((preset, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.presetButton, selectedPreset === index && styles.presetSelected]}
                onPress={() => handleBudgetPresetSelect(index, preset.value)}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedPreset === index && styles.presetTextSelected,
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedPreset === 4 && (
            <TextInput
              style={styles.customInput}
              placeholder="Enter custom amount"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={customBudget}
              onChangeText={setCustomBudget}
            />
          )}
        </View>

        {/* Coach Tone Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coach Tone</Text>
          {COACH_TONE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.toneOption, coachTone === option.value && styles.toneSelected]}
              onPress={() => setCoachTone(option.value)}
            >
              <View style={styles.toneHeader}>
                <Text style={styles.toneEmoji}>{option.emoji}</Text>
                <Text style={styles.toneLabel}>{option.label}</Text>
              </View>
              <Text style={styles.toneDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setEnableNotifications(!enableNotifications)}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Enable Notifications</Text>
              <Text style={styles.toggleDescription}>
                Tilt warnings, budget alerts, and helpful reminders
              </Text>
            </View>
            <View style={[styles.toggle, enableNotifications && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleThumb,
                  enableNotifications && styles.toggleThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {currentPage < totalPages - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pages */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        scrollEnabled={currentPage < totalPages - 1} // Disable scroll on setup page
      >
        {ONBOARDING_STEPS.slice(0, -1).map((step) => renderInfoPage(step))}
        {renderSetupPage()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Page Indicators */}
        <View style={styles.indicators}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[styles.indicator, currentPage === index && styles.indicatorActive]}
            />
          ))}
        </View>

        {/* Action Button */}
        {currentPage < totalPages - 1 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.completeButton, isCompleting && styles.completeButtonDisabled]}
            onPress={handleComplete}
            disabled={isCompleting}
          >
            <Text style={styles.completeButtonText}>
              {isCompleting ? 'Setting up...' : "Let's Go!"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    height: 70,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: '#888',
    fontSize: 16,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
  },
  setupContent: {
    flex: 1,
    width: SCREEN_WIDTH,
    paddingHorizontal: 20,
  },
  setupIcon: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 10,
  },
  setupSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  presetSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2a1a',
  },
  presetText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  presetTextSelected: {
    color: '#4CAF50',
  },
  customInput: {
    marginTop: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  toneOption: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  toneSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2a1a',
  },
  toneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  toneEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  toneLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  toneDescription: {
    fontSize: 14,
    color: '#888',
    marginLeft: 34,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#888',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 20,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  indicatorActive: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
