import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { RefreshCw, Printer, Server, DollarSign, Download, LogOut } from 'lucide-react-native';
import { Header } from '../../components/ui/header';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { configRepository } from '../../database/repositories/configRepository';
import { useSync } from '../../hooks/useSync';
import { usePrinter } from '../../hooks/usePrinter';
import { useCartStore } from '../../stores/cart-store';
import { useAuthStore } from '../../stores/auth-store';
import { updaterService } from '../../services/updater_service';

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState('');
  const [bcvRate, setBcvRate] = useState('36.50');
  const [parallelRate, setParallelRate] = useState('38.00');

  const { isOnline, isSyncing, pendingCount, lastSyncAt, lastError, triggerSync } = useSync();
  const { printerMac, printerName, autoPrint, savePrinterConfig } = usePrinter();
  const setExchangeRate = useCartStore((s) => s.setExchangeRate);
  const logout = useAuthStore((s) => s.logout);

  const [macInput, setMacInput] = useState(printerMac);
  const [nameInput, setNameInput] = useState(printerName);
  const [autoPrintToggle, setAutoPrintToggle] = useState(autoPrint);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const config = await configRepository.getAllConfig();
    setApiUrl(config.api_url);
    setBcvRate(String(config.bcv_rate));
    setParallelRate(String(config.parallel_rate));
    setMacInput(config.printer_mac);
    setNameInput(config.printer_name);
    setAutoPrintToggle(config.auto_print);
  };

  const handleSaveConfig = async () => {
    try {
      await configRepository.set('api_url', apiUrl);
      await configRepository.set('bcv_rate', bcvRate);
      await configRepository.set('parallel_rate', parallelRate);
      await savePrinterConfig(macInput, nameInput, autoPrintToggle);

      const rateNum = parseFloat(bcvRate);
      if (!isNaN(rateNum) && rateNum > 0) {
        setExchangeRate(rateNum);
      }

      Alert.alert('Configuración Guardada', 'Se actualizaron los parámetros locales.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar la configuración.');
    }
  };

  const handleManualSync = async () => {
    const res = await triggerSync();
    Alert.alert(res.success ? 'Sincronizado' : 'Atención', res.message);
  };

  const handleCheckOta = async () => {
    setUpdating(true);
    const res = await updaterService.checkForUpdates();
    if (res.hasUpdate) {
      Alert.alert('Nueva Versión Disponible', '¿Desea descargar e instalar ahora?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: async () => {
            await updaterService.fetchAndReload();
          }
        }
      ]);
    } else {
      Alert.alert('Actualizado', res.message);
    }
    setUpdating(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="Configuración" />

      <ScrollView className="p-4 flex-1">
        {/* Sync Queue Card */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <RefreshCw size={20} color="#6366f1" />
              <Text className="text-white font-bold text-base">Motor de Sincronización</Text>
            </View>
            <Badge
              label={isOnline ? 'Conectado' : 'Offline'}
              variant={isOnline ? 'success' : 'destructive'}
            />
          </View>

          <Text className="text-gray-400 text-xs mb-1">
            Ventas pendientes por enviar: <Text className="text-amber-400 font-bold">{pendingCount}</Text>
          </Text>
          {lastSyncAt && (
            <Text className="text-gray-500 text-[10px] mb-3">
              Última sincronización: {new Date(lastSyncAt).toLocaleString()}
            </Text>
          )}

          {lastError && (
            <View className="bg-red-950/60 p-2.5 rounded-xl border border-red-800 mb-3">
              <Text className="text-red-300 text-xs font-medium">{lastError}</Text>
            </View>
          )}

          <Button loading={isSyncing} onPress={handleManualSync} variant="outline">
            Sincronizar Cola Ahora
          </Button>
        </Card>

        {/* Server & Exchange Rates */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Server size={20} color="#6366f1" />
            <Text className="text-white font-bold text-base">Conexión y Tasas de Cambio</Text>
          </View>

          <Input
            label="URL API del Servidor"
            placeholder="http://192.168.1.100:8000"
            value={apiUrl}
            onChangeText={setApiUrl}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Tasa BCV (Bs/$)"
                placeholder="36.50"
                keyboardType="decimal-pad"
                value={bcvRate}
                onChangeText={setBcvRate}
              />
            </View>
            <View className="flex-1">
              <Input
                label="Tasa Paralelo (Bs/$)"
                placeholder="38.00"
                keyboardType="decimal-pad"
                value={parallelRate}
                onChangeText={setParallelRate}
              />
            </View>
          </View>
        </Card>

        {/* Thermal Printer Settings */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Printer size={20} color="#6366f1" />
            <Text className="text-white font-bold text-base">Impresora Térmica Bluetooth</Text>
          </View>

          <Input
            label="Dirección MAC Bluetooth"
            placeholder="00:11:22:33:44:55"
            value={macInput}
            onChangeText={setMacInput}
          />

          <Input
            label="Nombre de Impresora"
            placeholder="POS-58 / PT-210"
            value={nameInput}
            onChangeText={setNameInput}
          />

          <View className="flex-row justify-between items-center py-2 border-t border-gray-800 mt-1 mb-2">
            <Text className="text-white text-sm font-medium">Impresión Automática al Cobrar</Text>
            <Switch
              value={autoPrintToggle}
              onValueChange={setAutoPrintToggle}
              trackColor={{ false: '#374151', true: '#6366f1' }}
            />
          </View>
        </Card>

        {/* Save button */}
        <Button onPress={handleSaveConfig} className="mb-4">
          Guardar Cambios
        </Button>

        {/* OTA Updates & Logout */}
        <View className="flex-row gap-3 mb-8">
          <Button
            loading={updating}
            onPress={handleCheckOta}
            variant="secondary"
            className="flex-1"
          >
            Actualización OTA
          </Button>

          <Button onPress={handleLogout} variant="destructive" className="flex-1">
            Cerrar Sesión
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
