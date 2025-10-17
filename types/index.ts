export interface IOU {
  id: string;
  type: 'lent' | 'borrowed'; // I lent money vs I borrowed money
  amount: number;
  personName: string;
  note?: string;
  date: string; // ISO date string
  dueDate?: string; // ISO date string
  isSettled: boolean;
  settledDate?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  // Pro features
  phoneNumber?: string; // Pro: Contact phone number
  categoryId?: string; // Pro: Custom category
  lastReminder?: string; // ISO date string - when last reminder was sent
  remindersSent: number; // Count of reminders sent
}

export interface Category {
  id: string;
  name: string;
  color: string; // Hex color code
  icon: string; // Icon name
  createdAt: string;
  isDefault: boolean;
}

export interface ReminderSettings {
  enabled: boolean;
  dueDateDaysBefore: number; // Days before due date to remind
  periodicReminderDays: number; // Days between reminders for no due date
  customMessage: string; // Custom notification message template
  notificationTime: string; // Time of day to send notifications (HH:mm format)
}

export interface UserSummary {
  totalOwed: number; // Money others owe to user
  totalOwing: number; // Money user owes to others
  netBalance: number; // Positive = user is in credit, negative = user is in debt
}

export interface ExportData {
  ious: IOU[];
  exportDate: string;
  summary: UserSummary;
}

export interface AppSettings {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  pin?: string; // Hashed PIN
  currency: string;
  dateFormat: string;
  // Settings available in all versions
  reminders: ReminderSettings;
}

export type TransactionType = 'lent' | 'borrowed';
export type ExportFormat = 'pdf' | 'csv';