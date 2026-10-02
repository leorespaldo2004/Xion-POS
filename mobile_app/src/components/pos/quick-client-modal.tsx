import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { X, UserPlus } from 'lucide-react-native';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { clientRepository, LocalClient } from '../../database/repositories/clientRepository';
import { generateUUID } from '../../utils/uuid';

interface QuickClientModalProps {
  visible: boolean;
  onClose: () => void;
  initialDni?: string;
  onClientCreated: (client: LocalClient) => void;
}

export function QuickClientModal({
  visible,
  onClose,
  initialDni = '',
  onClientCreated
}: QuickClientModalProps) {
  const [idType, setIdType] = useState<'CI' | 'RIF' | 'Pasaporte'>('CI');
  const [idNumber, setIdNumber] = useState(initialDni);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!idNumber.trim() || !name.trim()) {
      Alert.alert('Campos Obligatorios', 'Ingrese Número de Identificación y Nombre o Empresa.');
      return;
    }

    setLoading(true);
    try {
      const formattedNum = idNumber.trim().toUpperCase();
      const dniRif = `${idType}-${formattedNum}`;

      const newClient: LocalClient = {
        id: generateUUID(),
        dni_rif: dniRif,
        name: name.trim(),
        email: email.trim() || 'cliente@local.com',
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        identification_type: idType,
        identification_number: formattedNum,
        credit_limit: 100,
        current_debt: 0,
        is_active: true,
        synced: false,
        updated_at: new Date().toISOString()
      };

      await clientRepository.create(newClient);
      onClientCreated(newClient);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar el cliente localmente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/70">
        <View className="bg-slate-900 border-t border-gray-800 rounded-t-3xl p-5 max-h-[85%]">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-4 border-b border-gray-800 mb-4">
            <View className="flex-row items-center gap-2">
              <View className="p-2 bg-indigo-900/50 rounded-xl">
                <UserPlus size={20} color="#818cf8" />
              </View>
              <Text className="text-white font-bold text-lg">Registro Rápido de Cliente</Text>
            </View>
            <Pressable onPress={onClose} className="p-1">
              <X size={22} color="#9ca3af" />
            </Pressable>
          </View>

          <ScrollView className="space-y-3 mb-4">
            {/* Identification Type Selector */}
            <Text className="text-gray-300 text-xs font-semibold">Tipo de Identificación *</Text>
            <View className="flex-row gap-2 mb-2">
              {(['CI', 'RIF', 'Pasaporte'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setIdType(type)}
                  className={`flex-1 py-2 rounded-xl border items-center ${
                    idType === type
                      ? 'bg-indigo-600 border-indigo-500'
                      : 'bg-slate-800 border-slate-700'
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
              placeholder="Ej: 12345678"
              value={idNumber}
              onChangeText={setIdNumber}
            />

            <Input
              label="Nombre o Razón Social *"
              placeholder="Ej: Maria Lopez / Empresa CA"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Teléfono"
              placeholder="+58 412 0000000"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Input
              label="Correo Electrónico"
              placeholder="cliente@ejemplo.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label="Dirección Fiscal"
              placeholder="Ciudad, Sector..."
              value={address}
              onChangeText={setAddress}
            />
          </ScrollView>

          <View className="flex-row gap-3 pt-2 border-t border-gray-800">
            <View className="flex-1">
              <Button variant="ghost" onPress={onClose}>
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button loading={loading} variant="primary" onPress={handleSave}>
                Guardar Cliente
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

