import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppSettings, ReminderSettings } from '@/types';
import { DATE_FORMATS, getCurrencySymbol, SUPPORTED_CURRENCIES } from '@/utils/localization';
import { isProVersion } from '@/utils/pro';
import { purchaseManager } from '@/utils/purchases';
import { ReminderSystem } from '@/utils/reminders';
import { loadSettings, saveSettings } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>({
    pinEnabled: false,
    biometricEnabled: false,
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    reminders: {
      enabled: true,
      dueDateDaysBefore: 3,
      periodicReminderDays: 7,
      customMessage: 'Your IOU reminder',
      notificationTime: '09:00'
    }
  });
  const [showPinInput, setShowPinInput] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDateFormatModal, setShowDateFormatModal] = useState(false);
  const [showDueDateReminderModal, setShowDueDateReminderModal] = useState(false);
  const [showPeriodicReminderModal, setShowPeriodicReminderModal] = useState(false);
  const [showProCTAPopup, setShowProCTAPopup] = useState(false);
  const [showNotificationTimeModal, setShowNotificationTimeModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  // Analytics modal removed - not in required features
  const [isAdFreeUnlocked, setIsAdFreeUnlocked] = useState(false);

  const loadCurrentSettings = useCallback(async () => {
    try {
      const currentSettings = await loadSettings();
      setSettings(currentSettings);
      
      // Load purchase state
      const adFreeStatus = await purchaseManager.isAdFreeUnlocked();
      setIsAdFreeUnlocked(adFreeStatus);
      
      // Initialize notifications if reminders are enabled
      if (currentSettings.reminders?.enabled) {
        await ReminderSystem.initializeNotifications();
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to load settings');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCurrentSettings();
    }, [loadCurrentSettings])
  );

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await saveSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (_error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handlePinToggle = async (enabled: boolean) => {
    if (enabled) {
      setShowPinInput(true);
    } else {
      await updateSettings({ pinEnabled: false, pin: undefined });
      Alert.alert('Success', 'PIN disabled');
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (!hasHardware) {
          Alert.alert('Error', 'Biometric authentication is not available on this device');
          return;
        }
        
        if (!isEnrolled) {
          Alert.alert('Error', 'No biometric data is enrolled on this device');
          return;
        }
        
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable biometric lock',
          fallbackLabel: 'Use PIN instead',
        });
        
        if (result.success) {
          await updateSettings({ biometricEnabled: true });
          Alert.alert('Success', 'Biometric authentication enabled');
        }
      } catch (_error) {
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    } else {
      await updateSettings({ biometricEnabled: false });
      Alert.alert('Success', 'Biometric authentication disabled');
    }
  };

  const handlePinSetup = async () => {
    if (newPin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits');
      return;
    }
    
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }
    
    // In a real app, you'd hash the PIN before storing
    await updateSettings({ pinEnabled: true, pin: newPin });
    setShowPinInput(false);
    setNewPin('');
    setConfirmPin('');
    Alert.alert('Success', 'PIN set successfully');
  };

  const handleCurrencyChange = async (currencyCode: string) => {
    await updateSettings({ currency: currencyCode });
    setShowCurrencyModal(false);
    Alert.alert('Success', `Currency changed to ${currencyCode}`);
  };

  const handleDateFormatChange = async (dateFormat: string) => {
    await updateSettings({ dateFormat });
    setShowDateFormatModal(false);
    Alert.alert('Success', 'Date format updated');
  };

  const handleReminderSettingChange = async (key: keyof ReminderSettings, value: any) => {
    try {
      const updatedReminders = { ...settings.reminders, [key]: value };
      await updateSettings({ reminders: updatedReminders });
      
      // Reschedule reminders if settings changed
      if (key === 'enabled') {
        if (value) {
          await ReminderSystem.initializeNotifications();
          await ReminderSystem.scheduleAllReminders();
        } else {
          await ReminderSystem.cancelAllReminders();
        }
      } else {
        await ReminderSystem.scheduleAllReminders();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update reminder settings');
    }
  };

  const handleUpgradePress = async () => {
    Alert.alert('Feature Not Available', 'This feature has been removed from this version.');
  };

  const handleProCTAClose = async () => {
    setShowProCTAPopup(false);
  };

  const handleRemoveAds = async () => {
    try {
      const success = await purchaseManager.purchaseAdFree();
      if (success) {
        setIsAdFreeUnlocked(true);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Unable to complete purchase. Please try again.');
    }
  };

  const handleRestorePurchases = async () => {
    try {
      const restored = await purchaseManager.restorePurchases();
      if (restored) {
        setIsAdFreeUnlocked(true);
      }
    } catch (error) {
      console.error('Restore error:', error);
    }
  };

  const SettingItem = ({ 
    title, 
    description, 
    value, 
    onToggle, 
    type = 'switch',
    onPress
  }: {
    title: string;
    description?: string;
    value: boolean | string;
    onToggle?: (value: any) => void;
    type?: 'switch' | 'text' | 'button';
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={type === 'button' ? onPress : undefined}
      disabled={type !== 'button'}
    >
      <View style={styles.settingContent}>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
        {description && <ThemedText style={styles.settingDescription}>{description}</ThemedText>}
      </View>
      {type === 'switch' ? (
        <Switch
          value={value as boolean}
          onValueChange={onToggle}
          trackColor={{ false: '#767577', true: '#234070ff' }}
        />
      ) : type === 'button' ? (
        <View style={styles.settingValueContainer}>
          <ThemedText style={styles.settingValue}>{value as string}</ThemedText>
          <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].text} />
        </View>
      ) : (
        <ThemedText style={styles.settingValue}>{value as string}</ThemedText>
      )}
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Settings</ThemedText>
      
      <ScrollView style={styles.scrollView}>
        {/* Ad Removal Section - Only show if ads are not disabled */}
        {!isProVersion() && !isAdFreeUnlocked && (
          <View style={[styles.section, styles.proSection]}>
            <ThemedText style={styles.sectionTitle}>� Remove Ads</ThemedText>
            
            <View style={styles.proCard}>
              <View style={styles.proHeader}>
                <ThemedText style={styles.proTitle}>Ad-Free Experience</ThemedText>
                <ThemedText style={styles.proSubtitle}>
                  Remove all advertisements with a one-time purchase
                </ThemedText>
              </View>
              
              <View style={styles.proFeatures}>
                <Text style={styles.proFeature}>� PDF/CSV Export</Text>
                <Text style={styles.proFeature}>� Contacts Integration</Text>
                <Text style={styles.proFeature}>📂 Custom Categories</Text>
                <Text style={styles.proFeature}>🔒 Authentication</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={handleRemoveAds}
              >
                <Text style={styles.upgradeButtonText}>Remove Ads - $2.99</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.learnMoreButton}
                onPress={handleRestorePurchases}
              >
                <Text style={styles.learnMoreButtonText}>Restore Purchases</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Ad-Free Status - Show when ads are removed */}
        {!isProVersion() && isAdFreeUnlocked && (
          <View style={[styles.section, styles.successSection]}>
            <ThemedText style={styles.sectionTitle}>✅ Ad-Free Unlocked</ThemedText>
            <View style={styles.successCard}>
              <Text style={styles.successText}>
                Thank you for supporting the app! All ads have been permanently removed.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Security</ThemedText>
          
          <SettingItem
            title="PIN Lock"
            description="Protect your app with a PIN"
            value={settings.pinEnabled}
            onToggle={handlePinToggle}
          />
          
          <SettingItem
            title="Biometric Lock"
            description="Use fingerprint or face recognition"
            value={settings.biometricEnabled}
            onToggle={handleBiometricToggle}
          />
        </View>
        
        {/* Pro Features Section - Only show for Pro users */}
        {isProVersion() && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>🌟 Pro Features</ThemedText>
            
            {/* Theme feature removed - not in required features */}
            
            {/* Analytics feature removed - not in required features */}
            
            <SettingItem
              title="Export Data"
              description="Export your IOU data to PDF or CSV"
              value="Available features"
              type="button"
              onPress={() => Alert.alert('Export', 'Export functionality is available from the History tab')}
            />
          </View>
        )}
        
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Display</ThemedText>
          
          <SettingItem
            title="Currency"
            description="Choose your preferred currency"
            value={`${settings.currency} (${getCurrencySymbol(settings.currency)})`}
            type="button"
            onPress={() => setShowCurrencyModal(true)}
          />
          
          <SettingItem
            title="Date Format"
            description="Choose how dates are displayed"
            value={settings.dateFormat}
            type="button"
            onPress={() => setShowDateFormatModal(true)}
          />
        </View>
        
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Reminders</ThemedText>
          
          <SettingItem
            title="Enable Reminders"
            description="Get notified about upcoming payments"
            value={settings.reminders.enabled}
            onToggle={(enabled) => handleReminderSettingChange('enabled', enabled)}
          />
          
          {settings.reminders.enabled && (
            <>
              <SettingItem
                title="Due Date Reminders"
                description={`Remind ${settings.reminders.dueDateDaysBefore} days before due date`}
                value={`${settings.reminders.dueDateDaysBefore} days`}
                type="button"
                onPress={() => setShowDueDateReminderModal(true)}
              />
              
              <SettingItem
                title="Periodic Reminders"
                description={`Remind every ${settings.reminders.periodicReminderDays} days for items without due date`}
                value={`${settings.reminders.periodicReminderDays} days`}
                type="button"
                onPress={() => setShowPeriodicReminderModal(true)}
              />
              
              <SettingItem
                title="Notification Time"
                description="What time to send daily reminders"
                value={settings.reminders.notificationTime}
                type="button"
                onPress={() => setShowNotificationTimeModal(true)}
              />
              
              {/* All features are now available in unified version */}
              {/* SMS and advanced reminder features removed */}
            </>
          )}
        </View>
        
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal
        visible={showPinInput}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPinInput(false);
          setNewPin('');
          setConfirmPin('');
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowPinInput(false);
            setNewPin('');
            setConfirmPin('');
          }}
        >
          <TouchableOpacity 
            style={styles.pinModalContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            <ThemedView style={styles.pinModalContent}>
              <ThemedText style={styles.pinTitle}>Set up PIN</ThemedText>
              <TextInput
                style={[styles.pinInput, { color: Colors[colorScheme ?? 'light'].text }]}
                placeholder="Enter new PIN"
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '80'}
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
              <TextInput
                style={[styles.pinInput, { color: Colors[colorScheme ?? 'light'].text }]}
                placeholder="Confirm PIN"
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '80'}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
              <View style={styles.pinButtons}>
                <TouchableOpacity
                  style={[styles.pinButton, styles.cancelButton]}
                  onPress={() => {
                    setShowPinInput(false);
                    setNewPin('');
                    setConfirmPin('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pinButton, styles.confirmButton]}
                  onPress={handlePinSetup}
                >
                  <Text style={styles.confirmButtonText}>Set PIN</Text>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCurrencyModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Select Currency</ThemedText>
                <TouchableOpacity
                  onPress={() => setShowCurrencyModal(false)}
                  style={styles.modalCloseButton}
                >
                  <IconSymbol name="chevron.right" size={24} color={Colors[colorScheme ?? 'light'].text} />
                </TouchableOpacity>
              </View>
            
              
              <FlatList
                data={SUPPORTED_CURRENCIES}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      settings.currency === item.code && styles.modalItemSelected
                    ]}
                    onPress={() => handleCurrencyChange(item.code)}
                  >
                    <View style={styles.modalItemContent}>
                      <Text style={styles.modalItemSymbol}>{item.symbol}</Text>
                      <View>
                        <ThemedText style={[styles.modalItemTitle,]}>{item.name}</ThemedText>
                        <ThemedText style={styles.modalItemCode}>{item.code}</ThemedText>
                      </View>
                    </View>
                    {settings.currency === item.code && (
                      <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].tint} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {/* Date Format Selection Modal */}
      <Modal
        visible={showDateFormatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateFormatModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDateFormatModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Select Date Format</ThemedText>
                <TouchableOpacity
                  onPress={() => setShowDateFormatModal(false)}
                  style={styles.modalCloseButton}
                >
                  <IconSymbol name="chevron.right" size={24} color={Colors[colorScheme ?? 'light'].text} />
                </TouchableOpacity>
              </View>
            
              
              <ScrollView>
                {Object.entries(DATE_FORMATS).map(([key, format]) => {
                  const sampleDate = new Date();
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.modalItem,
                        settings.dateFormat === format && styles.modalItemSelected
                      ]}
                      onPress={() => handleDateFormatChange(format)}
                    >
                      <View style={styles.modalItemContent}>
                        <View>
                          <ThemedText style={styles.modalItemTitle}>{format}</ThemedText>
                          <ThemedText style={styles.modalItemCode}>
                            Example: {sampleDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: format.includes('MMM') ? 'short' : '2-digit',
                              day: '2-digit'
                            })}
                          </ThemedText>
                        </View>
                      </View>
                      {settings.dateFormat === format && (
                        <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].tint} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {/* Due Date Reminder Modal */}
      <Modal
        visible={showDueDateReminderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDueDateReminderModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDueDateReminderModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Due Date Reminder</ThemedText>
                <TouchableOpacity
                  onPress={() => setShowDueDateReminderModal(false)}
                  style={styles.modalCloseButton}
                >
                  <IconSymbol name="chevron.right" size={24} color={Colors[colorScheme ?? 'light'].text} />
                </TouchableOpacity>
              </View>
            
            <ScrollView>
              {[1, 2, 3, 5, 7, 14].map(days => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.modalItem,
                    settings.reminders.dueDateDaysBefore === days && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    handleReminderSettingChange('dueDateDaysBefore', days);
                    setShowDueDateReminderModal(false);
                  }}
                >
                  <View style={styles.modalItemContent}>
                    <ThemedText style={styles.modalItemTitle}>
                      {days} {days === 1 ? 'day' : 'days'} before
                    </ThemedText>
                  </View>
                  {settings.reminders.dueDateDaysBefore === days && (
                    <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].tint} />
                  )}
                </TouchableOpacity>
                ))}
              </ScrollView>
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Periodic Reminder Modal */}
      <Modal
        visible={showPeriodicReminderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPeriodicReminderModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPeriodicReminderModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Periodic Reminder</ThemedText>
                <TouchableOpacity
                  onPress={() => setShowPeriodicReminderModal(false)}
                  style={styles.modalCloseButton}
                >
                <IconSymbol name="chevron.right" size={24} color={Colors[colorScheme ?? 'light'].text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView>
                {[1, 3, 7, 14, 30].map(days => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.modalItem,
                      settings.reminders.periodicReminderDays === days && styles.modalItemSelected
                    ]}
                    onPress={() => {
                      handleReminderSettingChange('periodicReminderDays', days);
                      setShowPeriodicReminderModal(false);
                    }}
                  >
                    <View style={styles.modalItemContent}>
                      <ThemedText style={styles.modalItemTitle}>
                        Every {days} {days === 1 ? 'day' : 'days'}
                      </ThemedText>
                    </View>
                    {settings.reminders.periodicReminderDays === days && (
                      <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].tint} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>      {/* Notification Time Modal */}
      <Modal
        visible={showNotificationTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationTimeModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotificationTimeModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Notification Time</ThemedText>
                <TouchableOpacity
                  onPress={() => setShowNotificationTimeModal(false)}
                  style={styles.modalCloseButton}
                >
                  <IconSymbol name="chevron.right" size={24} color={Colors[colorScheme ?? 'light'].text} />
                </TouchableOpacity>
              </View>
            
            <ScrollView>
              {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map(time => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.modalItem,
                    settings.reminders.notificationTime === time && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    handleReminderSettingChange('notificationTime', time);
                    setShowNotificationTimeModal(false);
                  }}
                >
                  <View style={styles.modalItemContent}>
                    <ThemedText style={styles.modalItemTitle}>{time}</ThemedText>
                  </View>
                  {settings.reminders.notificationTime === time && (
                    <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].tint} />
                  )}
                </TouchableOpacity>
                ))}
              </ScrollView>
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.proModalContainer}>
          <View style={styles.proModalHeader}>
            <TouchableOpacity
              onPress={() => setShowThemeModal(false)}
              style={styles.proModalCloseButton}
            >
              <Text style={styles.proModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* Theme selection removed - not in required features */}
          <ThemedText style={{textAlign: 'center', margin: 20}}>Theme selection has been removed</ThemedText>
        </View>
      </Modal>

      {/* Analytics Dashboard Modal - removed since not in required features */}

      {/* Pro CTA Popup removed - not needed */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 16,
    opacity: 0.6,
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinSetup: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  pinButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  pinButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#E5E5E5',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
  },
  confirmButtonText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '500',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
    width: '90%',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalItemSelected: {
    backgroundColor: '#ff6f61ff',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalItemSymbol: {
    fontSize: 20,
    marginRight: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalItemCode: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  pinModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinModalContent: {
    width: '90%',
    maxWidth: 350,
    padding: 24,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  // Pro section styles
  proSection: {
    marginBottom: 24,
  },
  proCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  proHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  proTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  proSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  proFeatures: {
    marginBottom: 20,
  },
  proFeature: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
    paddingLeft: 4,
  },
  upgradeButton: {
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  learnMoreButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  learnMoreButtonText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  proModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  proModalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  proModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proModalCloseText: {
    fontSize: 18,
    color: '#666666',
    fontWeight: 'bold',
  },
  successSection: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  successCard: {
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    textAlign: 'center',
  },
});