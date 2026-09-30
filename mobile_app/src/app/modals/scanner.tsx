import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { X, Flashlight } from 'lucide-react-native';
import { productRepository } from '../../database/repositories/productRepository';
import { useCartStore } from '../../stores/cart-store';
import { Button } from '../../components/ui/button';

export default function BarcodeScannerModal() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const product = await productRepository.getByBarcode(data);
      if (product) {
        addItem(product, 1);
        Alert.alert('Producto Agregado', `${product.name}\n${product.price_usd} USD`, [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]);
      } else {
        Alert.alert('No Encontrado', `No existe producto con código: ${data}`, [
          {
            text: 'Reintentar',
            onPress: () => setScanned(false)
          },
          {
            text: 'Cerrar',
            onPress: () => router.back(),
            style: 'cancel'
          }
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error buscando producto');
      setScanned(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center p-6">
        <Text className="text-white text-base">Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center p-6">
        <Text className="text-red-400 font-bold text-lg mb-2">Acceso denegado</Text>
        <Text className="text-gray-400 text-center mb-6 font-normal">
          Se requiere permiso de cámara para utilizar el escáner de códigos de barras.
        </Text>
        <Button onPress={requestPermission}>Conceder Permiso</Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr']
        }}
        enableTorch={torch}
        style={StyleSheet.absoluteFillObject}
      >
        {/* Overlay header */}
        <View className="flex-row justify-between items-center p-4 bg-black/60 pt-12">
          <Text className="text-white font-bold text-lg">Escanear Código de Barras</Text>

          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => setTorch(!torch)}
              className={`p-2 rounded-full ${torch ? 'bg-amber-500' : 'bg-gray-800'}`}
            >
              <Flashlight size={20} color="#ffffff" />
            </Pressable>

            <Pressable onPress={() => router.back()} className="p-2 rounded-full bg-gray-800">
              <X size={20} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Viewfinder target square */}
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-72 h-72 border-2 border-indigo-500 rounded-3xl bg-transparent items-center justify-center relative">
            <View className="w-64 h-0.5 bg-red-500/80" />
          </View>
          <Text className="text-white font-medium text-sm mt-6 text-center bg-black/70 px-4 py-2 rounded-full">
            Alinee el código de barras dentro del recuadro
          </Text>
        </View>
      </CameraView>
    </View>
  );
}
