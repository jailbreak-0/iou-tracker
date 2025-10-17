/**
 * Contacts Integration System (Pro Feature)
 * Handles device contacts access and contact picker functionality
 */

import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';
import { hasProFeature, ProFeature, showProUpgrade } from './pro';

export interface ContactInfo {
  id: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
  displayName: string;
}

class ContactsManager {
  private static instance: ContactsManager;
  private _hasPermission: boolean = false;

  private constructor() {}

  static getInstance(): ContactsManager {
    if (!ContactsManager.instance) {
      ContactsManager.instance = new ContactsManager();
    }
    return ContactsManager.instance;
  }

  /**
   * Request contacts permission
   */
  async requestPermissions(): Promise<boolean> {
    if (!hasProFeature(ProFeature.CONTACTS_INTEGRATION)) {
      showProUpgrade(ProFeature.CONTACTS_INTEGRATION);
      return false;
    }

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      this._hasPermission = status === 'granted';

      if (!this._hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please allow access to contacts to use this feature.',
          [{ text: 'OK' }]
        );
      }

      return this._hasPermission;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  /**
   * Check if contacts permission is granted
   */
  async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      this._hasPermission = status === 'granted';
      return this._hasPermission;
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      return false;
    }
  }

  /**
   * Get all contacts from device
   */
  async getAllContacts(): Promise<ContactInfo[]> {
    if (!hasProFeature(ProFeature.CONTACTS_INTEGRATION)) {
      showProUpgrade(ProFeature.CONTACTS_INTEGRATION);
      return [];
    }

    if (!await this.hasPermission()) {
      const granted = await this.requestPermissions();
      if (!granted) return [];
    }

    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      return data
        .filter(contact => contact.name || contact.firstName || contact.lastName)
        .map(contact => ({
          id: contact.id,
          name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          phoneNumbers: contact.phoneNumbers?.map(phone => phone.number || '') || [],
          emails: contact.emails?.map(email => email.email || '') || [],
          displayName: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        }))
        .filter(contact => contact.name.trim() !== '');
    } catch (error) {
      console.error('Error fetching contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
      return [];
    }
  }

  /**
   * Search contacts by name
   */
  async searchContacts(query: string): Promise<ContactInfo[]> {
    if (!query.trim()) return [];

    const allContacts = await this.getAllContacts();
    const searchTerm = query.toLowerCase();

    return allContacts.filter(contact =>
      contact.displayName.toLowerCase().includes(searchTerm) ||
      contact.phoneNumbers.some(phone => phone.includes(searchTerm)) ||
      contact.emails.some(email => email.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get contact by ID
   */
  async getContactById(contactId: string): Promise<ContactInfo | null> {
    if (!await this.hasPermission()) return null;

    try {
      const contact = await Contacts.getContactByIdAsync(contactId, [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
      ]);

      if (!contact) return null;

      return {
        id: contact.id,
        name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        phoneNumbers: contact.phoneNumbers?.map(phone => phone.number || '') || [],
        emails: contact.emails?.map(email => email.email || '') || [],
        displayName: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      };
    } catch (error) {
      console.error('Error fetching contact by ID:', error);
      return null;
    }
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format based on length
    if (cleaned.length === 10) {
      // US format: (555) 123-4567
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      // US with country code: +1 (555) 123-4567
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else {
      // International or other formats - just add spaces
      return cleaned.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
    }
  }

  /**
   * Clean phone number for storage/SMS
   */
  cleanPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, '');
  }

  /**
   * Validate phone number
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    return cleaned.length >= 7 && cleaned.length <= 15; // International standards
  }
}

// Export singleton instance
export const ContactsSystem = ContactsManager.getInstance();

// Convenience functions
export const getContacts = () => ContactsSystem.getAllContacts();
export const searchContacts = (query: string) => ContactsSystem.searchContacts(query);
export const formatPhone = (phone: string) => ContactsSystem.formatPhoneNumber(phone);
export const cleanPhone = (phone: string) => ContactsSystem.cleanPhoneNumber(phone);
export const isValidPhone = (phone: string) => ContactsSystem.isValidPhoneNumber(phone);