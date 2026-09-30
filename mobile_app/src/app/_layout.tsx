import '../../global.css';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDb } from '../database/client';
import { syncEngine } from '../services/sync_engine';
import { updaterService } from '../services/updater_service';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60
    }
  }
});

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function setupApp() {
      try {
        await initDb();
        syncEngine.init();

        // Check for OTA updates silently on launch
        updaterService.checkForUpdates().then((res) => {
          if (res.hasUpdate) {
            updaterService.fetchAndReload();
          }
        });

        if (isMounted) setIsDbReady(true);
      } catch (err: any) {
        console.error('Database initialization error:', err);
        if (isMounted) setDbError(err.message || 'Error inicializando base de datos local');
      }
    }

    setupApp();

    return () => {
      isMounted = false;
      syncEngine.destroy();
    };
  }, []);

  if (!isDbReady) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center p-6">
        {dbError ? (
          <View className="items-center">
            <Text className="text-red-500 font-bold text-lg mb-2">Error de Inicialización</Text>
            <Text className="text-gray-400 text-center">{dbError}</Text>
          </View>
        ) : (
          <View className="items-center">
            <ActivityIndicator size="large" color="#6366f1" />
            <Text className="text-white font-medium mt-4 text-base">Inicializando Xion POS Mobile...</Text>
            <Text className="text-gray-500 text-sm mt-1">Cargando SQLite Offline-First</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor="#090d16" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#090d16' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen
            name="modals/payment"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="modals/scanner"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
