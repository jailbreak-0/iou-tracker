/**
 * Notification and Reminder System
 * Handles automatic reminders for IOUs based on due dates and user preferences
 */

import { AppSettings, IOU } from '@/types';
import { Alert, Platform } from 'react-native';
import { formatCurrency, formatDate } from './localization';
import { loadIOUs, loadSettings, saveIOUs } from './storage';

// Conditional import for notifications to avoid Expo Go issues
let Notifications: any = null;
let isExpoGoEnvironment = false;

try {
  // Check if we're in Expo Go by trying to import expo-notifications
  Notifications = require('expo-notifications');
  
  // Configure notification behavior only if available
  if (Notifications && Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (error: any) {
  // This likely means we're in Expo Go where notifications aren't fully supported
  console.warn('Notifications not available:', error.message);
  isExpoGoEnvironment = true;
}

const isNotificationAvailable = (): boolean => {
  return !isExpoGoEnvironment && Notifications && Platform.OS !== 'web';
};

class ReminderManager {
  private static instance: ReminderManager;

  private constructor() {}

  static getInstance(): ReminderManager {
    if (!ReminderManager.instance) {
      ReminderManager.instance = new ReminderManager();
    }
    return ReminderManager.instance;
  }

  /**
   * Initialize notification permissions
   */
  async initializeNotifications(): Promise<boolean> {
    try {
      if (!isNotificationAvailable()) {
        console.log('Notifications not available in Expo Go environment');
        return false;
      }
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications to receive reminders about your IOUs.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Schedule reminder for a specific IOU
   */
  async scheduleIOUReminder(iou: IOU, settings: AppSettings): Promise<string | null> {
    try {
      const { reminders } = settings;
      if (!reminders?.enabled) return null;

      const notificationId = `iou-reminder-${iou.id}`;
      
      // Cancel existing notification for this IOU
      await this.cancelIOUReminder(iou.id);

      let reminderDate: Date;
      let title: string;
      let body: string;

      if (iou.dueDate) {
        // Due date reminder
        const dueDate = new Date(iou.dueDate);
        reminderDate = new Date(dueDate.getTime() - (reminders.dueDateDaysBefore * 24 * 60 * 60 * 1000));
        
        // Don't schedule if reminder date is in the past
        if (reminderDate <= new Date()) {
          reminderDate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        }

        title = iou.type === 'lent' ? `${iou.personName} owes you money` : `You owe money to ${iou.personName}`;
        body = `${formatCurrency(iou.amount, settings.currency)} is due on ${formatDate(dueDate, settings.dateFormat)}`;
      } else {
        // Periodic reminder
        const lastReminder = iou.lastReminder ? new Date(iou.lastReminder) : new Date(iou.date);
        reminderDate = new Date(lastReminder.getTime() + (reminders.periodicReminderDays * 24 * 60 * 60 * 1000));

        title = iou.type === 'lent' ? `Reminder: ${iou.personName} owes you` : `Reminder: You owe ${iou.personName}`;
        body = `${formatCurrency(iou.amount, settings.currency)} - ${iou.note || 'No additional notes'}`;
      }

      // Set notification time
      const [hours, minutes] = reminders.notificationTime.split(':');
      reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (!isNotificationAvailable()) {
        console.log('Skipping notification scheduling - not available in Expo Go');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { iouId: iou.id, type: 'reminder' },
          sound: true,
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, Math.floor((reminderDate.getTime() - Date.now()) / 1000))
        },
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling IOU reminder:', error);
      return null;
    }
  }

  /**
   * Cancel reminder for specific IOU
   */
  async cancelIOUReminder(iouId: string): Promise<void> {
    try {
      if (!isNotificationAvailable()) {
        console.log('Skipping notification cancel - not available in Expo Go');
        return;
      }
      
      const notificationId = `iou-reminder-${iouId}`;
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling IOU reminder:', error);
    }
  }

  /**
   * Schedule reminders for all active IOUs
   */
  async scheduleAllReminders(): Promise<void> {
    try {
      const [ious, settings] = await Promise.all([
        loadIOUs(),
        loadSettings()
      ]);

      if (!settings?.reminders?.enabled) return;

      const activeIOUs = ious.filter(iou => !iou.isSettled);

      for (const iou of activeIOUs) {
        await this.scheduleIOUReminder(iou, settings);
      }
    } catch (error) {
      console.error('Error scheduling all reminders:', error);
    }
  }

  /**
   * Cancel all scheduled reminders
   */
  async cancelAllReminders(): Promise<void> {
    try {
      if (!isNotificationAvailable()) {
        console.log('Skipping cancel all notifications - not available in Expo Go');
        return;
      }
      
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all reminders:', error);
    }
  }

  /**
   * Handle notification response (when user taps notification)
   */
  async handleNotificationResponse(response: any): Promise<void> {
    try {
      const { iouId, type } = response.notification.request.content.data as any;
      
      if (type === 'reminder' && iouId) {
        // Update last reminder timestamp
        await this.updateLastReminderSent(iouId);
        
        // SMS reminders removed - not in required features
        
        // Reschedule next reminder if needed
        await this.rescheduleNextReminder(iouId);
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  /**
   * Update last reminder timestamp for IOU
   */
  private async updateLastReminderSent(iouId: string): Promise<void> {
    try {
      const ious = await loadIOUs();
      const updatedIOUs = ious.map(iou => 
        iou.id === iouId 
          ? { 
              ...iou, 
              lastReminder: new Date().toISOString(),
              remindersSent: (iou.remindersSent || 0) + 1
            }
          : iou
      );
      await saveIOUs(updatedIOUs);
    } catch (error) {
      console.error('Error updating last reminder:', error);
    }
  }

  /**
   * Reschedule next periodic reminder
   */
  private async rescheduleNextReminder(iouId: string): Promise<void> {
    try {
      const [ious, settings] = await Promise.all([
        loadIOUs(),
        loadSettings()
      ]);

      const iou = ious.find(i => i.id === iouId);
      if (!iou || iou.isSettled || iou.dueDate) return; // Only reschedule for periodic reminders

      await this.scheduleIOUReminder(iou, settings);
    } catch (error) {
      console.error('Error rescheduling next reminder:', error);
    }
  }

  /**
   * Get upcoming reminders for dashboard display
   */
  async getUpcomingReminders(): Promise<Array<{iou: IOU, reminderDate: Date}>> {
    try {
      const [ious, settings] = await Promise.all([
        loadIOUs(),
        loadSettings()
      ]);

      if (!settings?.reminders?.enabled) return [];

      const upcomingReminders: Array<{iou: IOU, reminderDate: Date}> = [];
      const now = new Date();
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      for (const iou of ious.filter(i => !i.isSettled)) {
        let reminderDate: Date;

        if (iou.dueDate) {
          const dueDate = new Date(iou.dueDate);
          reminderDate = new Date(dueDate.getTime() - (settings.reminders.dueDateDaysBefore * 24 * 60 * 60 * 1000));
        } else {
          const lastReminder = iou.lastReminder ? new Date(iou.lastReminder) : new Date(iou.date);
          reminderDate = new Date(lastReminder.getTime() + (settings.reminders.periodicReminderDays * 24 * 60 * 60 * 1000));
        }

        if (reminderDate >= now && reminderDate <= next7Days) {
          upcomingReminders.push({ iou, reminderDate });
        }
      }

      return upcomingReminders.sort((a, b) => a.reminderDate.getTime() - b.reminderDate.getTime());
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      return [];
    }
  }
}

// Export singleton instance
export const ReminderSystem = ReminderManager.getInstance();

// Initialize notification listeners
if (isNotificationAvailable()) {
  Notifications.addNotificationResponseReceivedListener((response: any) => {
    ReminderSystem.handleNotificationResponse(response);
  });
}