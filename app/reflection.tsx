// Pre-bet reflection screen shown when tilt is detected
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TriggerType } from '../src/types';

export default function ReflectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    triggerType: TriggerType;
    message: string;
    consecutiveLosses?: string;
    weeklySpend?: string;
    weeklyBudget?: string;
  }>();

  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: boolean }>({});
  const [canProceed, setCanProceed] = useState(false);

  // Reflection questions based on trigger type
  const questions = getReflectionQuestions(params.triggerType);

  useEffect(() => {
    // User must answer all questions to proceed
    const allAnswered = questions.every((q) => selectedAnswers[q.id] !== undefined);
    setCanProceed(allAnswered);
  }, [selectedAnswers, questions]);

  const handleAnswer = (questionId: string, isPositive: boolean) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: isPositive }));
  };

  const handleProceed = () => {
    // Check if user answered honestly (some negative answers are red flags)
    const hasRedFlags = questions.some(
      (q) => q.redFlagIfNo && selectedAnswers[q.id] === false
    );

    if (hasRedFlags) {
      Alert.alert(
        'Consider Taking a Break',
        "Based on your answers, it might be best to step away for now. Your future self will thank you.",
        [
          {
            text: 'Take a Break',
            style: 'default',
            onPress: () => router.back(),
          },
          {
            text: 'Continue Anyway',
            style: 'destructive',
            onPress: () => {
              // User really wants to proceed despite red flags
              router.back();
            },
          },
        ]
      );
    } else {
      // Allow them to proceed with breather
      router.back();
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const getTriggerIcon = (type: TriggerType) => {
    switch (type) {
      case 'LOSS_STREAK':
        return '📉';
      case 'DRAWDOWN':
        return '💸';
      case 'SESSION':
        return '⚡';
      default:
        return '⚠️';
    }
  };

  const consecutiveLosses = params.consecutiveLosses
    ? parseInt(params.consecutiveLosses)
    : 0;
  const weeklySpend = params.weeklySpend ? parseFloat(params.weeklySpend) : 0;
  const weeklyBudget = params.weeklyBudget ? parseFloat(params.weeklyBudget) : 0;
  const budgetUsedPercent = weeklyBudget > 0 ? (weeklySpend / weeklyBudget) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>{getTriggerIcon(params.triggerType)}</Text>
          <Text style={styles.title}>Hold On a Moment</Text>
          <Text style={styles.subtitle}>
            Our tilt detection system noticed something. Let's take a breath and reflect.
          </Text>
        </View>

        {/* Trigger Info */}
        <View style={styles.triggerCard}>
          <Text style={styles.triggerTitle}>Why we're checking in:</Text>
          <Text style={styles.triggerMessage}>{params.message}</Text>
        </View>

        {/* Current Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Current Status</Text>
          {consecutiveLosses > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Consecutive Losses:</Text>
              <Text style={styles.statValue}>{consecutiveLosses}</Text>
            </View>
          )}
          {weeklyBudget > 0 && (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Weekly Spend:</Text>
                <Text style={styles.statValue}>${weeklySpend.toFixed(2)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Budget Used:</Text>
                <Text style={[styles.statValue, budgetUsedPercent > 80 && styles.statDanger]}>
                  {budgetUsedPercent.toFixed(0)}%
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Reflection Questions */}
        <View style={styles.questionsSection}>
          <Text style={styles.questionsTitle}>Honest Self-Check</Text>
          <Text style={styles.questionsSubtitle}>
            Take a moment to answer these questions truthfully:
          </Text>

          {questions.map((question) => (
            <View key={question.id} style={styles.questionCard}>
              <Text style={styles.questionText}>{question.text}</Text>
              <View style={styles.answerButtons}>
                <TouchableOpacity
                  style={[
                    styles.answerButton,
                    selectedAnswers[question.id] === true && styles.answerButtonSelected,
                  ]}
                  onPress={() => handleAnswer(question.id, true)}
                >
                  <Text
                    style={[
                      styles.answerButtonText,
                      selectedAnswers[question.id] === true &&
                        styles.answerButtonTextSelected,
                    ]}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.answerButton,
                    selectedAnswers[question.id] === false && styles.answerButtonSelected,
                  ]}
                  onPress={() => handleAnswer(question.id, false)}
                >
                  <Text
                    style={[
                      styles.answerButtonText,
                      selectedAnswers[question.id] === false &&
                        styles.answerButtonTextSelected,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Support Message */}
        <View style={styles.supportCard}>
          <Text style={styles.supportText}>
            💙 Remember: The best bet is often no bet. It's okay to walk away.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Take a Break</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.proceedButton, !canProceed && styles.proceedButtonDisabled]}
          onPress={handleProceed}
          disabled={!canProceed}
        >
          <Text style={styles.proceedButtonText}>
            {canProceed ? 'Continue Anyway' : 'Answer All Questions'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface ReflectionQuestion {
  id: string;
  text: string;
  redFlagIfNo: boolean; // If answering "No" is a red flag
}

function getReflectionQuestions(triggerType: TriggerType): ReflectionQuestion[] {
  const commonQuestions: ReflectionQuestion[] = [
    {
      id: 'calm',
      text: 'Am I feeling calm and in control right now?',
      redFlagIfNo: true,
    },
    {
      id: 'afford',
      text: 'Can I afford to lose this bet without it affecting my life?',
      redFlagIfNo: true,
    },
    {
      id: 'research',
      text: 'Have I done proper research for this bet, or am I acting impulsively?',
      redFlagIfNo: true,
    },
  ];

  const specificQuestions: { [key in TriggerType]: ReflectionQuestion[] } = {
    LOSS_STREAK: [
      {
        id: 'chase',
        text: 'Am I trying to win back what I just lost?',
        redFlagIfNo: false, // "No" is good here
      },
      {
        id: 'emotional',
        text: 'Am I making this decision based on logic, not emotion?',
        redFlagIfNo: true,
      },
    ],
    DRAWDOWN: [
      {
        id: 'budget',
        text: 'Will this bet keep me within my weekly budget?',
        redFlagIfNo: true,
      },
      {
        id: 'stop',
        text: 'Have I considered just stopping for the week?',
        redFlagIfNo: true,
      },
    ],
    SESSION: [
      {
        id: 'rapid',
        text: 'Am I betting too quickly without thinking?',
        redFlagIfNo: false, // "No" is good here
      },
      {
        id: 'pace',
        text: 'Would taking a 10-minute break help me think more clearly?',
        redFlagIfNo: true,
      },
    ],
  };

  return [...commonQuestions, ...(specificQuestions[triggerType] || [])];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  triggerCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  triggerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 8,
  },
  triggerMessage: {
    fontSize: 15,
    color: '#ddd',
    lineHeight: 21,
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statDanger: {
    color: '#f44336',
  },
  questionsSection: {
    marginBottom: 24,
  },
  questionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  questionsSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 15,
    color: '#ddd',
    marginBottom: 12,
    lineHeight: 21,
  },
  answerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  answerButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
  },
  answerButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2a1a',
  },
  answerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  answerButtonTextSelected: {
    color: '#4CAF50',
  },
  supportCard: {
    backgroundColor: '#1a2a3a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  supportText: {
    fontSize: 15,
    color: '#ddd',
    lineHeight: 21,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#222',
    padding: 20,
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  proceedButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedButtonDisabled: {
    opacity: 0.5,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
