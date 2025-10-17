import * as Localization from 'expo-localization';
import { format as dateFnsFormat } from 'date-fns';

// Get user's locale information
export const getUserLocale = () => {
  const locale = Localization.getLocales()[0];
  return {
    locale: locale?.languageTag || 'en-US',
    currency: locale?.currencyCode || 'USD',
    region: locale?.regionCode || 'US',
    decimalSeparator: locale?.decimalSeparator || '.',
    digitGroupingSeparator: locale?.digitGroupingSeparator || ',',
  };
};

// Format currency based on user's locale
export const formatCurrency = (amount: number, customCurrency?: string): string => {
  const userLocale = getUserLocale();
  const currency = customCurrency || userLocale.currency;
  
  try {
    return new Intl.NumberFormat(userLocale.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is not supported
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
};

// Date format patterns
export const DATE_FORMATS = {
  'MM/dd/yyyy': 'MM/dd/yyyy', // US format
  'dd/MM/yyyy': 'dd/MM/yyyy', // European format
  'yyyy-MM-dd': 'yyyy-MM-dd', // ISO format
  'dd.MM.yyyy': 'dd.MM.yyyy', // German format
  'MMM dd, yyyy': 'MMM dd, yyyy', // Long format
  'dd MMM yyyy': 'dd MMM yyyy', // Alternative long format
};

// Format date based on user preference
export const formatDate = (date: Date | string, dateFormat?: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!dateFormat) {
    // Auto-detect based on locale
    const userLocale = getUserLocale();
    if (userLocale.locale.startsWith('en-US')) {
      dateFormat = DATE_FORMATS['MM/dd/yyyy'];
    } else if (userLocale.locale.startsWith('en-GB')) {
      dateFormat = DATE_FORMATS['dd/MM/yyyy'];
    } else if (userLocale.region === 'DE') {
      dateFormat = DATE_FORMATS['dd.MM.yyyy'];
    } else {
      dateFormat = DATE_FORMATS['dd/MM/yyyy'];
    }
  }
  
  return dateFnsFormat(dateObj, dateFormat);
};

// Get currency symbol for display
export const getCurrencySymbol = (currencyCode?: string): string => {
  const userLocale = getUserLocale();
  const currency = currencyCode || userLocale.currency;
  
  try {
    const formatter = new Intl.NumberFormat(userLocale.locale, {
      style: 'currency',
      currency: currency,
    });
    
    // Extract just the symbol
    const parts = formatter.formatToParts(0);
    const currencyPart = parts.find(part => part.type === 'currency');
    return currencyPart?.value || currency;
  } catch (error) {
    return currency;
  }
};

// Available currencies for settings
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'CFA', name: 'Central African Franc', symbol: 'FCFA' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
];

// Get default currency based on user's location
export const getDefaultCurrency = (): string => {
  const userLocale = getUserLocale();
  
  // Check if the detected currency is supported
  const supportedCurrency = SUPPORTED_CURRENCIES.find(
    curr => curr.code === userLocale.currency
  );
  
  return supportedCurrency ? userLocale.currency : 'USD';
};