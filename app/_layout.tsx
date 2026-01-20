import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initI18n } from '@/i18n';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [i18nInitialized, setI18nInitialized] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nInitialized(true));
  }, []);

  // Mostrar loading mientras se inicializa i18n
  if (!i18nInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Entry point */}
        <Stack.Screen name="index" />

        {/* Grupo de autenticación */}
        <Stack.Screen name="(auth)" />

        {/* Grupo principal con tabs */}
        <Stack.Screen name="(tabs)" />

        {/* Modales y otras pantallas */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
