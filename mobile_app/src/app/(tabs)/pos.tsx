import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Search, Camera, Trash2, Plus, Minus, CreditCard, ShoppingCart } from 'lucide-react-native';
import { Header } from '../../components/ui/header';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useProducts } from '../../hooks/useProducts';
import { useCartStore } from '../../stores/cart-store';
import { formatUSD, formatVES, convertUsdToVes } from '../../utils/formatters';

export default function POSScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { products, isLoading, refetch } = useProducts(searchQuery);

  const {
    items,
    client,
    exchangeRate,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotalUsd,
    getTaxUsd,
    getTotalUsd,
    getTotalVes
  } = useCartStore();

  const handleBarcodeScan = () => {
    router.push('/modals/scanner');
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Carrito Vacío', 'Agregue al menos un producto para cobro.');
      return;
    }
    router.push('/modals/payment');
  };

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="Caja POS" />

      {/* Main Split Layout: Products List (Left/Top) & Cart Drawer (Right/Bottom) */}
      <View className="flex-1 md:flex-row">
        {/* Products Section */}
        <View className="flex-1 p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="flex-1">
              <Input
                placeholder="Buscar por producto o código..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                containerClassName="mb-0"
              />
            </View>
            <Pressable
              onPress={handleBarcodeScan}
              className="bg-indigo-600 active:bg-indigo-700 p-3 rounded-xl items-center justify-center"
            >
              <Camera size={22} color="#ffffff" />
            </Pressable>
          </View>

          {/* Product Grid / List */}
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            renderItem={({ item }) => {
              const priceVes = convertUsdToVes(item.price_usd, exchangeRate);
              const isOut = item.current_stock <= 0;

              return (
                <Pressable
                  onPress={() => addItem(item)}
                  disabled={isOut}
                  className={`w-[48%] mb-3 p-3 bg-gray-900 border rounded-xl ${
                    isOut ? 'border-red-900/50 opacity-60' : 'border-gray-800 active:border-indigo-500'
                  }`}
                >
                  <Text className="text-white font-bold text-sm mb-1" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="text-gray-400 text-xs mb-2">
                    {item.barcode ? `Cód: ${item.barcode}` : 'Sin código'}
                  </Text>

                  <View className="flex-row justify-between items-end mt-auto">
                    <View>
                      <Text className="text-indigo-400 font-extrabold text-base">
                        {formatUSD(item.price_usd)}
                      </Text>
                      <Text className="text-gray-400 text-xs">{formatVES(priceVes)}</Text>
                    </View>
                    <View className={`px-1.5 py-0.5 rounded ${isOut ? 'bg-red-950' : 'bg-gray-800'}`}>
                      <Text className={`text-[10px] ${isOut ? 'text-red-400' : 'text-gray-300'}`}>
                        Stock: {item.current_stock}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Text className="text-gray-500 text-base">
                  {isLoading ? 'Cargando productos...' : 'No se encontraron productos'}
                </Text>
              </View>
            }
          />
        </View>

        {/* Cart Drawer Section */}
        <View className="bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 p-4 justify-between md:w-96">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <ShoppingCart size={18} color="#6366f1" />
              <Text className="text-white font-bold text-base">
                Carrito ({items.reduce((acc, i) => acc + i.quantity, 0)})
              </Text>
            </View>

            {items.length > 0 && (
              <Pressable onPress={clearCart} className="flex-row items-center gap-1">
                <Trash2 size={14} color="#ef4444" />
                <Text className="text-red-400 text-xs font-semibold">Vaciar</Text>
              </Pressable>
            )}
          </View>

          {/* Cart Items List */}
          <ScrollView className="max-h-56 md:max-h-none mb-3">
            {items.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <Text className="text-gray-500 text-sm">El carrito está vacío</Text>
              </View>
            ) : (
              items.map((item) => (
                <View
                  key={item.product_id}
                  className="bg-gray-950 border border-gray-800 rounded-xl p-3 mb-2 flex-row justify-between items-center"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                      {item.product_name}
                    </Text>
                    <Text className="text-indigo-400 text-xs font-medium">
                      {formatUSD(item.unit_price_usd)} c/u
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="bg-gray-800 p-1.5 rounded-lg active:bg-gray-700"
                    >
                      <Minus size={14} color="#ffffff" />
                    </Pressable>

                    <Text className="text-white font-bold text-sm min-w-[20px] text-center">
                      {item.quantity}
                    </Text>

                    <Pressable
                      onPress={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="bg-gray-800 p-1.5 rounded-lg active:bg-gray-700"
                    >
                      <Plus size={14} color="#ffffff" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Totals & Checkout Button */}
          <View className="border-t border-gray-800 pt-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-400 text-xs">Subtotal:</Text>
              <Text className="text-gray-300 text-xs font-medium">{formatUSD(getSubtotalUsd())}</Text>
            </View>
            {getTaxUsd() > 0 && (
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 text-xs">IVA (16%):</Text>
                <Text className="text-gray-300 text-xs font-medium">{formatUSD(getTaxUsd())}</Text>
              </View>
            )}
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-white font-bold text-lg">{formatUSD(getTotalUsd())}</Text>
                <Text className="text-emerald-400 text-xs font-semibold">{formatVES(getTotalVes())}</Text>
              </View>
              <Text className="text-gray-500 text-[10px]">Tasa: {exchangeRate} Bs/$</Text>
            </View>

            <Button
              onPress={handleCheckout}
              disabled={items.length === 0}
              variant="success"
              size="lg"
            >
              Procesar Cobro
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}
