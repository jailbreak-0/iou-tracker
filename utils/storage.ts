import AsyncStorage from '@react-native-async-storage/async-storage';
import { IOU, AppSettings, UserSummary } from '@/types';
import { getDefaultCurrency, DATE_FORMATS } from '@/utils/localization';

const STORAGE_KEYS = {
  IOUS: 'iou_tracker_ious',
  SETTINGS: 'iou_tracker_settings',
};

// IOU Storage Functions
export const saveIOUs = async (ious: IOU[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.IOUS, JSON.stringify(ious));
  } catch (error) {
    console.error('Error saving IOUs:', error);
    throw error;
  }
};

export const loadIOUs = async (): Promise<IOU[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.IOUS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading IOUs:', error);
    return [];
  }
};

export const addIOU = async (iou: Omit<IOU, 'id' | 'createdAt' | 'updatedAt'>): Promise<IOU> => {
  try {
    const existingIOUs = await loadIOUs();
    const newIOU: IOU = {
      ...iou,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedIOUs = [...existingIOUs, newIOU];
    await saveIOUs(updatedIOUs);
    return newIOU;
  } catch (error) {
    console.error('Error adding IOU:', error);
    throw error;
  }
};

export const updateIOU = async (id: string, updates: Partial<IOU>): Promise<void> => {
  try {
    const ious = await loadIOUs();
    const index = ious.findIndex(iou => iou.id === id);
    if (index !== -1) {
      ious[index] = { ...ious[index], ...updates, updatedAt: new Date().toISOString() };
      await saveIOUs(ious);
    }
  } catch (error) {
    console.error('Error updating IOU:', error);
    throw error;
  }
};

export const deleteIOU = async (id: string): Promise<void> => {
  try {
    const ious = await loadIOUs();
    const filteredIOUs = ious.filter(iou => iou.id !== id);
    await saveIOUs(filteredIOUs);
  } catch (error) {
    console.error('Error deleting IOU:', error);
    throw error;
  }
};

export const settleIOU = async (id: string): Promise<void> => {
  await updateIOU(id, {
    isSettled: true,
    settledDate: new Date().toISOString()
  });
};

// Settings Storage Functions
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const loadSettings = async (): Promise<AppSettings> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    const defaultCurrency = getDefaultCurrency();
    
    const defaultSettings: AppSettings = {
      pinEnabled: false,
      biometricEnabled: false,
      currency: defaultCurrency,
      dateFormat: 'MM/dd/yyyy',
      reminders: {
        enabled: true,
        dueDateDaysBefore: 3,
        periodicReminderDays: 7,
        customMessage: 'Hi {name}, just a friendly reminder about our {type} of {amount}. Thanks!',
        sendSMS: false,
        notificationTime: '09:00'
      }
    };
    
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    const defaultCurrency = getDefaultCurrency();
    
    return {
      pinEnabled: false,
      biometricEnabled: false,
      currency: defaultCurrency,
      dateFormat: 'MM/dd/yyyy',
      reminders: {
        enabled: true,
        dueDateDaysBefore: 3,
        periodicReminderDays: 7,
        customMessage: 'Hi {name}, just a friendly reminder about our {type} of {amount}. Thanks!',
        sendSMS: false,
        notificationTime: '09:00'
      }
    };
  }
};

// Calculation Functions
export const calculateSummary = (ious: IOU[]): UserSummary => {
  const activeIOUs = ious.filter(iou => !iou.isSettled);
  
  const totalOwed = activeIOUs
    .filter(iou => iou.type === 'lent')
    .reduce((sum, iou) => sum + iou.amount, 0);
  
  const totalOwing = activeIOUs
    .filter(iou => iou.type === 'borrowed')
    .reduce((sum, iou) => sum + iou.amount, 0);
  
  return {
    totalOwed,
    totalOwing,
    netBalance: totalOwed - totalOwing,
  };
};