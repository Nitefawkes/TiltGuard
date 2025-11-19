// Firebase Setup Helper Screen

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { colors } from './UI';

export function FirebaseSetupScreen() {
  const openFirebaseConsole = () => {
    Linking.openURL('https://console.firebase.google.com/');
  };

  const openTestingGuide = () => {
    Linking.openURL('https://github.com/Nitefawkes/TiltGuard/blob/main/TESTING.md');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Firebase Not Configured</Text>
        <Text style={styles.subtitle}>
          Please set up Firebase to use TiltGuard
        </Text>

        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Quick Setup (5 minutes):</Text>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>1.</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepText}>
                Go to Firebase Console and create a project
              </Text>
              <TouchableOpacity style={styles.link} onPress={openFirebaseConsole}>
                <Text style={styles.linkText}>→ Open Firebase Console</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>2.</Text>
            <Text style={styles.stepText}>
              Enable <Text style={styles.bold}>Email/Password</Text> authentication
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>3.</Text>
            <Text style={styles.stepText}>
              Enable <Text style={styles.bold}>Firestore Database</Text>
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>4.</Text>
            <Text style={styles.stepText}>
              Get your web app config from Project Settings
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNumber}>5.</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepText}>
                Paste config into <Text style={styles.code}>src/config/firebase.ts</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.codeExample}>
          <Text style={styles.codeTitle}>Your config should look like:</Text>
          <Text style={styles.codeBlock}>
            {`const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};`}
          </Text>
        </View>

        <TouchableOpacity style={styles.guideButton} onPress={openTestingGuide}>
          <Text style={styles.guideButtonText}>📖 View Full Setup Guide</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          After updating firebase.ts, refresh this page
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  stepsContainer: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 32,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 12,
    minWidth: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  code: {
    fontFamily: 'monospace',
    color: colors.primary,
    fontSize: 14,
  },
  link: {
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  codeExample: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  codeBlock: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  guideButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 24,
  },
  guideButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footer: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
