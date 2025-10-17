import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadSettings } from '@/utils/storage';

const { width } = Dimensions.get('window');

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const colorScheme = useColorScheme();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [storedPin, setStoredPin] = useState<string>('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    loadAuthSettings();
    checkBiometricAvailability();
  }, []);

  const loadAuthSettings = async () => {
    try {
      const settings = await loadSettings();
      setStoredPin(settings.pin || '');
      setBiometricEnabled(settings.biometricEnabled);
    } catch (error) {
      console.error('Failed to load auth settings:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      setBiometricAvailable(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (!biometricAvailable || !biometricEnabled) return;

    setIsLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access IOU Tracker',
        fallbackLabel: 'Use PIN instead',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        onAuthenticated();
      } else {
        Alert.alert('Authentication Failed', 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'Biometric authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === storedPin.length) {
        setTimeout(() => verifyPin(newPin), 100);
      }
    }
  };

  const verifyPin = (inputPin: string) => {
    if (inputPin === storedPin) {
      onAuthenticated();
    } else {
      Alert.alert('Incorrect PIN', 'Please try again');
      setPin('');
    }
  };

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const PinDot = ({ filled }: { filled: boolean }) => (
    <View style={[
      styles.pinDot,
      filled && { backgroundColor: Colors[colorScheme ?? 'light'].tint }
    ]} />
  );

  const PinButton = ({ digit, onPress }: { digit: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.pinButton} onPress={onPress}>
      <Text style={[styles.pinButtonText, { color: Colors[colorScheme ?? 'light'].text }]}>
        {digit}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <IconSymbol 
            name="lock.fill" 
            size={64} 
            color={Colors[colorScheme ?? 'light'].tint} 
          />
          <ThemedText style={styles.title}>IOU Tracker</ThemedText>
          <ThemedText style={styles.subtitle}>Enter your PIN to continue</ThemedText>
        </View>

        <View style={styles.pinContainer}>
          <View style={styles.pinDots}>
            {Array.from({ length: Math.max(4, storedPin.length) }).map((_, index) => (
              <PinDot key={index} filled={index < pin.length} />
            ))}
          </View>

          <View style={styles.pinPad}>
            <View style={styles.pinRow}>
              <PinButton digit="1" onPress={() => handlePinInput('1')} />
              <PinButton digit="2" onPress={() => handlePinInput('2')} />
              <PinButton digit="3" onPress={() => handlePinInput('3')} />
            </View>
            <View style={styles.pinRow}>
              <PinButton digit="4" onPress={() => handlePinInput('4')} />
              <PinButton digit="5" onPress={() => handlePinInput('5')} />
              <PinButton digit="6" onPress={() => handlePinInput('6')} />
            </View>
            <View style={styles.pinRow}>
              <PinButton digit="7" onPress={() => handlePinInput('7')} />
              <PinButton digit="8" onPress={() => handlePinInput('8')} />
              <PinButton digit="9" onPress={() => handlePinInput('9')} />
            </View>
            <View style={styles.pinRow}>
              {biometricAvailable && biometricEnabled && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricAuth}
                  disabled={isLoading}
                >
                  <IconSymbol 
                    name="faceid" 
                    size={24} 
                    color={Colors[colorScheme ?? 'light'].tint} 
                  />
                </TouchableOpacity>
              )}
              <PinButton digit="0" onPress={() => handlePinInput('0')} />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handlePinDelete}
              >
                <IconSymbol 
                  name="delete.left" 
                  size={24} 
                  color={Colors[colorScheme ?? 'light'].text} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
    marginTop: 8,
  },
  pinContainer: {
    alignItems: 'center',
  },
  pinDots: {
    flexDirection: 'row',
    marginBottom: 60,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    marginHorizontal: 8,
  },
  pinPad: {
    width: width * 0.8,
    maxWidth: 300,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pinButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinButtonText: {
    fontSize: 24,
    fontWeight: '500',
  },
  biometricButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: '#e5e5e5ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: '#ffc9c9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});