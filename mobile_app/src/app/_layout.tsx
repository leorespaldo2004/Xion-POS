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

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f1f5f9' } }}>
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

        {!isDbReady && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              zIndex: 9999
            }}
          >
            {dbError ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
                  Error de Inicialización
                </Text>
                <Text style={{ color: '#475569', textAlign: 'center' }}>{dbError}</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text style={{ color: '#0f172a', fontWeight: 'bold', marginTop: 16, fontSize: 16 }}>
                  Inicializando Xion POS Mobile...
                </Text>
                <Text style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                  Cargando SQLite Offline-First
                </Text>
              </View>
            )}
          </View>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
