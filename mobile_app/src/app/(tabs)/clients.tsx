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
  Search,
  UserPlus,
  Users,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X,
  UserCheck,
  CreditCard
} from 'lucide-react-native';
import { Header } from '../../components/ui/header';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { clientRepository, LocalClient } from '../../database/repositories/clientRepository';
import { generateUUID } from '../../utils/uuid';

export default function ClientsScreen() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<LocalClient[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingClient, setEditingClient] = useState<LocalClient | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState<'CI' | 'RIF' | 'Pasaporte'>('CI');
  const [idNumber, setIdNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('100');
  const [currentDebt, setCurrentDebt] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadClients = async () => {
    setRefreshing(true);
    try {
      if (search.trim()) {
        const results = await clientRepository.search(search.trim());
        setClients(results);
      } else {
        const all = await clientRepository.getAll();
        setClients(all);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [search]);

  // Derived Metrics
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.is_active).length;
  const totalDebt = clients.reduce((sum, c) => sum + (c.current_debt || 0), 0);

  const openFormModal = (client?: LocalClient) => {
    if (client) {
      setEditingClient(client);
      setName(client.name);
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setIdType(client.identification_type || 'CI');
      setIdNumber(client.identification_number || '');
      setCreditLimit(String(client.credit_limit ?? 100));
      setCurrentDebt(String(client.current_debt ?? 0));
      setIsActive(client.is_active ?? true);
    } else {
      setEditingClient(null);
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setIdType('CI');
      setIdNumber('');
      setCreditLimit('100');
      setCurrentDebt('0');
      setIsActive(true);
    }
    setShowFormModal(true);
  };

  const handleSaveClient = async () => {
    if (!name.trim() || !idNumber.trim() || !email.trim()) {
      Alert.alert('Campos Requeridos', 'Por favor ingrese Nombre, Email y Número de Identificación.');
      return;
    }

    setSaving(true);
    try {
      const formattedNum = idNumber.trim().toUpperCase();
      const dniRif = `${idType}-${formattedNum}`;
      const limitNum = parseFloat(creditLimit) || 0;
      const debtNum = parseFloat(currentDebt) || 0;

      if (editingClient) {
        await clientRepository.update(editingClient.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          identification_type: idType,
          identification_number: formattedNum,
          dni_rif: dniRif,
          credit_limit: limitNum,
          current_debt: debtNum,
          is_active: isActive
        });
        Alert.alert('Éxito', 'Cliente actualizado correctamente.');
      } else {
        const newClient: LocalClient = {
          id: generateUUID(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          identification_type: idType,
          identification_number: formattedNum,
          dni_rif: dniRif,
          credit_limit: limitNum,
          current_debt: debtNum,
          is_active: isActive,
          synced: false,
          updated_at: new Date().toISOString()
        };
        await clientRepository.create(newClient);
        Alert.alert('Éxito', 'Cliente registrado correctamente.');
      }

      setShowFormModal(false);
      loadClients();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (client: LocalClient) => {
    try {
      await clientRepository.toggleActive(client.id, !client.is_active);
      loadClients();
    } catch (err) {
      Alert.alert('Error', 'No se pudo cambiar el estado del cliente.');
    }
  };

  const handleDeleteClient = (client: LocalClient) => {
    Alert.alert(
      '¿Eliminar cliente?',
      `¿Estás seguro de que deseas eliminar a ${client.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clientRepository.delete(client.id);
              loadClients();
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el cliente.');
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-100">
      <Header title="Gestión de Clientes" />

      <View className="p-4 flex-1">
        {/* Header Metrics Cards */}
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Users size={16} color="#4f46e5" />
              <Text className="text-slate-500 text-[11px] font-bold">Total</Text>
            </View>
            <Text className="text-slate-900 font-black text-lg">{totalClients}</Text>
          </View>

          <View className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-1.5 mb-1">
              <UserCheck size={16} color="#16a34a" />
              <Text className="text-slate-500 text-[11px] font-bold">Activos</Text>
            </View>
            <Text className="text-emerald-600 font-black text-lg">{activeClients}</Text>
          </View>

          <View className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-1.5 mb-1">
              <DollarSign size={16} color="#dc2626" />
              <Text className="text-slate-500 text-[11px] font-bold">Deuda</Text>
            </View>
            <Text className="text-red-600 font-black text-lg">${totalDebt.toFixed(2)}</Text>
          </View>
        </View>

        {/* Search & New Action */}
        <View className="flex-row items-center gap-2 mb-4">
          <View className="flex-1">
            <Input
              placeholder="Buscar cliente por nombre, email o ID..."
              value={search}
              onChangeText={setSearch}
              containerClassName="mb-0"
            />
          </View>
          <Pressable
            onPress={() => openFormModal()}
            className="bg-indigo-900 active:bg-indigo-950 px-4 py-3 rounded-2xl flex-row items-center gap-1.5 shadow-sm"
          >
            <UserPlus size={18} color="#ffffff" />
            <Text className="text-white font-extrabold text-xs">Nuevo</Text>
          </Pressable>
        </View>

        {/* Clients List */}
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadClients} tintColor="#4f46e5" />}
          renderItem={({ item }) => (
            <Card className="mb-3 bg-white border-slate-200 p-4 rounded-3xl shadow-sm">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-slate-900 font-extrabold text-base">{item.name}</Text>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        item.is_active ? 'bg-emerald-100' : 'bg-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-extrabold ${
                          item.is_active ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md">
                      <Text className="text-indigo-900 text-[11px] font-mono font-bold">
                        {item.identification_type}-{item.identification_number}
                      </Text>
                    </View>
                    <View className="px-2 py-0.5 bg-slate-100 rounded-md">
                      <Text className="text-slate-500 text-[10px] font-bold">
                        {item.synced ? 'Synced' : 'Local'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick Switch & Action Buttons */}
                <View className="flex-row items-center gap-1">
                  <Switch
                    value={item.is_active}
                    onValueChange={() => handleToggleStatus(item)}
                    trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                    thumbColor={item.is_active ? '#4f46e5' : '#f8fafc'}
                  />
                  <Pressable
                    onPress={() => openFormModal(item)}
                    className="p-2 bg-slate-100 rounded-xl active:bg-slate-200"
                  >
                    <Edit2 size={16} color="#475569" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteClient(item)}
                    className="p-2 bg-red-50 rounded-xl active:bg-red-100"
                  >
                    <Trash2 size={16} color="#dc2626" />
                  </Pressable>
                </View>
              </View>

              {/* Financial Status Pills */}
              <View className="flex-row gap-2 my-2.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[10px] font-bold">Límite Crédito</Text>
                  <Text className="text-slate-700 font-extrabold text-xs">
                    ${(item.credit_limit || 0).toFixed(2)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[10px] font-bold">Deuda Actual</Text>
                  <Text
                    className={`font-black text-xs ${
                      (item.current_debt || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    ${(item.current_debt || 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Contact Info */}
              {(item.phone || item.email || item.address) && (
                <View className="border-t border-slate-100 pt-2.5 gap-1.5">
                  {item.email ? (
                    <View className="flex-row items-center gap-2">
                      <Mail size={13} color="#64748b" />
                      <Text className="text-slate-600 text-xs font-semibold">{item.email}</Text>
                    </View>
                  ) : null}
                  {item.phone ? (
                    <View className="flex-row items-center gap-2">
                      <Phone size={13} color="#64748b" />
                      <Text className="text-slate-600 text-xs font-semibold">{item.phone}</Text>
                    </View>
                  ) : null}
                  {item.address ? (
                    <View className="flex-row items-center gap-2">
                      <MapPin size={13} color="#64748b" />
                      <Text className="text-slate-500 text-xs font-medium">{item.address}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-slate-400 text-sm font-semibold">No se encontraron clientes</Text>
            </View>
          }
        />
      </View>

      {/* Full Create / Edit Client Modal */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-slate-900 border-t border-gray-800 rounded-t-3xl p-5 max-h-[90%]">
            <View className="flex-row justify-between items-center pb-4 border-b border-gray-800 mb-4">
              <View className="flex-row items-center gap-2">
                <View className="p-2 bg-indigo-900/50 rounded-xl">
                  {editingClient ? <Edit2 size={20} color="#818cf8" /> : <UserPlus size={20} color="#818cf8" />}
                </View>
                <Text className="text-white font-bold text-lg">
                  {editingClient ? 'Editar Cliente' : 'Registrar Cliente'}
                </Text>
              </View>
              <Pressable onPress={() => setShowFormModal(false)} className="p-1">
                <X size={22} color="#9ca3af" />
              </Pressable>
            </View>

            <ScrollView className="space-y-3 mb-4">
              <Input
                label="Nombre o Empresa *"
                placeholder="Ej: Juan Pérez / Empresa C.A."
                value={name}
                onChangeText={setName}
              />

              <Input
                label="Correo Electrónico *"
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text className="text-gray-300 text-xs font-semibold">Tipo de Identificación *</Text>
              <View className="flex-row gap-2 mb-2">
                {(['CI', 'RIF', 'Pasaporte'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setIdType(type)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      idType === type ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Text className={`font-bold text-xs ${idType === type ? 'text-white' : 'text-gray-400'}`}>
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Input
                label="Número de Identificación *"
                placeholder="V-12345678 / J-123456789"
                value={idNumber}
                onChangeText={setIdNumber}
              />

              <Input
                label="Teléfono"
                placeholder="+58 412 0000000"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Input
                label="Dirección Fiscal"
                placeholder="Calle, Ciudad, Zona..."
                value={address}
                onChangeText={setAddress}
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    label="Límite de Crédito ($)"
                    placeholder="100.00"
                    keyboardType="decimal-pad"
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Deuda Actual ($)"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={currentDebt}
                    onChangeText={setCurrentDebt}
                    editable={false}
                  />
                </View>
              </View>

              <View className="flex-row justify-between items-center p-3 bg-slate-800/60 rounded-2xl border border-slate-700 mt-2">
                <View>
                  <Text className="text-white font-bold text-sm">Estado del Cliente</Text>
                  <Text className="text-gray-400 text-xs">Permite facturación y crédito</Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#475569', true: '#6366f1' }}
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
                <Button loading={saving} variant="primary" onPress={handleSaveClient}>
                  {editingClient ? 'Actualizar' : 'Guardar'}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
