import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import {
  Search,
  Scan,
  Plus,
  Minus,
  X,
  Trash2,
  Clock,
  ChevronUp,
  ChevronDown,
  Wifi,
  Bell,
  User,
  Package,
  CheckCircle2
} from 'lucide-react-native';
import { useProducts } from '../../hooks/useProducts';
import { LocalProduct } from '../../database/repositories/productRepository';
import { useCartStore } from '../../stores/cart-store';
import { clientRepository, LocalClient } from '../../database/repositories/clientRepository';
import { configRepository } from '../../database/repositories/configRepository';
import { QuickClientModal } from '../../components/pos/quick-client-modal';
import { Input } from '../../components/ui/input';
import { formatUSD, formatVES, convertUsdToVes } from '../../utils/formatters';

interface HeldSale {
  id: string;
  ticketNumber: number;
  items: any[];
  client: LocalClient | null;
  clientInput: string;
  timestamp: string;
  totalUsd: number;
}

const CATEGORIES = [
  { id: 'todo', label: 'Alimentos' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'varios', label: 'Varios' }
];

export default function POSScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('todo');
  const [clientInput, setClientInput] = useState('');
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [ticketNumber, setTicketNumber] = useState(10492);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [bcvRate, setBcvRate] = useState(42.75);

  const { products, isLoading } = useProducts(searchQuery);

  const {
    items,
    client,
    exchangeRate,
    setExchangeRate,
    setClient,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotalUsd,
    getTaxUsd,
    getTotalUsd,
    getTotalVes
  } = useCartStore();

  useEffect(() => {
    async function loadRate() {
      const rateStr = await configRepository.get('bcv_rate');
      if (rateStr) {
        const rate = parseFloat(rateStr);
        setBcvRate(rate);
        setExchangeRate(rate);
      }
    }
    loadRate();
  }, []);

  const handleBarcodeScan = () => {
    router.push('/modals/scanner');
  };

  const handleSearchClient = async () => {
    if (!clientInput.trim()) return;
    try {
      const found = await clientRepository.getByDniRif(clientInput.trim().toUpperCase());
      if (found) {
        setClient(found);
      } else {
        setShowQuickClientModal(true);
      }
    } catch (err) {
      setShowQuickClientModal(true);
    }
  };

  const handleHoldSale = () => {
    if (items.length === 0) {
      Alert.alert('Carrito Vacío', 'No hay productos en el ticket para colocar en espera.');
      return;
    }
    const newHold: HeldSale = {
      id: Math.random().toString(36).substring(7),
      ticketNumber,
      items: [...items],
      client,
      clientInput,
      timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      totalUsd: getTotalUsd()
    };
    setHeldSales([...heldSales, newHold]);
    clearCart();
    setClientInput('');
    setTicketNumber((prev) => prev + 1);
    Alert.alert('Ticket en Espera', `Ticket #${ticketNumber} puesto en espera.`);
  };

  const handleResumeSale = (hold: HeldSale) => {
    if (items.length > 0) {
      Alert.alert(
        'Reemplazar Ticket',
        'Tiene productos en el ticket actual. ¿Desea reemplazarlos?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Reemplazar',
            onPress: () => {
              clearCart();
              hold.items.forEach((i) => addItem(i, i.quantity));
              setClient(hold.client);
              setClientInput(hold.clientInput);
              setHeldSales(heldSales.filter((h) => h.id !== hold.id));
              setShowHeldModal(false);
            }
          }
        ]
      );
    } else {
      hold.items.forEach((i) => addItem(i, i.quantity));
      setClient(hold.client);
      setClientInput(hold.clientInput);
      setHeldSales(heldSales.filter((h) => h.id !== hold.id));
      setShowHeldModal(false);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Carrito Vacío', 'Agregue al menos un producto para proceder al cobro.');
      return;
    }
    setShowCartDrawer(false);
    router.push('/modals/payment');
  };

  const filteredProducts = products.filter((product) => {
    if (activeCategory === 'todo') return true;
    const cat = activeCategory.toLowerCase();
    const name = product.name.toLowerCase();
    const barcode = (product.barcode || '').toLowerCase();
    return name.includes(cat) || barcode.includes(cat);
  });

  const totalItemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const formattedDate = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const formattedTime = new Date().toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <View className="flex-1 bg-slate-100">
      {/* Top Header matching mockup Screen 1 */}
      <View className="pt-12 pb-3 px-4 bg-white flex-row justify-between items-center border-b border-gray-100 shadow-sm">
        <Text className="text-gray-900 font-extrabold text-2xl">Ventas</Text>

        <View className="flex-row items-center gap-2">
          {/* Rate Badge */}
          <View className="bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            <Text className="text-indigo-900 font-bold text-xs">Bs {bcvRate.toFixed(2)}</Text>
          </View>

          {/* Wifi Online Status */}
          <View className="bg-emerald-100 p-1.5 rounded-full">
            <Wifi size={14} color="#059669" />
          </View>

          {/* Notifications */}
          <Pressable className="p-1.5">
            <Bell size={20} color="#475569" />
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 p-3">
        {/* Search Bar & Barcode Camera Scanner */}
        <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 mb-3 shadow-sm">
          <Search size={18} color="#9ca3af" />
          <Input
            placeholder="Buscar producto..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerClassName="mb-0 flex-1 ml-2"
            inputClassName="py-0 border-0 bg-transparent text-gray-900 font-medium text-sm"
          />
          <Pressable onPress={handleBarcodeScan} className="p-1">
            <Scan size={20} color="#3b82f6" />
          </Pressable>
        </View>

        {/* Horizontal Category Scroll Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-3">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full border mr-2 ${
                  active
                    ? 'bg-gray-200 border-gray-300'
                    : 'bg-white border-gray-200 active:bg-gray-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    active ? 'text-gray-900' : 'text-gray-600'
                  }`}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 2-Column Product Grid matching mockup Screen 1 */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => {
            const priceVes = convertUsdToVes(item.price_usd, exchangeRate);
            const isOut = item.current_stock <= 0;
            const inCart = items.find((i) => i.product_id === item.id);
            const cartQty = inCart ? inCart.quantity : 0;

            return (
              <View
                className={`w-[48.5%] mb-3.5 bg-white border border-gray-200 rounded-3xl p-3 shadow-sm relative justify-between ${
                  isOut ? 'opacity-60' : ''
                }`}
              >
                {/* Top-Left Stock Badge */}
                <View className="absolute top-3 left-3 bg-indigo-900 px-2 py-1 rounded-lg z-10">
                  <Text className="text-white text-[11px] font-black">{item.current_stock}</Text>
                </View>

                {/* Floating USD Price Badge */}
                <View className="absolute top-12 right-3 bg-indigo-900 px-2.5 py-1 rounded-full z-10">
                  <Text className="text-white text-[11px] font-black">{formatUSD(item.price_usd)}</Text>
                </View>

                {/* Product Icon / Box Placeholder */}
                <View className="h-24 items-center justify-center my-2">
                  <View className="w-14 h-14 bg-gray-100 rounded-2xl items-center justify-center">
                    <Package size={28} color="#9ca3af" />
                  </View>
                </View>

                {/* Product Info */}
                <View className="mb-2">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">
                    {item.barcode || 'PROD-001'}
                  </Text>
                  <Text className="text-gray-900 font-extrabold text-sm" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="text-gray-400 text-[10px] font-semibold mt-1">VES</Text>
                  <Text className="text-indigo-900 font-black text-sm">{formatVES(priceVes)}</Text>
                </View>

                {/* Quantity Control Buttons [-] and [+] on Card */}
                <View className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-1">
                  <Pressable
                    onPress={() => updateQuantity(item.id, cartQty - 1)}
                    disabled={cartQty === 0}
                    className={`w-9 h-8 items-center justify-center rounded-lg ${
                      cartQty > 0 ? 'bg-white border border-gray-200' : 'opacity-30'
                    }`}
                  >
                    <Minus size={14} color="#1e293b" />
                  </Pressable>

                  <Text className="text-gray-900 font-black text-xs min-w-[20px] text-center">
                    {cartQty}
                  </Text>

                  <Pressable
                    onPress={() => addItem(item, 1)}
                    disabled={isOut}
                    className="w-9 h-8 bg-indigo-50 border border-indigo-200 items-center justify-center rounded-lg active:bg-indigo-100"
                  >
                    <Plus size={14} color="#3b82f6" />
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-gray-500 text-sm">
                {isLoading ? 'Cargando catálogo...' : 'No se encontraron productos'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Floating Bottom Summary Trigger Bar matching mockup Screen 1 */}
      <Pressable
        onPress={() => setShowCartDrawer(true)}
        className="bg-white border-t border-gray-200 px-4 py-3 flex-row items-center justify-between shadow-lg"
      >
        <View className="w-8 h-8 rounded-full bg-indigo-50 items-center justify-center border border-indigo-100">
          <ChevronUp size={18} color="#3b82f6" />
        </View>

        <Text className="text-gray-900 font-extrabold text-sm">
          {totalItemCount} Items | Total: {formatVES(getTotalVes())} | USD {formatUSD(getTotalUsd())}
        </Text>
      </Pressable>

      {/* Full Ticket Bottom Sheet Modal matching mockup Screen 2 */}
      <Modal visible={showCartDrawer} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl border-t border-gray-200 max-h-[92%]">
            {/* Top Sheet Header Banner */}
            <Pressable
              onPress={() => setShowCartDrawer(false)}
              className="bg-indigo-900 p-4 rounded-t-3xl items-center flex-row justify-between"
            >
              <View className="w-10 h-1.5 bg-white/40 rounded-full mx-auto absolute top-2 self-center" />
              <Text className="text-white font-extrabold text-base mt-2">
                {totalItemCount} Items | Total: {formatVES(getTotalVes())} | USD {formatUSD(getTotalUsd())}
              </Text>
              <ChevronDown size={22} color="#ffffff" className="mt-2" />
            </Pressable>

            <ScrollView className="p-4">
              {/* Ticket Header & Espera Actions */}
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <Text className="text-gray-900 font-black text-lg">Ticket #{ticketNumber}</Text>
                  <Text className="text-gray-400 text-xs font-medium">
                    {formattedDate} - {formattedTime}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={handleHoldSale}
                    className="flex-row items-center gap-1 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full"
                  >
                    <Clock size={14} color="#3b82f6" />
                    <Text className="text-indigo-900 font-bold text-xs">ESPERA</Text>
                    {heldSales.length > 0 && (
                      <View className="bg-indigo-900 px-1.5 py-0.5 rounded-full ml-1">
                        <Text className="text-white text-[10px] font-bold">
                          {heldSales.length}
                        </Text>
                      </View>
                    )}
                  </Pressable>

                  {heldSales.length > 0 && (
                    <Pressable
                      onPress={() => setShowHeldModal(true)}
                      className="p-1.5 bg-gray-100 rounded-full"
                    >
                      <Clock size={18} color="#475569" />
                    </Pressable>
                  )}

                  <Pressable onPress={clearCart} className="p-1.5 bg-gray-100 rounded-full">
                    <Trash2 size={18} color="#ef4444" />
                  </Pressable>
                </View>
              </View>

              {/* Client Search Bar */}
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-4">
                <User size={16} color="#9ca3af" />
                <Input
                  placeholder="Cédula/RIF..."
                  value={client ? `${client.dni_rif} - ${client.name}` : clientInput}
                  onChangeText={(val: string) => {
                    if (client) setClient(null);
                    setClientInput(val);
                  }}
                  onSubmitEditing={handleSearchClient}
                  containerClassName="mb-0 flex-1 ml-2"
                  inputClassName="py-0 border-0 bg-transparent text-gray-900 font-semibold text-xs"
                />
                {client && (
                  <Pressable onPress={() => setClient(null)}>
                    <X size={16} color="#ef4444" />
                  </Pressable>
                )}
              </View>

              {/* Cart Items List */}
              <View className="mb-4">
                {items.length === 0 ? (
                  <View className="py-8 items-center justify-center">
                    <Text className="text-gray-400 text-sm">No hay productos en el ticket</Text>
                  </View>
                ) : (
                  items.map((item) => (
                    <View
                      key={item.product_id}
                      className="flex-row justify-between items-center py-2.5 border-b border-gray-100"
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <View className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center">
                          <Package size={20} color="#64748b" />
                        </View>
                        <View className="flex-1 pr-2">
                          <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>
                            {item.product_name}
                          </Text>
                          <Text className="text-gray-400 text-xs font-semibold">
                            {item.barcode || 'PROD-001'}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-3">
                        <Text className="text-gray-900 font-black text-sm">
                          {formatUSD(item.total_price_usd)}
                        </Text>
                        <Pressable
                          onPress={() => removeItem(item.product_id)}
                          className="p-1 rounded-full bg-gray-100"
                        >
                          <X size={16} color="#64748b" />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Subtotal, Tax, Totals Breakdown */}
              <View className="border-t border-gray-200 pt-3 mb-4">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-500 text-xs font-semibold">SUBTOTAL</Text>
                  <Text className="text-gray-900 text-xs font-black">{formatUSD(getSubtotalUsd())}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-xs font-semibold">IVA (16%)</Text>
                  <Text className="text-gray-900 text-xs font-black">{formatUSD(getTaxUsd())}</Text>
                </View>

                <View className="flex-row justify-between items-end pt-1">
                  <View>
                    <Text className="text-gray-900 font-black text-xs uppercase">TOTAL USD</Text>
                    <Text className="text-gray-900 font-black text-2xl">{formatUSD(getTotalUsd())}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-400 text-[10px] font-bold uppercase">MONEDA LOCAL</Text>
                    <Text className="text-indigo-900 font-black text-base">
                      {formatVES(getTotalVes())}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons Stack matching mockup Screen 2 */}
              <View className="gap-2.5 mb-6">
                <Pressable
                  onPress={() => setShowCartDrawer(false)}
                  className="py-3 rounded-full border border-indigo-200 items-center active:bg-indigo-50"
                >
                  <Text className="text-indigo-900 font-extrabold text-sm">Cerrar Ticket</Text>
                </Pressable>

                <Pressable
                  onPress={handleCheckout}
                  disabled={items.length === 0}
                  className={`py-3.5 rounded-full bg-indigo-900 items-center shadow-md ${
                    items.length === 0 ? 'opacity-50' : 'active:bg-indigo-950'
                  }`}
                >
                  <Text className="text-white font-black text-base tracking-wider">COBRAR</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    clearCart();
                    setShowCartDrawer(false);
                  }}
                  className="py-3 rounded-full border border-red-200 items-center active:bg-red-50"
                >
                  <Text className="text-red-600 font-extrabold text-sm">CANCELAR (F4)</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Held Sales Modal */}
      <Modal visible={showHeldModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-5 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <Text className="text-gray-900 font-black text-lg">Tickets en Espera</Text>
              <Pressable onPress={() => setShowHeldModal(false)}>
                <X size={20} color="#475569" />
              </Pressable>
            </View>

            <ScrollView className="mb-4">
              {heldSales.map((h) => (
                <View
                  key={h.id}
                  className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-3 flex-row justify-between items-center"
                >
                  <View>
                    <Text className="text-gray-900 font-extrabold text-base">
                      Ticket #{h.ticketNumber}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {h.timestamp} - {h.items.length} productos
                    </Text>
                    <Text className="text-indigo-900 font-black text-sm mt-1">
                      {formatUSD(h.totalUsd)}
                    </Text>
                  </View>

                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleResumeSale(h)}
                      className="bg-indigo-900 px-4 py-2 rounded-xl"
                    >
                      <Text className="text-white font-bold text-xs">Retomar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quick Client Registration Modal */}
      <QuickClientModal
        visible={showQuickClientModal}
        initialDni={clientInput}
        onClose={() => setShowQuickClientModal(false)}
        onClientCreated={(newClient) => {
          setClient(newClient);
          setClientInput(`${newClient.dni_rif} - ${newClient.name}`);
        }}
      />
    </View>
  );
}
