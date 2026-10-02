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
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  FileText,
  Clock
} from 'lucide-react-native';
import { Header } from '../../components/ui/header';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { supplierRepository, LocalSupplier } from '../../database/repositories/supplierRepository';
import { generateUUID } from '../../utils/uuid';

const CATEGORIES = [
  'Bebidas',
  'Alimentos',
  'Snacks',
  'Limpieza',
  'Equipos',
  'Varios'
];

export default function SuppliersScreen() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<LocalSupplier[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<LocalSupplier | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [idType, setIdType] = useState<'RIF' | 'CI' | 'Pasaporte'>('RIF');
  const [idNumber, setIdNumber] = useState('');
  const [category, setCategory] = useState('Varios');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSuppliers = async () => {
    setRefreshing(true);
    try {
      if (search.trim()) {
        const results = await supplierRepository.search(search.trim());
        setSuppliers(results);
      } else {
        const all = await supplierRepository.getAll();
        setSuppliers(all);
      }
    } catch (err) {
      console.error('Error loading suppliers:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  // Derived Filtered & Metrics
  const filteredSuppliers = suppliers.filter((s) => {
    if (!selectedCategory) return true;
    return s.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.is_active).length;

  const openFormModal = (supplier?: LocalSupplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setName(supplier.name);
      setEmail(supplier.email || '');
      setPhone(supplier.phone || '');
      setAddress(supplier.address || '');
      setIdType(supplier.identification_type || 'RIF');
      setIdNumber(supplier.identification_number || '');
      setCategory(supplier.category || 'Varios');
      setPaymentTerms(supplier.payment_terms || '');
      setNotes(supplier.notes || '');
      setIsActive(supplier.is_active ?? true);
    } else {
      setEditingSupplier(null);
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setIdType('RIF');
      setIdNumber('');
      setCategory('Varios');
      setPaymentTerms('');
      setNotes('');
      setIsActive(true);
    }
    setShowFormModal(true);
  };

  const handleSaveSupplier = async () => {
    if (!name.trim() || !idNumber.trim() || !email.trim()) {
      Alert.alert('Campos Requeridos', 'Por favor ingrese Nombre de Empresa, Email y Número de Identificación.');
      return;
    }

    setSaving(true);
    try {
      const formattedNum = idNumber.trim().toUpperCase();
      const dniRif = `${idType}-${formattedNum}`;

      if (editingSupplier) {
        await supplierRepository.update(editingSupplier.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          identification_type: idType,
          identification_number: formattedNum,
          dni_rif: dniRif,
          category,
          payment_terms: paymentTerms.trim() || null,
          notes: notes.trim() || null,
          is_active: isActive
        });
        Alert.alert('Éxito', 'Proveedor actualizado correctamente.');
      } else {
        const newSupplier: LocalSupplier = {
          id: generateUUID(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          identification_type: idType,
          identification_number: formattedNum,
          dni_rif: dniRif,
          category,
          payment_terms: paymentTerms.trim() || null,
          notes: notes.trim() || null,
          is_active: isActive,
          synced: false,
          updated_at: new Date().toISOString()
        };
        await supplierRepository.create(newSupplier);
        Alert.alert('Éxito', 'Proveedor registrado correctamente.');
      }

      setShowFormModal(false);
      loadSuppliers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (supplier: LocalSupplier) => {
    try {
      await supplierRepository.toggleActive(supplier.id, !supplier.is_active);
      loadSuppliers();
    } catch (err) {
      Alert.alert('Error', 'No se pudo cambiar el estado del proveedor.');
    }
  };

  const handleDeleteSupplier = (supplier: LocalSupplier) => {
    Alert.alert(
      '¿Eliminar proveedor?',
      `¿Estás seguro de que deseas eliminar a ${supplier.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await supplierRepository.delete(supplier.id);
              loadSuppliers();
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el proveedor.');
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-100">
      <Header title="Gestión de Proveedores" />

      <View className="p-4 flex-1">
        {/* Metrics Cards */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-2 mb-1">
              <Building2 size={18} color="#3b82f6" />
              <Text className="text-slate-500 text-xs font-bold">Total Proveedores</Text>
            </View>
            <Text className="text-slate-900 font-black text-xl">{totalSuppliers}</Text>
          </View>

          <View className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-2 mb-1">
              <CheckCircle2 size={18} color="#16a34a" />
              <Text className="text-slate-500 text-xs font-bold">Activos</Text>
            </View>
            <Text className="text-emerald-600 font-black text-xl">{activeSuppliers}</Text>
          </View>
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-3">
          <Pressable
            onPress={() => setSelectedCategory(null)}
            className={`px-3.5 py-1.5 rounded-full border ${
              selectedCategory === null
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedCategory === null ? 'text-white' : 'text-slate-600'
              }`}
            >
              Todas
            </Text>
          </Pressable>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(isSelected ? null : cat)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search & Action Bar */}
        <View className="flex-row items-center gap-2 mb-4">
          <View className="flex-1">
            <Input
              placeholder="Buscar por empresa, email o RIF..."
              value={search}
              onChangeText={setSearch}
              containerClassName="mb-0"
            />
          </View>
          <Pressable
            onPress={() => openFormModal()}
            className="bg-blue-600 active:bg-blue-700 px-4 py-3 rounded-2xl flex-row items-center gap-1.5 shadow-sm"
          >
            <UserPlus size={18} color="#ffffff" />
            <Text className="text-white font-extrabold text-xs">Nuevo</Text>
          </Pressable>
        </View>

        {/* Suppliers List */}
        <FlatList
          data={filteredSuppliers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSuppliers} tintColor="#3b82f6" />}
          renderItem={({ item }) => (
            <Card className="mb-3 bg-white border-slate-200 p-4 rounded-3xl shadow-sm">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-slate-900 font-extrabold text-base">{item.name}</Text>
                    <View className="px-2.5 py-0.5 bg-blue-100 rounded-full">
                      <Text className="text-blue-800 text-[10px] font-bold">{item.category}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md">
                      <Text className="text-slate-800 text-[11px] font-mono font-bold">
                        {item.identification_type}-{item.identification_number}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Switch & Action Buttons */}
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
                  <Pressable
                    onPress={() => handleDeleteSupplier(item)}
                    className="p-2 bg-red-50 rounded-xl active:bg-red-100"
                  >
                    <Trash2 size={16} color="#dc2626" />
                  </Pressable>
                </View>
              </View>

              {/* Payment Terms & Notes */}
              {(item.payment_terms || item.notes) && (
                <View className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 my-2 gap-1">
                  {item.payment_terms ? (
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={13} color="#2563eb" />
                      <Text className="text-slate-700 text-xs font-semibold">
                        Términos: {item.payment_terms}
                      </Text>
                    </View>
                  ) : null}
                  {item.notes ? (
                    <View className="flex-row items-center gap-1.5">
                      <FileText size={13} color="#64748b" />
                      <Text className="text-slate-500 text-xs italic">{item.notes}</Text>
                    </View>
                  ) : null}
                </View>
              )}

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
              <Text className="text-slate-400 text-sm font-semibold">No se encontraron proveedores</Text>
            </View>
          }
        />
      </View>

      {/* Full Create / Edit Supplier Modal */}
      <Modal visible={showFormModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-slate-900 border-t border-gray-800 rounded-t-3xl p-5 max-h-[90%]">
            <View className="flex-row justify-between items-center pb-4 border-b border-gray-800 mb-4">
              <View className="flex-row items-center gap-2">
                <View className="p-2 bg-blue-900/50 rounded-xl">
                  <Building2 size={20} color="#60a5fa" />
                </View>
                <Text className="text-white font-bold text-lg">
                  {editingSupplier ? 'Editar Proveedor' : 'Registrar Proveedor'}
                </Text>
              </View>
              <Pressable onPress={() => setShowFormModal(false)} className="p-1">
                <X size={22} color="#9ca3af" />
              </Pressable>
            </View>

            <ScrollView className="space-y-3 mb-4">
              <Input
                label="Nombre de la Empresa *"
                placeholder="Ej: Distribuidora ACME C.A."
                value={name}
                onChangeText={setName}
              />

              <Input
                label="Correo Electrónico *"
                placeholder="ventas@ejemplo.com"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text className="text-gray-300 text-xs font-semibold">Tipo de Identificación *</Text>
              <View className="flex-row gap-2 mb-2">
                {(['RIF', 'CI', 'Pasaporte'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setIdType(type)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      idType === type ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'
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
                placeholder="J-12345678-9 / V-12345678"
                value={idNumber}
                onChangeText={setIdNumber}
              />

              <Text className="text-gray-300 text-xs font-semibold">Categoría *</Text>
              <View className="flex-row flex-wrap gap-2 mb-2">
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-xl border ${
                      category === cat ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Text className={`font-bold text-xs ${category === cat ? 'text-white' : 'text-gray-400'}`}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

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

              <Input
                label="Términos de Pago"
                placeholder="Ej: Pago a 30 días, Crédito semanal..."
                value={paymentTerms}
                onChangeText={setPaymentTerms}
              />

              <Input
                label="Notas y Referencias"
                placeholder="Información adicional, tiempos de entrega..."
                value={notes}
                onChangeText={setNotes}
              />

              <View className="flex-row justify-between items-center p-3 bg-slate-800/60 rounded-2xl border border-slate-700 mt-2">
                <View>
                  <Text className="text-white font-bold text-sm">Estado del Proveedor</Text>
                  <Text className="text-gray-400 text-xs">Activa o inactiva en el sistema</Text>
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
                <Button loading={saving} variant="primary" onPress={handleSaveSupplier}>
                  {editingSupplier ? 'Actualizar' : 'Guardar'}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
