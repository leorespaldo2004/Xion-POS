import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { Printer, CheckCircle, Clock, Search } from 'lucide-react-native';
import { Header } from '../../components/ui/header';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { saleRepository, LocalSale } from '../../database/repositories/saleRepository';
import { usePrinter } from '../../hooks/usePrinter';
import { formatUSD, formatVES, formatDate } from '../../utils/formatters';

export default function OrdersScreen() {
  const [sales, setSales] = useState<LocalSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending_sync' | 'synced'>('all');
  const { printSale } = usePrinter();

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await saleRepository.getAll(100);
      setSales(data);
    } catch (err) {
      console.error('Error loading sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (sale: LocalSale) => {
    const fullSale = await saleRepository.getById(sale.id);
    if (fullSale && fullSale.items && fullSale.payments) {
      await printSale(fullSale, fullSale.items, fullSale.payments);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (filter === 'pending_sync') return s.status === 'pending_sync';
    if (filter === 'synced') return s.status === 'synced';
    return true;
  });

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="Historial de Ventas" />

      <View className="p-4 flex-1">
        {/* Filter buttons */}
        <View className="flex-row gap-2 mb-4">
          <Pressable
            onPress={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl border ${
              filter === 'all'
                ? 'bg-indigo-600 border-indigo-500'
                : 'bg-gray-900 border-gray-800'
            }`}
          >
            <Text className="text-white text-xs font-bold">Todas ({sales.length})</Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('pending_sync')}
            className={`px-4 py-2 rounded-xl border ${
              filter === 'pending_sync'
                ? 'bg-amber-600 border-amber-500'
                : 'bg-gray-900 border-gray-800'
            }`}
          >
            <Text className="text-white text-xs font-bold">
              Pendientes Sync ({sales.filter((s) => s.status === 'pending_sync').length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('synced')}
            className={`px-4 py-2 rounded-xl border ${
              filter === 'synced'
                ? 'bg-emerald-600 border-emerald-500'
                : 'bg-gray-900 border-gray-800'
            }`}
          >
            <Text className="text-white text-xs font-bold">
              Sincronizadas ({sales.filter((s) => s.status === 'synced').length})
            </Text>
          </Pressable>
        </View>

        {/* Sales List */}
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSales} tintColor="#6366f1" />}
          renderItem={({ item }) => (
            <Card className="mb-3 p-4">
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-white font-bold text-base">
                    Ticket #{item.id.substring(0, 8).toUpperCase()}
                  </Text>
                  <Text className="text-gray-400 text-xs">{formatDate(item.created_at)}</Text>
                </View>

                {item.status === 'synced' ? (
                  <Badge label="Sincronizada" variant="success" />
                ) : (
                  <Badge label="Pendiente Sync" variant="warning" />
                )}
              </View>

              <View className="flex-row justify-between items-center border-t border-gray-800 pt-3 mt-1">
                <View>
                  <Text className="text-indigo-400 font-extrabold text-lg">
                    {formatUSD(item.total_usd)}
                  </Text>
                  <Text className="text-emerald-400 text-xs">{formatVES(item.total_ves)}</Text>
                </View>

                <Pressable
                  onPress={() => handlePrint(item)}
                  className="bg-gray-800 active:bg-gray-700 p-2.5 rounded-xl flex-row items-center gap-1.5 border border-gray-700"
                >
                  <Printer size={16} color="#6366f1" />
                  <Text className="text-indigo-400 font-semibold text-xs">Imprimir</Text>
                </Pressable>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-gray-500 text-base">No hay ventas registradas</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
