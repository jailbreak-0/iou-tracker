import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppSettings, Category, TransactionType } from '@/types';
import { AdTriggers, showInterstitialAd } from '@/utils/ads';
import { getCategories } from '@/utils/categories';
import { formatPhone, getContacts } from '@/utils/contacts';
import { formatDate } from '@/utils/localization';
import { hasProFeature, ProFeature } from '@/utils/pro';
import { addIOU, loadSettings } from '@/utils/storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AddIOUScreen() {
  const colorScheme = useColorScheme();
  const { type } = useLocalSearchParams<{ type: TransactionType }>();
  
  const [amount, setAmount] = useState('');
  const [personName, setPersonName] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Pro features
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
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

  useEffect(() => {
    if (!type || (type !== 'lent' && type !== 'borrowed')) {
      Alert.alert('Error', 'Invalid transaction type');
      router.back();
      return;
    }

    // Load user settings and categories
    const loadUserSettings = async () => {
      try {
        const userSettings = await loadSettings();
        if (userSettings) {
          setSettings(userSettings);
        }
        
        // Load categories
        const availableCategories = await getCategories();
        setCategories(availableCategories);
        // Set default category
        setSelectedCategory(availableCategories[0]);
      } catch (error) {
        console.log('Error loading settings:', error);
      }
    };

    loadUserSettings();
  }, [type]);

  const handleContactSelect = async () => {
    if (!hasProFeature(ProFeature.CONTACTS_INTEGRATION)) {
      Alert.alert(
        'Pro Feature',
        'Contact integration is available in the Pro version. Would you like to upgrade?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => console.log('Navigate to upgrade') }
        ]
      );
      return;
    }

    setContactsLoading(true);
    setShowContactsModal(true);
    
    try {
      const deviceContacts = await getContacts();
      setContacts(deviceContacts);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  const selectContact = (contact: any) => {
    setPersonName(contact.name);
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      setPhoneNumber(formatPhone(contact.phoneNumbers[0]));
    }
    setShowContactsModal(false);
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!personName.trim()) {
      Alert.alert('Error', 'Please enter the person\'s name');
      return;
    }

    setIsLoading(true);

    try {
      await addIOU({
        type: type as TransactionType,
        amount: parseFloat(amount),
        personName: personName.trim(),
        note: note.trim() || undefined,
        date: date.toISOString(),
        dueDate: dueDate?.toISOString(),
        isSettled: false,
        remindersSent: 0,
        // Pro features
        phoneNumber: phoneNumber.trim() || undefined,
        categoryId: selectedCategory?.id,
        lastReminder: undefined,
      });

      Alert.alert('Success', 'Transaction added successfully', [
        { text: 'OK', onPress: () => {
          // Show ad after successful transaction (revenue opportunity)
          showInterstitialAd(AdTriggers.AFTER_ADD_IOU);
          router.back();
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onDueDateChange = (event: any, selectedDate?: Date) => {
    setShowDueDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const titleColor = type === 'lent' ? Colors[colorScheme ?? 'light'].tint : '#FF6B6B';

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="arrow.left" size={24} color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: titleColor }]}>
            {type === 'lent' ? 'I Lent Money' : 'I Borrowed Money'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Amount *</ThemedText>
              <TextInput
                style={[styles.input, { color: Colors[colorScheme ?? 'light'].text }]}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                {type === 'lent' ? 'Person who owes you *' : 'Person you owe *'}
              </ThemedText>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.flexInput, { color: Colors[colorScheme ?? 'light'].text }]}
                  placeholder="Enter person's name"
                  value={personName}
                  onChangeText={setPersonName}
                  autoCapitalize="words"
                />
                {hasProFeature(ProFeature.CONTACTS_INTEGRATION) && (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={handleContactSelect}
                  >
                    <IconSymbol name="person.2.badge.plus" size={24} color={Colors[colorScheme ?? 'light'].tint} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Pro Feature: Phone Number */}
            {hasProFeature(ProFeature.CONTACTS_INTEGRATION) && (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Phone Number (Optional)</ThemedText>
                <TextInput
                  style={[styles.input, { color: Colors[colorScheme ?? 'light'].text }]}
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            )}

            {/* Pro Feature: Category Selection */}
            {hasProFeature(ProFeature.CUSTOM_CATEGORIES) && (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Category (Pro)</ThemedText>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <View style={styles.categoryDisplay}>
                    <View style={[styles.categoryDot, { backgroundColor: selectedCategory?.color || '#007AFF' }]} />
                    <ThemedText style={styles.dateText}>
                      {selectedCategory?.name || 'Select category'}
                    </ThemedText>
                  </View>
                  <IconSymbol name="chevron.down" size={20} color={Colors[colorScheme ?? 'light'].text} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Note (Optional)</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { color: Colors[colorScheme ?? 'light'].text }]}
                placeholder="Add a note about this transaction"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Date *</ThemedText>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText style={styles.dateText}>
                  {formatDate(date, settings.dateFormat)}
                </ThemedText>
                <IconSymbol name="calendar" size={20} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Due Date (Optional)</ThemedText>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDueDatePicker(true)}
              >
                <ThemedText style={styles.dateText}>
                  {dueDate ? formatDate(dueDate, settings.dateFormat) : 'No due date'}
                </ThemedText>
                <IconSymbol name="calendar" size={20} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
              {dueDate && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setDueDate(undefined)}
                >
                  <Text style={styles.clearButtonText}>Clear due date</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: "#ff6b6b" }]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Transaction'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        {showDueDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display="default"
            onChange={onDueDateChange}
          />
        )}

        {/* Category Selection Modal */}
        <Modal
          visible={showCategoryModal}
          transparent
          animationType="slide"
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Category</Text>
                  <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                    <IconSymbol name="xmark" size={24} color={Colors[colorScheme ?? 'light'].text} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalList}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categoryOption, selectedCategory?.id === category.id && styles.selectedCategory]}
                      onPress={() => {
                        setSelectedCategory(category);
                        setShowCategoryModal(false);
                      }}
                    >
                      <View style={styles.categoryDisplay}>
                        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                        <Text style={styles.categoryOptionText}>{category.name}</Text>
                      </View>
                      {selectedCategory?.id === category.id && (
                        <IconSymbol name="checkmark" size={20} color={Colors[colorScheme ?? 'light'].tint} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        
        {/* Contacts Selection Modal */}
        <Modal
          visible={showContactsModal}
          transparent
          animationType="slide"
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowContactsModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Contact</Text>
                  <TouchableOpacity onPress={() => setShowContactsModal(false)}>
                    <IconSymbol name="xmark" size={24} color={Colors[colorScheme ?? 'light'].text} />
                  </TouchableOpacity>
                </View>
              {contactsLoading ? (
                <View style={styles.loadingContainer}>
                  <Text>Loading contacts...</Text>
                </View>
              ) : (
                <ScrollView style={styles.modalList}>
                  {contacts.map(contact => (
                    <TouchableOpacity
                      key={contact.id}
                      style={styles.contactOption}
                      onPress={() => selectContact(contact)}
                    >
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                          <Text style={styles.contactPhone}>{formatPhone(contact.phoneNumbers[0])}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  textArea: {
    minHeight: 80,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  dateText: {
    fontSize: 16,
  },
  clearButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#e5e5e5ff',
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 1,
    borderColor: '#E5E5E5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButton: {
    flex: 2,
    padding: 16,
    marginLeft: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexInput: {
    flex: 1,
    marginRight: 8,
  },
  contactButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalList: {
    maxHeight: 400,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedCategory: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  categoryOptionText: {
    fontSize: 16,
  },
  contactOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
});