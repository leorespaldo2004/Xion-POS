import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  TextInput,
  FlatList,
  RefreshControl
} from 'react-native';
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  DollarSign,
  Package,
  Trash2,
  X,
  Building2,
  FileText
} from 'lucide-react-native';
import { Header } from '../../components/ui/header';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { formatUSD, formatVES } from '../../utils/formatters';
import { purchaseRepository, LocalPurchase } from '../../database/repositories/purchaseRepository';
import { productRepository, LocalProduct } from '../../database/repositories/productRepository';
import { supplierRepository, LocalSupplier } from '../../database/repositories/supplierRepository';
import { configRepository } from '../../database/repositories/configRepository';

interface PurchaseDraftItem {
  product: LocalProduct;
  quantity: number;
  cost_usd: number;
}

export default function PurchasesScreen() {
  const [purchases, setPurchases] = useState<LocalPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<LocalSupplier[]>([]);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(42.75);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<LocalPurchase | null>(null);

  // New Purchase Form
  const [selectedSupplier, setSelectedSupplier] = useState<LocalSupplier | null>(null);
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [draftItems, setDraftItems] = useState<PurchaseDraftItem[]>([]);

  // Item Picker State
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<LocalProduct | null>(null);
  const [itemQty, setItemQty] = useState('1');
  const [itemCost, setItemCost] = useState('0.00');

  const loadData = async () => {
    setRefreshing(true);
    try {
      const rateStr = await configRepository.get('bcv_rate');
      setExchangeRate(parseFloat(rateStr || '42.75') || 42.75);

      const pList = await purchaseRepository.getAll();
      setPurchases(pList);

      const sList = await supplierRepository.getAll();
      setSuppliers(sList);

      const prodList = await productRepository.getAll();
      setProducts(prodList);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSpentUsd = purchases.reduce((sum, p) => sum + p.total_usd, 0);
  const totalSpentVes = totalSpentUsd * exchangeRate;

  const handleSelectProduct = (prod: LocalProduct) => {
    setSelectedProduct(prod);
    setItemCost(prod.cost_usd.toFixed(2));
    setItemQty('1');
  };

  const handleAddDraftItem = () => {
    if (!selectedProduct) {
      Alert.alert('Atención', 'Seleccione un producto para añadir.');
      return;
    }
    const qty = parseFloat(itemQty);
    const cost = parseFloat(itemCost);

    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Atención', 'Ingrese una cantidad válida mayor a 0.');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      Alert.alert('Atención', 'Ingrese un costo unitario válido.');
      return;
    }

    setDraftItems((prev) => [
      ...prev.filter((i) => i.product.id !== selectedProduct.id),
      { product: selectedProduct, quantity: qty, cost_usd: cost }
    ]);

    setSelectedProduct(null);
    setProductSearch('');
    setItemQty('1');
    setItemCost('0.00');
  };

  const handleRemoveDraftItem = (productId: string) => {
    setDraftItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const subtotalUsd = draftItems.reduce((sum, item) => sum + item.quantity * item.cost_usd, 0);
  const taxUsd = 0; // Tax configurable if needed
  const totalUsd = subtotalUsd + taxUsd;

  const handleCreatePurchase = async () => {
    if (draftItems.length === 0) {
      Alert.alert('Atención', 'Debe agregar al menos un producto a la compra.');
      return;
    }

    const supplierName = selectedSupplier
      ? selectedSupplier.name
      : customSupplierName.trim() || 'Proveedor Contado';

    try {
      await purchaseRepository.create(
        {
          supplier_id: selectedSupplier ? selectedSupplier.id : null,
          supplier_name: supplierName,
          invoice_number: invoiceNumber.trim() || null,
          subtotal_usd: subtotalUsd,
          tax_usd: taxUsd,
          total_usd: totalUsd,
          status: 'completed'
        },
        draftItems.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.quantity,
          cost_usd: i.cost_usd,
          total_cost_usd: i.quantity * i.cost_usd
        }))
      );

      Alert.alert('Éxito', 'Compra registrada correctamente. El inventario y los costos han sido actualizados.');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar la compra');
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setCustomSupplierName('');
    setInvoiceNumber('');
    setDraftItems([]);
    setSelectedProduct(null);
    setProductSearch('');
  };

  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.supplier_name || '').toLowerCase().includes(q) ||
      (p.invoice_number || '').toLowerCase().includes(q)
    );
  });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Gestión de Compras" />

      {/* Main Container */}
      <View className="flex-1 px-3.5 pt-3">
        {/* Top Actions & Summary Card */}
        <View className="bg-slate-900 rounded-2xl p-3.5 mb-3 border border-slate-800 shadow-sm flex-row justify-between items-center">
          <View>
            <Text className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
              Total Invertido en Compras
            </Text>
            <Text className="text-white font-black text-2xl tracking-tight mt-0.5">
              {formatUSD(totalSpentUsd)}
            </Text>
            <Text className="text-emerald-400 font-extrabold text-xs">
              {formatVES(totalSpentVes)}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-indigo-600 px-3.5 py-2.5 rounded-xl flex-row items-center gap-1.5 active:opacity-90 shadow-sm"
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white font-bold text-xs">Nueva Compra</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="bg-white rounded-xl px-3 py-2 border border-slate-200/80 mb-3 flex-row items-center gap-2">
          <Search size={16} color="#64748b" />
          <TextInput
            placeholder="Buscar por proveedor o N° factura..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-xs text-slate-800 font-medium py-0"
            placeholderTextColor="#94a3b8"
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={14} color="#94a3b8" />
            </Pressable>
          )}
        </View>

        {/* Purchases List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#6366f1" />}
          showsVerticalScrollIndicator={false}
        >
          {filteredPurchases.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center justify-center border border-slate-200/80 mt-4">
              <ShoppingBag size={40} color="#cbd5e1" />
              <Text className="text-slate-700 font-bold text-sm mt-3">Sin Compras Registradas</Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                Registra compras a proveedores para actualizar el stock e incrementar tus inventarios.
              </Text>
            </View>
          ) : (
            filteredPurchases.map((purchase) => (
              <Pressable
                key={purchase.id}
                onPress={async () => {
                  const details = await purchaseRepository.getById(purchase.id);
                  setSelectedPurchase(details);
                }}
                className="bg-white rounded-xl p-3.5 mb-2.5 border border-slate-200/80 shadow-sm flex-row justify-between items-center active:bg-slate-50"
              >
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-slate-900 font-extrabold text-sm" numberOfLines={1}>
                      {purchase.supplier_name || 'Proveedor Contado'}
                    </Text>
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <Text className="text-emerald-700 text-[10px] font-extrabold">Completada</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3">
                    {purchase.invoice_number && (
                      <Text className="text-slate-500 text-[11px] font-semibold">
                        Factura: <Text className="text-slate-700 font-bold">{purchase.invoice_number}</Text>
                      </Text>
                    )}
                    <Text className="text-slate-400 text-[11px] font-medium">
                      {new Date(purchase.created_at).toLocaleDateString('es-VE')}
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-slate-900 font-black text-base">{formatUSD(purchase.total_usd)}</Text>
                  <Text className="text-slate-400 text-[11px] font-semibold">
                    {formatVES(purchase.total_usd * exchangeRate)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      {/* Modal: Nueva Compra */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl max-h-[90%] p-4 border-t border-slate-100 flex-1">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center pb-3 mb-3 border-b border-slate-100">
              <View className="flex-row items-center gap-2">
                <ShoppingBag size={20} color="#4f46e5" />
                <Text className="text-slate-900 font-black text-lg">Registrar Nueva Compra</Text>
              </View>
              <Pressable onPress={() => setShowModal(false)} className="p-1 rounded-lg active:bg-slate-100">
                <X size={20} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {/* Supplier & Invoice Fields */}
              <View className="mb-3">
                <Text className="text-slate-700 font-extrabold text-xs mb-1.5">Nombre del Proveedor</Text>
                <TextInput
                  placeholder="Ej: Distribuidora Central C.A."
                  value={customSupplierName}
                  onChangeText={setCustomSupplierName}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View className="mb-4">
                <Text className="text-slate-700 font-extrabold text-xs mb-1.5">N° Factura / Control (Opcional)</Text>
                <TextInput
                  placeholder="Ej: FACT-00912"
                  value={invoiceNumber}
                  onChangeText={setInvoiceNumber}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Add Product Section */}
              <View className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 mb-4">
                <Text className="text-slate-800 font-extrabold text-xs mb-2">Agregar Producto a Compra</Text>

                {/* Search Product */}
                <View className="bg-white rounded-xl px-3 py-2 border border-slate-200 mb-2 flex-row items-center gap-2">
                  <Search size={14} color="#64748b" />
                  <TextInput
                    placeholder="Buscar producto por nombre o código..."
                    value={productSearch}
                    onChangeText={setProductSearch}
                    className="flex-1 text-xs text-slate-800 font-medium py-0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                {/* Product Results Dropdown */}
                {productSearch.length > 0 && !selectedProduct && (
                  <View className="bg-white rounded-xl border border-slate-200 mb-2 max-h-36 overflow-hidden">
                    <ScrollView nestedScrollEnabled className="p-1">
                      {filteredProducts.slice(0, 8).map((prod) => (
                        <Pressable
                          key={prod.id}
                          onPress={() => handleSelectProduct(prod)}
                          className="p-2 border-b border-slate-50 flex-row justify-between items-center active:bg-indigo-50"
                        >
                          <Text className="text-slate-800 text-xs font-bold flex-1 pr-2">{prod.name}</Text>
                          <Text className="text-slate-500 text-[11px] font-semibold">
                            Costo: {formatUSD(prod.cost_usd)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Selected Product Fields */}
                {selectedProduct && (
                  <View className="bg-white p-2.5 rounded-xl border border-indigo-200 mb-2">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-indigo-900 font-extrabold text-xs flex-1 pr-2">
                        {selectedProduct.name}
                      </Text>
                      <Pressable onPress={() => setSelectedProduct(null)}>
                        <X size={14} color="#94a3b8" />
                      </Pressable>
                    </View>

                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Text className="text-slate-500 text-[10px] font-bold mb-1">Cantidad</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          value={itemQty}
                          onChangeText={setItemQty}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900"
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="text-slate-500 text-[10px] font-bold mb-1">Costo Unitario ($)</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          value={itemCost}
                          onChangeText={setItemCost}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900"
                        />
                      </View>

                      <View className="justify-end">
                        <Pressable
                          onPress={handleAddDraftItem}
                          className="bg-indigo-600 px-3 py-1.5 rounded-lg active:bg-indigo-700"
                        >
                          <Text className="text-white font-bold text-xs">Añadir</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Items Table */}
              <Text className="text-slate-800 font-extrabold text-xs mb-2">Ítems de la Compra</Text>
              {draftItems.length === 0 ? (
                <View className="bg-slate-50 p-4 rounded-xl items-center mb-4">
                  <Text className="text-slate-400 text-xs font-medium">Ningún producto seleccionado</Text>
                </View>
              ) : (
                <View className="mb-4">
                  {draftItems.map((item) => (
                    <View
                      key={item.product.id}
                      className="bg-white p-2.5 rounded-xl border border-slate-200/80 mb-2 flex-row justify-between items-center"
                    >
                      <View className="flex-1 pr-2">
                        <Text className="text-slate-900 font-extrabold text-xs">{item.product.name}</Text>
                        <Text className="text-slate-500 text-[11px] font-semibold">
                          {item.quantity} x {formatUSD(item.cost_usd)} = <Text className="text-slate-900 font-bold">{formatUSD(item.quantity * item.cost_usd)}</Text>
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemoveDraftItem(item.product.id)}
                        className="p-1.5 rounded-lg bg-rose-50 active:bg-rose-100"
                      >
                        <Trash2 size={14} color="#e11d48" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Totals Summary */}
              <View className="bg-slate-900 rounded-xl p-3 mb-4 flex-row justify-between items-center">
                <Text className="text-white font-extrabold text-xs">Total Compra:</Text>
                <View className="items-end">
                  <Text className="text-white font-black text-lg">{formatUSD(totalUsd)}</Text>
                  <Text className="text-emerald-400 font-bold text-[11px]">
                    {formatVES(totalUsd * exchangeRate)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View className="flex-row gap-2.5 pt-2 border-t border-slate-100">
              <View className="flex-1">
                <Button variant="ghost" onPress={() => setShowModal(false)}>
                  Cancelar
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="primary" onPress={handleCreatePurchase}>
                  Registrar Compra
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Ver Detalles de Compra */}
      <Modal visible={selectedPurchase !== null} animationType="fade" transparent>
        <View className="flex-1 justify-center bg-black/60 p-4">
          <View className="bg-white rounded-2xl p-4 border border-slate-100 max-h-[80%]">
            <View className="flex-row justify-between items-center pb-2 mb-3 border-b border-slate-100">
              <Text className="text-slate-900 font-black text-base">Detalle de Compra</Text>
              <Pressable onPress={() => setSelectedPurchase(null)} className="p-1">
                <X size={18} color="#64748b" />
              </Pressable>
            </View>

            {selectedPurchase && (
              <ScrollView className="flex-1 mb-3">
                <Text className="text-slate-800 font-extrabold text-sm mb-0.5">
                  {selectedPurchase.supplier_name || 'Proveedor Contado'}
                </Text>
                {selectedPurchase.invoice_number && (
                  <Text className="text-slate-500 text-xs font-semibold mb-1">
                    Factura: {selectedPurchase.invoice_number}
                  </Text>
                )}
                <Text className="text-slate-400 text-[11px] font-medium mb-3">
                  Fecha: {new Date(selectedPurchase.created_at).toLocaleString('es-VE')}
                </Text>

                <Text className="text-slate-700 font-extrabold text-xs mb-2">Productos Comprados:</Text>
                {selectedPurchase.items?.map((item) => (
                  <View key={item.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 mb-2 flex-row justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-slate-900 font-bold text-xs">{item.product_name}</Text>
                      <Text className="text-slate-500 text-[11px]">
                        {item.quantity} x {formatUSD(item.cost_usd)}
                      </Text>
                    </View>
                    <Text className="text-slate-900 font-extrabold text-xs">
                      {formatUSD(item.total_cost_usd)}
                    </Text>
                  </View>
                ))}

                <View className="bg-slate-900 p-3 rounded-xl flex-row justify-between items-center mt-2">
                  <Text className="text-white font-extrabold text-xs">Total Invertido:</Text>
                  <Text className="text-emerald-400 font-black text-base">
                    {formatUSD(selectedPurchase.total_usd)}
                  </Text>
                </View>
              </ScrollView>
            )}

            <Button variant="outline" onPress={() => setSelectedPurchase(null)}>
              Cerrar
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
