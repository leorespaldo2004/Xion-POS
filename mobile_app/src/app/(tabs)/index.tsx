import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Modal, Alert } from 'react-native';
import {
  Menu,
  Bell,
  Wallet,
  CreditCard,
  Smartphone,
  DollarSign,
  ArrowRightLeft,
  Lock,
  Unlock,
  Clock,
  TrendingUp
} from 'lucide-react-native';
import { configRepository } from '../../database/repositories/configRepository';
import { saleRepository } from '../../database/repositories/saleRepository';
import { cashRepository, LocalCashSession } from '../../database/repositories/cashRepository';
import { formatUSD, formatVES } from '../../utils/formatters';
import { generateUUID } from '../../utils/uuid';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export default function CajaHomeScreen() {
  const [exchangeRate, setExchangeRate] = useState<number>(42.75);
  const [activeSession, setActiveSession] = useState<LocalCashSession | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showCashModal, setShowCashModal] = useState<boolean>(false);
  const [initialUsd, setInitialUsd] = useState<string>('0.00');
  const [initialVes, setInitialVes] = useState<string>('0.00');

  // Breakdown metrics per payment method
  const [totals, setTotals] = useState({
    pago_movil: { usd: 0, ves: 0 },
    transferencia: { usd: 0, ves: 0 },
    pos_card: { usd: 0, ves: 0 },
    biopago: { usd: 0, ves: 0 },
    cash_ves: { usd: 0, ves: 0 },
    cash_usd: { usd: 0, ves: 0 }
  });

  const loadData = async () => {
    setRefreshing(true);
    try {
      const rateStr = await configRepository.get('bcv_rate');
      setExchangeRate(parseFloat(rateStr || '42.75') || 42.75);

      const session = await cashRepository.getActiveSession();
      setActiveSession(session);

      const payTotals = await saleRepository.getPaymentTotals();
      setTotals({
        pago_movil: payTotals.pago_movil || { usd: 0, ves: 0 },
        transferencia: payTotals.transferencia || { usd: 0, ves: 0 },
        pos_card: payTotals.pos_card || { usd: 0, ves: 0 },
        biopago: payTotals.biopago || { usd: 0, ves: 0 },
        cash_ves: payTotals.cash_ves || { usd: 0, ves: 0 },
        cash_usd: payTotals.cash_usd || { usd: 0, ves: 0 }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalGlobalUsd = Object.values(totals).reduce((sum, item) => sum + item.usd, 0);
  const totalGlobalVes = Object.values(totals).reduce((sum, item) => sum + item.ves, 0);

  const handleToggleCashSession = async () => {
    if (activeSession) {
      try {
        await cashRepository.closeSession(activeSession.id, totalGlobalUsd, totalGlobalVes);
        Alert.alert('Caja Cerrada', 'Se ha cerrado la sesión de caja correctamente.');
        loadData();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Error al cerrar la caja');
      }
    } else {
      setShowCashModal(true);
    }
  };

  const handleConfirmOpenCash = async () => {
    try {
      const newSession: LocalCashSession = {
        id: generateUUID(),
        user_name: 'Carlos Gerente',
        opened_at: new Date().toISOString(),
        initial_amount_usd: parseFloat(initialUsd) || 0,
        initial_amount_ves: parseFloat(initialVes) || 0,
        total_sales_usd: 0,
        total_sales_ves: 0,
        status: 'open'
      };
      await cashRepository.openSession(newSession);
      setShowCashModal(false);
      Alert.alert('Caja Abierta', 'Sesión de caja iniciada con éxito.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo abrir la caja');
    }
  };

  const formattedDate = new Date().toLocaleDateString('es-VE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });

  const formattedTime = new Date().toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const paymentCards = [
    { key: 'pago_movil', label: 'Pago Móvil', icon: Smartphone, iconColor: '#6366f1', iconBg: 'bg-indigo-50' },
    { key: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft, iconColor: '#8b5cf6', iconBg: 'bg-purple-50' },
    { key: 'pos_card', label: 'Débito', icon: CreditCard, iconColor: '#3b82f6', iconBg: 'bg-blue-50' },
    { key: 'biopago', label: 'Biopago', icon: CreditCard, iconColor: '#10b981', iconBg: 'bg-emerald-50' },
    { key: 'cash_ves', label: 'Efectivo BS', icon: Wallet, iconColor: '#f59e0b', iconBg: 'bg-amber-50' },
    { key: 'cash_usd', label: 'Efectivo USD', icon: Wallet, iconColor: '#06b6d4', iconBg: 'bg-cyan-50' },
  ] as const;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Top Header - Compact & Sleek */}
      <View className="pt-10 pb-2.5 px-4 bg-white flex-row justify-between items-center border-b border-slate-200/60 z-10">
        <Pressable className="p-1.5 rounded-lg active:bg-slate-100">
          <Menu size={20} color="#334155" />
        </Pressable>

        {/* BCV Exchange Rate Pill */}
        <View className="bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200 flex-row items-center gap-1.5">
          <Text className="text-slate-500 text-[11px] font-semibold">Tasa BCV:</Text>
          <Text className="text-slate-900 font-extrabold text-xs">{exchangeRate.toFixed(2)} Bs</Text>
        </View>

        {/* Header Right Actions */}
        <View className="flex-row items-center gap-2">
          <Pressable className="p-1.5 rounded-lg active:bg-slate-100 relative">
            <Bell size={18} color="#475569" />
          </Pressable>
          <View className="w-8 h-8 rounded-full bg-slate-900 items-center justify-center border border-slate-700">
            <Text className="text-white font-extrabold text-[11px]">CG</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-3.5 pt-3"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#6366f1" />}
      >
        {/* Compact User & Session Control Bar */}
        <View className="bg-white rounded-2xl p-3.5 mb-3 border border-slate-200/80 shadow-sm flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-slate-900 font-black text-base leading-tight">Carlos Gerente</Text>
              <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${activeSession ? 'bg-emerald-50 border border-emerald-200/60' : 'bg-rose-50 border border-rose-200/60'}`}>
                <View className={`w-1.5 h-1.5 rounded-full ${activeSession ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <Text className={`text-[10px] font-extrabold ${activeSession ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {activeSession ? 'Abierta' : 'Cerrada'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Clock size={11} color="#94a3b8" />
              <Text className="text-slate-400 text-[11px] font-medium capitalize">
                {formattedDate} • {formattedTime}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleToggleCashSession}
            className={`px-3.5 py-2 rounded-xl flex-row items-center gap-1.5 active:opacity-80 ${
              activeSession ? 'bg-slate-100 border border-slate-300/80' : 'bg-indigo-600'
            }`}
          >
            {activeSession ? <Lock size={13} color="#334155" /> : <Unlock size={13} color="#ffffff" />}
            <Text className={`text-xs font-bold ${activeSession ? 'text-slate-700' : 'text-white'}`}>
              {activeSession ? 'Cerrar Caja' : 'Abrir Caja'}
            </Text>
          </Pressable>
        </View>

        {/* Section Header */}
        <View className="flex-row justify-between items-center px-1 mb-2">
          <Text className="text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
            Desglose de Ingresos
          </Text>
          <Text className="text-slate-400 font-semibold text-[11px]">Hoy</Text>
        </View>

        {/* 6 Payment Methods Grid (High-Density Minimalist Cards) */}
        <View className="flex-row flex-wrap justify-between gap-y-2.5 mb-3">
          {paymentCards.map((card) => {
            const Icon = card.icon;
            const data = totals[card.key];
            return (
              <View
                key={card.key}
                className="w-[48.5%] bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm justify-between"
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-slate-600 font-bold text-xs" numberOfLines={1}>
                    {card.label}
                  </Text>
                  <View className={`p-1 rounded-lg ${card.iconBg}`}>
                    <Icon size={14} color={card.iconColor} />
                  </View>
                </View>

                <View>
                  <Text className="text-slate-900 font-black text-lg tracking-tight">
                    {formatUSD(data.usd)}
                  </Text>
                  <Text className="text-slate-400 text-[11px] font-semibold mt-0.5">
                    {formatVES(data.ves)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Global Summary Card - Precision Dark/Accent Highlight */}
        <View className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 shadow-md flex-row justify-between items-center">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-indigo-500/20 items-center justify-center border border-indigo-400/30">
              <TrendingUp size={20} color="#818cf8" />
            </View>
            <View>
              <Text className="text-white font-extrabold text-sm tracking-tight">Total Global</Text>
              <Text className="text-indigo-300 font-bold text-[11px]">Acumulado del Día</Text>
            </View>
          </View>

          <View className="items-end">
            <Text className="text-white font-black text-xl tracking-tight">
              {formatUSD(totalGlobalUsd)}
            </Text>
            <Text className="text-emerald-400 font-extrabold text-xs mt-0.5">
              {formatVES(totalGlobalVes)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Open Cash Modal */}
      <Modal visible={showCashModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-5 border-t border-slate-100">
            <Text className="text-slate-900 font-black text-lg mb-1">Apertura de Caja</Text>
            <Text className="text-slate-500 text-xs mb-4">
              Ingrese el monto base inicial en caja para iniciar la jornada.
            </Text>

            <Input
              label="Monto Inicial USD ($)"
              keyboardType="decimal-pad"
              value={initialUsd}
              onChangeText={setInitialUsd}
            />

            <Input
              label="Monto Inicial Bolívares (Bs)"
              keyboardType="decimal-pad"
              value={initialVes}
              onChangeText={setInitialVes}
            />

            <View className="flex-row gap-2.5 pt-2">
              <View className="flex-1">
                <Button variant="ghost" onPress={() => setShowCashModal(false)}>
                  Cancelar
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="primary" onPress={handleConfirmOpenCash}>
                  Abrir Caja
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

