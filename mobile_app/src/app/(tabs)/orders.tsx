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
    <View className="flex-1 bg-slate-100">
      <Header title="Historial de Ventas" />

      <View className="p-4 flex-1">
        {/* Filter buttons */}
        <View className="flex-row gap-2 mb-4">
          <Pressable
            onPress={() => setFilter('all')}
            className={`px-4 py-2 rounded-full border ${
              filter === 'all'
                ? 'bg-indigo-900 border-indigo-900'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-extrabold ${
                filter === 'all' ? 'text-white' : 'text-slate-700'
              }`}
            >
              Todas ({sales.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('pending_sync')}
            className={`px-4 py-2 rounded-full border ${
              filter === 'pending_sync'
                ? 'bg-amber-500 border-amber-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-extrabold ${
                filter === 'pending_sync' ? 'text-black' : 'text-slate-700'
              }`}
            >
              Pendientes ({sales.filter((s) => s.status === 'pending_sync').length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('synced')}
            className={`px-4 py-2 rounded-full border ${
              filter === 'synced'
                ? 'bg-emerald-600 border-emerald-700'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-extrabold ${
                filter === 'synced' ? 'text-white' : 'text-slate-700'
              }`}
            >
              Sincronizadas ({sales.filter((s) => s.status === 'synced').length})
            </Text>
          </Pressable>
        </View>

        {/* Sales List */}
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSales} tintColor="#4f46e5" />}
          renderItem={({ item }) => (
            <Card className="mb-3 bg-white border-slate-100 p-4 rounded-3xl shadow-sm">
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-slate-900 font-black text-base">
                    Ticket #{item.id.substring(0, 8).toUpperCase()}
                  </Text>
                  <Text className="text-slate-400 text-xs font-semibold">{formatDate(item.created_at)}</Text>
                </View>

                {item.status === 'synced' ? (
                  <Badge label="Sincronizada" variant="success" />
                ) : (
                  <Badge label="Pendiente Sync" variant="warning" />
                )}
              </View>

              <View className="flex-row justify-between items-center border-t border-slate-100 pt-3 mt-1">
                <View>
                  <Text className="text-slate-900 font-black text-xl">
                    {formatUSD(item.total_usd)}
                  </Text>
                  <Text className="text-emerald-600 text-xs font-bold">{formatVES(item.total_ves)}</Text>
                </View>

                <Pressable
                  onPress={() => handlePrint(item)}
                  className="bg-indigo-50 active:bg-indigo-100 px-3.5 py-2 rounded-full flex-row items-center gap-1.5 border border-indigo-200"
                >
                  <Printer size={15} color="#3b82f6" />
                  <Text className="text-indigo-900 font-extrabold text-xs">Imprimir</Text>
                </Pressable>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-slate-400 text-sm font-semibold">No hay ventas registradas</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
