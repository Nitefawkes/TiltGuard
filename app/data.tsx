// Data Export/Import screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useUserStats } from '../src/hooks';
import { Card, Button, Banner, colors } from '../src/components/UI';
import {
  exportBetsToCSV,
  exportStatsToCSV,
  downloadCSVTemplate,
} from '../src/services/csv';
import { getAllSettledBets, getRecentBets } from '../src/services/firebase';

export default function DataScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { stats } = useUserStats(user?.uid || null);

  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleExportBets = async () => {
    if (!user?.uid) return;

    setExporting(true);
    try {
      // Get all bets (both settled and pending)
      const recentBets = await getRecentBets(user.uid, 1000);
      const result = await exportBetsToCSV(recentBets);

      if (result.success) {
        Alert.alert(
          'Export Successful',
          'Your betting history has been exported. You can now share it or save it to your device.'
        );
      } else {
        Alert.alert(
          'Export Failed',
          result.error || 'An error occurred while exporting data.'
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'An unexpected error occurred.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportStats = async () => {
    if (!user?.uid || !stats) return;

    setExporting(true);
    try {
      const result = await exportStatsToCSV(stats);

      if (result.success) {
        Alert.alert(
          'Export Successful',
          'Your stats have been exported. You can now share them or save to your device.'
        );
      } else {
        Alert.alert(
          'Export Failed',
          result.error || 'An error occurred while exporting stats.'
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'An unexpected error occurred.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const result = await downloadCSVTemplate();

      if (result.success) {
        Alert.alert(
          'Template Downloaded',
          'Use this template to manually enter your betting history, then import it back into TiltGuard.'
        );
      } else {
        Alert.alert(
          'Download Failed',
          result.error || 'An error occurred while downloading template.'
        );
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'An unexpected error occurred.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Management</Text>
        <Text style={styles.subtitle}>
          Export your data, download templates, and manage your betting history
        </Text>
      </View>

      <Banner
        message="Your data belongs to you. Export it anytime to share with therapists, counselors, or for your own records."
        type="info"
        style={styles.banner}
      />

      {/* Export Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Export Data</Text>
        <Text style={styles.sectionDescription}>
          Download your complete betting history and stats as CSV files
        </Text>

        <Button
          title={
            exporting ? 'Exporting...' : 'Export Betting History'
          }
          onPress={handleExportBets}
          variant="primary"
          disabled={exporting || !user}
          loading={exporting}
          style={styles.button}
        />

        <Button
          title={exporting ? 'Exporting...' : 'Export Statistics'}
          onPress={handleExportStats}
          variant="secondary"
          disabled={exporting || !user || !stats}
          loading={exporting}
          style={styles.button}
        />
      </Card>

      {/* Template Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>📝 CSV Template</Text>
        <Text style={styles.sectionDescription}>
          Download a blank CSV template to manually enter your betting history
        </Text>

        <Button
          title={
            downloading
              ? 'Downloading...'
              : 'Download Import Template'
          }
          onPress={handleDownloadTemplate}
          variant="outline"
          disabled={downloading}
          loading={downloading}
          style={styles.button}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Template Instructions:</Text>
          <Text style={styles.infoText}>
            1. Download the CSV template
          </Text>
          <Text style={styles.infoText}>
            2. Fill in your betting data (sport, amount, odds, etc.)
          </Text>
          <Text style={styles.infoText}>
            3. Save the file to your device
          </Text>
          <Text style={styles.infoText}>
            4. Use the Import feature to load it into TiltGuard
          </Text>
        </View>
      </Card>

      {/* Import Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>📥 Import Data</Text>
        <Text style={styles.sectionDescription}>
          Import betting history from other platforms or your own CSV files
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Coming Soon</Text>
          <Text style={styles.infoText}>
            CSV import functionality will be available in a future update. For
            now, you can export and view your data externally.
          </Text>
        </View>
      </Card>

      {/* Privacy Section */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 Privacy & Security</Text>
        <Text style={styles.privacyText}>
          • Your data is stored securely in Firebase
        </Text>
        <Text style={styles.privacyText}>
          • Exports are created locally on your device
        </Text>
        <Text style={styles.privacyText}>
          • No data is shared without your explicit consent
        </Text>
        <Text style={styles.privacyText}>
          • You can delete your account and all data at any time
        </Text>
      </Card>

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
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: colors.surfaceLight,
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  privacyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  backButton: {
    marginHorizontal: 24,
    marginVertical: 24,
  },
});
