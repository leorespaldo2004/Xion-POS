import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  Switch
} from 'react-native';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Lock,
  Edit2,
  Trash2,
  X,
  Wallet,
  DollarSign
} from 'lucide-react-native';
import { Header } from '../../components/ui/header';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { paymentMethodRepository, LocalPaymentMethod } from '../../database/repositories/paymentMethodRepository';
import { generateUUID } from '../../utils/uuid';

export default function PaymentMethodsScreen() {
  const [search, setSearch] = useState('');
  const [methods, setMethods] = useState<LocalPaymentMethod[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<LocalPaymentMethod | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [currency, setCurrency] = useState<'VES' | 'USD'>('VES');
  const [allowDecimals, setAllowDecimals] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMethods = async () => {
    setRefreshing(true);
    try {
      if (search.trim()) {
        const results = await paymentMethodRepository.search(search.trim());
        setMethods(results);
      } else {
        const all = await paymentMethodRepository.getAll();
        setMethods(all);
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, [search]);

  // Derived Metrics
  const totalMethods = methods.length;
  const activeMethods = methods.filter((m) => m.is_active).length;
  const systemMethods = methods.filter((m) => m.is_system).length;

  const generateCodeFromName = (val: string) => {
    if (editingMethod) return;
    const clean = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^|_$/g, '');
    setCode(clean);
  };

  const openFormModal = (method?: LocalPaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setName(method.name);
      setCode(method.code);
      setCurrency((method.currency as any) || 'VES');
      setAllowDecimals(method.allow_decimals ?? true);
      setIsActive(method.is_active ?? true);
    } else {
      setEditingMethod(null);
      setName('');
      setCode('');
      setCurrency('VES');
      setAllowDecimals(true);
      setIsActive(true);
    }
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      Alert.alert('Campos Requeridos', 'Por favor ingrese Nombre y Código Interno del método.');
      return;
    }

    setSaving(true);
    try {
      if (editingMethod) {
        await paymentMethodRepository.update(editingMethod.id, {
          name: editingMethod.is_system ? editingMethod.name : name.trim(),
          currency: editingMethod.is_system ? editingMethod.currency : currency,
          allow_decimals: editingMethod.is_system ? editingMethod.allow_decimals : allowDecimals,
          is_active: isActive
        });
        Alert.alert('Éxito', 'Método de pago actualizado correctamente.');
      } else {
        const newMethod: LocalPaymentMethod = {
          id: generateUUID(),
          name: name.trim(),
          code: code.trim(),
          currency,
          allow_decimals: allowDecimals,
          is_system: false,
          is_active: isActive,
          requires_reference: !code.includes('efectivo')
        };
        await paymentMethodRepository.create(newMethod);
        Alert.alert('Éxito', 'Método de pago creado correctamente.');
      }

      setShowFormModal(false);
      loadMethods();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar el método de pago.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (method: LocalPaymentMethod) => {
    try {
      await paymentMethodRepository.toggleActive(method.id, !method.is_active);
      loadMethods();
    } catch (err) {
      Alert.alert('Error', 'No se pudo cambiar el estado del método.');
    }
  };

  const handleDelete = (method: LocalPaymentMethod) => {
    if (method.is_system) {
      Alert.alert('Acción Protegida', 'No se pueden eliminar métodos de pago de sistema.');
      return;
    }

    Alert.alert(
      '¿Eliminar método de pago?',
      `¿Estás seguro de que deseas eliminar ${method.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentMethodRepository.delete(method.id);
              loadMethods();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar el método.');
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-100">
      <Header title="Métodos de Pago" />

      <View className="p-4 flex-1">
        {/* Header Metrics */}
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-1.5 mb-1">
              <CreditCard size={16} color="#3b82f6" />
              <Text className="text-slate-500 text-[11px] font-bold">Total</Text>
            </View>
            <Text className="text-slate-900 font-black text-lg">{totalMethods}</Text>
          </View>

          <View className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-1.5 mb-1">
              <CheckCircle2 size={16} color="#16a34a" />
              <Text className="text-slate-500 text-[11px] font-bold">Activos</Text>
            </View>
            <Text className="text-emerald-600 font-black text-lg">{activeMethods}</Text>
          </View>

          <View className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Lock size={16} color="#6366f1" />
              <Text className="text-slate-500 text-[11px] font-bold">Sistema</Text>
            </View>
            <Text className="text-indigo-600 font-black text-lg">{systemMethods}</Text>
          </View>
        </View>

        {/* Search & Add Action */}
        <View className="flex-row items-center gap-2 mb-4">
          <View className="flex-1">
            <Input
              placeholder="Buscar método o moneda (USD/VES)..."
              value={search}
              onChangeText={setSearch}
              containerClassName="mb-0"
            />
          </View>
          <Pressable
            onPress={() => openFormModal()}
            className="bg-blue-600 active:bg-blue-700 px-4 py-3 rounded-2xl flex-row items-center gap-1.5 shadow-sm"
          >
            <Plus size={18} color="#ffffff" />
            <Text className="text-white font-extrabold text-xs">Nuevo</Text>
          </Pressable>
        </View>

        {/* Methods Cards List */}
        <FlatList
          data={methods}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadMethods} tintColor="#3b82f6" />}
          renderItem={({ item }) => (
            <Card className="mb-3 bg-white border-slate-200 p-4 rounded-3xl shadow-sm">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <View className="p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                    <CreditCard size={22} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-slate-900 font-extrabold text-base">{item.name}</Text>
                      {item.is_system ? (
                        <View className="px-2 py-0.5 bg-indigo-100 rounded-full">
                          <Text className="text-indigo-800 text-[9px] font-black uppercase">Sistema</Text>
                        </View>
                      ) : null}
                      {!item.is_active ? (
                        <View className="px-2 py-0.5 bg-red-100 rounded-full">
                          <Text className="text-red-800 text-[9px] font-black uppercase">Inactivo</Text>
                        </View>
                      ) : null}
                    </View>

                    <View className="flex-row items-center gap-2 mt-1.5">
                      <View className="px-2.5 py-0.5 bg-slate-100 rounded-md">
                        <Text className="text-slate-700 text-[10px] font-extrabold uppercase">
                          {item.currency}
                        </Text>
                      </View>
                      <View className="px-2.5 py-0.5 bg-slate-100 rounded-md">
                        <Text className="text-slate-500 text-[10px] font-semibold">
                          {item.allow_decimals ? 'Dec' : 'No Dec'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center gap-1">
                  <Switch
                    value={item.is_active}
                    onValueChange={() => handleToggleStatus(item)}
                    trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                    thumbColor={item.is_active ? '#2563eb' : '#f8fafc'}
                  />
                  <Pressable
                    onPress={() => openFormModal(item)}
                    className="p-2 bg-slate-100 rounded-xl active:bg-slate-200"
                  >
                    <Edit2 size={16} color="#475569" />
                  </Pressable>
                  {!item.is_system && (
                    <Pressable
                      onPress={() => handleDelete(item)}
                      className="p-2 bg-red-50 rounded-xl active:bg-red-100"
                    >
                      <Trash2 size={16} color="#dc2626" />
                    </Pressable>
                  )}
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-slate-400 text-sm font-semibold">No se encontraron métodos de pago</Text>
            </View>
          }
        />
      </View>

      {/* Create / Edit Payment Method Modal */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-slate-900 border-t border-gray-800 rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center pb-4 border-b border-gray-800 mb-4">
              <View className="flex-row items-center gap-2">
                <View className="p-2 bg-blue-900/50 rounded-xl">
                  <CreditCard size={20} color="#60a5fa" />
                </View>
                <Text className="text-white font-bold text-lg">
                  {editingMethod ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
                </Text>
              </View>
              <Pressable onPress={() => setShowFormModal(false)} className="p-1">
                <X size={22} color="#9ca3af" />
              </Pressable>
            </View>

            {editingMethod?.is_system && (
              <View className="bg-amber-950/40 border border-amber-800 p-2.5 rounded-xl mb-3">
                <Text className="text-amber-400 text-xs font-bold uppercase text-center">
                  Método de Sistema: Campos estructurales protegidos.
                </Text>
              </View>
            )}

            <ScrollView className="space-y-3 mb-4">
              <Input
                label="Nombre a Mostrar *"
                placeholder="Ej: Binance Pay / Pago Móvil"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  generateCodeFromName(val);
                }}
                editable={!editingMethod?.is_system}
              />

              <Input
                label="Código Interno *"
                placeholder="binance_pay"
                value={code}
                onChangeText={setCode}
                editable={!editingMethod}
              />

              <Text className="text-gray-300 text-xs font-semibold">Moneda Base *</Text>
              <View className="flex-row gap-2 mb-2">
                {(['VES', 'USD'] as const).map((curr) => (
                  <Pressable
                    key={curr}
                    onPress={() => !editingMethod?.is_system && setCurrency(curr)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      currency === curr
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Text className={`font-bold text-xs ${currency === curr ? 'text-white' : 'text-gray-400'}`}>
                      {curr === 'VES' ? 'Bolívares (VES)' : 'Dólares (USD)'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="flex-row justify-between items-center p-3 bg-slate-800/60 rounded-2xl border border-slate-700 mt-1">
                <View>
                  <Text className="text-white font-bold text-sm">Admite Decimales</Text>
                  <Text className="text-gray-400 text-xs">Permite fracciones (ej: $10.50)</Text>
                </View>
                <Switch
                  value={allowDecimals}
                  onValueChange={setAllowDecimals}
                  disabled={editingMethod?.is_system || code.includes('efectivo')}
                  trackColor={{ false: '#475569', true: '#3b82f6' }}
                />
              </View>

              <View className="flex-row justify-between items-center p-3 bg-slate-800/60 rounded-2xl border border-slate-700 mt-1">
                <View>
                  <Text className="text-white font-bold text-sm">Habilitado en POS</Text>
                  <Text className="text-gray-400 text-xs">Disponible para cobros</Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#475569', true: '#3b82f6' }}
                />
              </View>
            </ScrollView>

            <View className="flex-row gap-3 pt-3 border-t border-gray-800">
              <View className="flex-1">
                <Button variant="ghost" onPress={() => setShowFormModal(false)}>
                  Cancelar
                </Button>
              </View>
              <View className="flex-1">
                <Button loading={saving} variant="primary" onPress={handleSave}>
                  {editingMethod ? 'Actualizar' : 'Guardar'}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
