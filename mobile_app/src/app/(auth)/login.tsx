import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { useAuthStore } from '../../stores/auth-store';
import { configRepository } from '../../database/repositories/configRepository';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [apiUrl, setApiUrl] = useState('http://192.168.1.100:8000');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (pin.length < 4) {
      Alert.alert('PIN Inválido', 'Ingrese un PIN de al menos 4 dígitos');
      return;
    }

    setLoading(true);
    try {
      await configRepository.set('api_url', apiUrl);
      login(
        { id: 'cashier-1', name: 'Cajero Principal', role: 'cashier' },
        'auth-session-mobile-token'
      );
      router.replace('/(tabs)/pos');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-slate-950 p-6 justify-center">
      <View className="items-center mb-8">
        <View className="w-16 h-16 rounded-2xl bg-indigo-600 items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
          <Text className="text-white font-extrabold text-3xl">X</Text>
        </View>
        <Text className="text-white text-2xl font-bold tracking-tight">Xion POS Mobile</Text>
        <Text className="text-gray-400 text-sm mt-1">Punto de Venta Multiplataforma Offline-First</Text>
      </View>

      <Card className="p-6">
        <Text className="text-white text-lg font-bold mb-4">Iniciar Sesión de Caja</Text>

        <Input
          label="PIN de Operador / Cajero"
          placeholder="Ej: 1234"
          keyboardType="number-pad"
          secureTextEntry
          value={pin}
          onChangeText={setPin}
        />

        <Input
          label="Servidor Backend API (Local/Cloud)"
          placeholder="http://192.168.1.100:8000"
          value={apiUrl}
          onChangeText={setApiUrl}
        />

        <Button
          loading={loading}
          onPress={handleLogin}
          className="mt-2"
        >
          Ingresar al Sistema
        </Button>
      </Card>

      <Text className="text-gray-600 text-xs text-center mt-8">
        Xion POS v1.0.0 • React Native & SQLite Engine
      </Text>
    </ScrollView>
  );
}
