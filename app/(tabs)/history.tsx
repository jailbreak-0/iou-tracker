import AdBanner from '@/components/AdBanner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppSettings, IOU } from '@/types';
import { AdTriggers, showInterstitialAd } from '@/utils/ads';
import { formatCurrency, formatDate } from '@/utils/localization';
import { hasProFeature, ProFeature } from '@/utils/pro';
import { loadIOUs, loadSettings } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const [settledIOUs, setSettledIOUs] = useState<IOU[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    pinEnabled: false,
    biometricEnabled: false,
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    reminders: {
      enabled: true,
      dueDateDaysBefore: 3,
      periodicReminderDays: 7,
      customMessage: 'Hi {name}, just a friendly reminder about our {type} of {amount}. Thanks!',
      notificationTime: '09:00'
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const loadSettledIOUs = useCallback(async () => {
    try {
      const [allIOUs, userSettings] = await Promise.all([
        loadIOUs(),
        loadSettings()
      ]);
      
      if (userSettings) {
        setSettings(userSettings);
      }
      
      const settled = allIOUs.filter(iou => iou.isSettled).sort((a, b) => 
        new Date(b.settledDate || b.updatedAt).getTime() - new Date(a.settledDate || a.updatedAt).getTime()
      );
      setSettledIOUs(settled);
    } catch (error) {
      Alert.alert('Error', 'Failed to load history');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettledIOUs();
    }, [loadSettledIOUs])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSettledIOUs();
    setRefreshing(false);
  }, [loadSettledIOUs]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setShowExportModal(false);
    
    try {
      // Check Pro access first to avoid importing export modules unnecessarily
      if (!hasProFeature(ProFeature.EXPORT)) {
        Alert.alert('Pro Feature', 'Export functionality requires Pro version');
        return;
      }
      
      const allIOUs = await loadIOUs();
      let success = false;
      
      if (format === 'csv') {
        // Lazy import to prevent startup crashes
        const { exportToCSV } = await import('@/utils/export');
        success = await exportToCSV(allIOUs);
      } else {
        // Calculate summary for PDF
        const totalLent = allIOUs.filter(iou => iou.type === 'lent' && !iou.isSettled).reduce((sum, iou) => sum + iou.amount, 0);
        const totalBorrowed = allIOUs.filter(iou => iou.type === 'borrowed' && !iou.isSettled).reduce((sum, iou) => sum + iou.amount, 0);
        const netBalance = totalLent - totalBorrowed;
        
        // Lazy import to prevent startup crashes
        const { exportToPDF } = await import('@/utils/export');
        success = await exportToPDF(allIOUs, { totalLent, totalBorrowed, netBalance });
      }
      
      if (success) {
        Alert.alert('Success', `Report exported successfully as ${format.toUpperCase()}`);
        // Show ad after successful export (revenue opportunity)
        showInterstitialAd(AdTriggers.EXPORT_DATA);
      } else {
        Alert.alert('Error', 'Get PRO Version to export reports');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export report');
    }
  };

  const renderHistoryItem = (iou: IOU) => (
    <ThemedView key={iou.id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={[
          styles.historyType,
          { color: iou.type === 'lent' ? Colors[colorScheme ?? 'light'].tint : '#FF6B6B' }
        ]}>
          {iou.type === 'lent' ? 'Lent' : 'Borrowed'}
        </Text>
        <Text style={[styles.historyAmount, { color: Colors[colorScheme ?? 'light'].text }]}>
          {formatCurrency(iou.amount, settings.currency)}
        </Text>
      </View>
      <ThemedText style={styles.historyPerson}>{iou.personName}</ThemedText>
      {iou.note && <ThemedText style={styles.historyNote}>{iou.note}</ThemedText>}
      <View style={styles.historyDates}>
        <ThemedText style={styles.historyDate}>
          Created: {formatDate(new Date(iou.date), settings.dateFormat)}
        </ThemedText>
        <ThemedText style={styles.historyDate}>
          Settled: {formatDate(new Date(iou.settledDate || iou.updatedAt), settings.dateFormat)}
        </ThemedText>
      </View>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>History</ThemedText>
        <TouchableOpacity style={styles.exportButton} onPress={() => setShowExportModal(true)}>
          <IconSymbol name="square.and.arrow.up.fill" size={24} color={Colors[colorScheme ?? 'light'].tint} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Ad banner for free version */}
        <AdBanner />
        
        {settledIOUs.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <IconSymbol name="clock" size={64} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <ThemedText style={styles.emptyText}>No settled transactions</ThemedText>
          </ThemedView>
        ) : (
          settledIOUs.map(renderHistoryItem)
        )}
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExportModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Premium Features</ThemedText>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#00bd39ff' }]}
                onPress={() => handleExport('csv')}
              >
                <IconSymbol name="doc.text" size={24} color="white" />
                <Text style={styles.modalButtonText}>Export as Excel/CSV (Pro)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#FF6B6B' }]}
                onPress={() => handleExport('pdf')}
              >
                <IconSymbol name="doc.richtext" size={24} color="white" />
                <Text style={styles.modalButtonText}>Export as PDF Report (Pro)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowExportModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 55,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  exportButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyType: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyPerson: {
    fontSize: 16,
    marginBottom: 4,
  },
  historyNote: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
    marginBottom: 8,
  },
  historyDates: {
    marginTop: 8,
  },
  historyDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  cancelButton: {
    marginTop: 8,
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    opacity: 1,
    borderColor: '#E5E5E5',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#e5e5e5ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});