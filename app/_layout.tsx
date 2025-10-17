import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import AuthScreen from '@/components/AuthScreen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AdManager, initializeAds } from '@/utils/ads';
import { loadSettings } from '@/utils/storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
    
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // When app goes to background, require auth again if enabled
        if (authRequired) {
          setIsAuthenticated(false);
        }
      } else if (nextAppState === 'active') {
        // Reset ad session counters when app becomes active
        try {
          AdManager.resetSessionCounters();
        } catch (error) {
          console.error('Failed to reset ad session counters:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [authRequired]);

  const initializeApp = async () => {
    try {
      // Initialize ads for the unified version
      await initializeAds();
    } catch (error) {
      console.error('Failed to initialize ads:', error);
    }

    // Check authentication requirements
    await checkAuthStatus();
  };

  const checkAuthStatus = async () => {
    try {
      const settings = await loadSettings();
      const requiresAuth = settings.pinEnabled || settings.biometricEnabled;
      setAuthRequired(requiresAuth);
      setIsAuthenticated(!requiresAuth);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setAuthRequired(false);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  if (authRequired && !isAuthenticated) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthScreen onAuthenticated={handleAuthenticated} />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-iou" options={{ title: 'Add IOU', presentation: 'modal' }} />
        <Stack.Screen name="modal" options={{ title: 'Details', presentation: 'modal' }} />
      </Stack>
      
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}