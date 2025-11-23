// Emergency support resources and helplines
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks';
import { updateUserStats } from '../src/services/firebase';
import { unlockAchievement } from '../src/services/streaks';

export default function SupportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isActivatingSelfExclusion, setIsActivatingSelfExclusion] = useState(false);

  const handleCallHelpline = (number: string) => {
    Linking.openURL(`tel:${number}`).catch((err) =>
      console.error('Failed to open phone dialer:', err)
    );
  };

  const handleTextCrisisLine = (number: string) => {
    Linking.openURL(`sms:${number}`).catch((err) =>
      console.error('Failed to open messages:', err)
    );
  };

  const handleOpenWebsite = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const handleEmergencyStop = () => {
    Alert.alert(
      '72-Hour Self-Exclusion',
      'This will lock your account from placing bets for 72 hours. This is designed for moments when you need immediate protection. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate 72-Hour Lock',
          style: 'destructive',
          onPress: activateSelfExclusion,
        },
      ]
    );
  };

  const activateSelfExclusion = async () => {
    if (!user?.uid) return;

    setIsActivatingSelfExclusion(true);
    try {
      const lockUntil = Date.now() + 72 * 60 * 60 * 1000; // 72 hours
      await updateUserStats(user.uid, {
        coolOffUntil: lockUntil,
      });

      // Unlock voluntary break achievement
      await unlockAchievement('took_voluntary_break');

      Alert.alert(
        'Self-Exclusion Activated',
        'Your account is now locked for 72 hours. Use this time to rest and seek support if needed.\n\n🏆 Achievement Unlocked: Self-Aware!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/cooloff'),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to activate self-exclusion:', error);
      Alert.alert('Error', 'Failed to activate self-exclusion. Please try again.');
    } finally {
      setIsActivatingSelfExclusion(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🆘</Text>
          <Text style={styles.title}>Support & Resources</Text>
          <Text style={styles.subtitle}>
            You're not alone. Help is available 24/7, free and confidential.
          </Text>
        </View>

        {/* Emergency Stop */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>Need Immediate Help?</Text>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyStop}
            disabled={isActivatingSelfExclusion}
          >
            <Text style={styles.emergencyButtonIcon}>🛑</Text>
            <View style={styles.emergencyButtonContent}>
              <Text style={styles.emergencyButtonTitle}>
                {isActivatingSelfExclusion ? 'Activating...' : '72-Hour Emergency Lock'}
              </Text>
              <Text style={styles.emergencyButtonText}>
                Immediately lock your account for 72 hours
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Crisis Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>24/7 Crisis Support</Text>
          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => handleCallHelpline('1-800-522-4700')}
          >
            <Text style={styles.resourceIcon}>📞</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>
                National Problem Gambling Helpline
              </Text>
              <Text style={styles.resourceNumber}>1-800-522-4700</Text>
              <Text style={styles.resourceDescription}>
                Free, confidential support 24/7 in English and Spanish
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => handleTextCrisisLine('233-HOPE')}
          >
            <Text style={styles.resourceIcon}>💬</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Crisis Text Line</Text>
              <Text style={styles.resourceNumber}>Text HOPE to 233-HOPE</Text>
              <Text style={styles.resourceDescription}>
                Text-based support for any type of crisis
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => handleCallHelpline('988')}
          >
            <Text style={styles.resourceIcon}>🫂</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>988 Suicide & Crisis Lifeline</Text>
              <Text style={styles.resourceNumber}>Call or Text 988</Text>
              <Text style={styles.resourceDescription}>
                If you're in emotional distress or having suicidal thoughts
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Online Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Online Support</Text>
          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => handleOpenWebsite('https://www.ncpgambling.org/chat')}
          >
            <Text style={styles.resourceIcon}>💻</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Live Chat Support</Text>
              <Text style={styles.resourceLink}>ncpgambling.org/chat</Text>
              <Text style={styles.resourceDescription}>
                Chat with a specialist online
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => handleOpenWebsite('https://www.gamblersanonymous.org/ga/')}
          >
            <Text style={styles.resourceIcon}>👥</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Gamblers Anonymous</Text>
              <Text style={styles.resourceLink}>gamblersanonymous.org</Text>
              <Text style={styles.resourceDescription}>
                Find local and online support group meetings
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => handleOpenWebsite('https://www.begambleaware.org/')}
          >
            <Text style={styles.resourceIcon}>🌍</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>BeGambleAware (UK)</Text>
              <Text style={styles.resourceLink}>begambleaware.org</Text>
              <Text style={styles.resourceDescription}>
                Information and support for UK residents
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Self-Exclusion Programs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Self-Exclusion Programs</Text>
          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => handleOpenWebsite('https://www.gamstop.co.uk/')}
          >
            <Text style={styles.resourceIcon}>🚫</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>GamStop (UK)</Text>
              <Text style={styles.resourceLink}>gamstop.co.uk</Text>
              <Text style={styles.resourceDescription}>
                Free service to self-exclude from UK gambling sites
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() =>
              handleOpenWebsite('https://www.ncpgambling.org/help-treatment/self-exclusion/')
            }
          >
            <Text style={styles.resourceIcon}>🔒</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>State Self-Exclusion Programs</Text>
              <Text style={styles.resourceLink}>ncpgambling.org/self-exclusion</Text>
              <Text style={styles.resourceDescription}>
                Find self-exclusion programs in your state
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Warning Signs */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>⚠️ Warning Signs</Text>
          <Text style={styles.infoText}>Seek help if you notice:</Text>
          <Text style={styles.infoText}>• Betting more than you can afford to lose</Text>
          <Text style={styles.infoText}>• Chasing losses or betting to recover money</Text>
          <Text style={styles.infoText}>
            • Lying to others about your gambling activity
          </Text>
          <Text style={styles.infoText}>
            • Neglecting work, school, or family due to betting
          </Text>
          <Text style={styles.infoText}>
            • Feeling anxious, depressed, or suicidal about gambling
          </Text>
          <Text style={styles.infoText}>
            • Using gambling as an escape from problems
          </Text>
        </View>

        {/* Encouragement */}
        <View style={styles.encouragementCard}>
          <Text style={styles.encouragementText}>
            Reaching out for help is a sign of strength, not weakness. Recovery is
            possible, and thousands of people have found their way back to healthy
            relationships with gambling or stopped entirely.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  emergencySection: {
    marginBottom: 24,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 12,
  },
  emergencyButton: {
    backgroundColor: '#2a1a1a',
    borderWidth: 2,
    borderColor: '#f44336',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyButtonIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  emergencyButtonContent: {
    flex: 1,
  },
  emergencyButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 4,
  },
  emergencyButtonText: {
    fontSize: 14,
    color: '#ddd',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  resourceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: '#333',
  },
  resourceIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  resourceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  resourceLink: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#1a1a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 22,
    marginBottom: 4,
  },
  encouragementCard: {
    backgroundColor: '#1a2a1a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  encouragementText: {
    fontSize: 15,
    color: '#ddd',
    lineHeight: 22,
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
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
