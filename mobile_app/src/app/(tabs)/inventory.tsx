import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Header } from '../../components/ui/header';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useProducts } from '../../hooks/useProducts';
import { useCartStore } from '../../stores/cart-store';
import { formatUSD, formatVES, convertUsdToVes } from '../../utils/formatters';

export default function InventoryScreen() {
  const [search, setSearch] = useState('');
  const { products, isLoading, refetch } = useProducts(search);
  const exchangeRate = useCartStore((s) => s.exchangeRate);

  const totalStock = products.reduce((acc, p) => acc + p.current_stock, 0);

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="Consulta de Inventario" />

      <View className="p-4 flex-1">
        {/* Summary Card */}
        <View className="flex-row gap-3 mb-4">
          <Card className="flex-1 p-3">
            <Text className="text-gray-400 text-xs font-medium">Total Catálogo</Text>
            <Text className="text-white font-extrabold text-xl mt-0.5">{products.length} Items</Text>
          </Card>
          <Card className="flex-1 p-3">
            <Text className="text-gray-400 text-xs font-medium">Stock Total</Text>
            <Text className="text-indigo-400 font-extrabold text-xl mt-0.5">{totalStock} Unidades</Text>
          </Card>
        </View>

        {/* Search */}
        <Input
          placeholder="Buscar producto por nombre o código..."
          value={search}
          onChangeText={setSearch}
        />

        {/* Inventory List */}
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const vesPrice = convertUsdToVes(item.price_usd, exchangeRate);
            const isLow = item.current_stock <= item.min_stock;

            return (
              <Card className="mb-3 p-4">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-white font-bold text-base">{item.name}</Text>
                    <Text className="text-gray-400 text-xs">
                      {item.barcode ? `Cód: ${item.barcode}` : 'Sin código'}
                    </Text>
                  </View>

                  <Badge
                    label={`Stock: ${item.current_stock}`}
                    variant={isLow ? 'destructive' : 'info'}
                  />
                </View>

                <View className="flex-row justify-between items-center border-t border-gray-800 pt-3 mt-1">
                  <View>
                    <Text className="text-gray-400 text-[10px]">PRECIO USD</Text>
                    <Text className="text-indigo-400 font-extrabold text-base">
                      {formatUSD(item.price_usd)}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-gray-400 text-[10px]">PRECIO BOLÍVARES</Text>
                    <Text className="text-emerald-400 font-bold text-base">
                      {formatVES(vesPrice)}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-gray-500 text-base">
                {isLoading ? 'Cargando inventario...' : 'No se encontraron productos'}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
