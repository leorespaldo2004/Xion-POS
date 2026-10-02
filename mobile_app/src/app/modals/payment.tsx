import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Pressable,
  Share
} from 'react-native';
import { router } from 'expo-router';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  RotateCcw,
  CheckCheck,
  FileText
} from 'lucide-react-native';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useCartStore } from '../../stores/cart-store';
import { saleRepository, LocalSalePayment } from '../../database/repositories/saleRepository';
import { clientRepository, LocalClient } from '../../database/repositories/clientRepository';
import { paymentMethodRepository, LocalPaymentMethod } from '../../database/repositories/paymentMethodRepository';
import { generateUUID } from '../../utils/uuid';
import { formatUSD, formatVES, convertUsdToVes, convertVesToUsd } from '../../utils/formatters';

export default function PaymentModal() {
  const {
    items,
    client,
    exchangeRate,
    getSubtotalUsd,
    getDiscountUsd,
    getTaxUsd,
    getTotalUsd,
    getTotalVes,
    clearCart
  } = useCartStore();

  const [paymentMethods, setPaymentMethods] = useState<LocalPaymentMethod[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMethodCodes, setSelectedMethodCodes] = useState<string[]>([]);

  // Dynamic payment maps (methodCode -> value)
  const [payments, setPayments] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Client info
  const [clientDni, setClientDni] = useState(client?.dni_rif || 'V-00000000-0');
  const [clientName, setClientName] = useState(client?.name || 'Cliente Contado');
  const [processing, setProcessing] = useState(false);

  const totalAmountUsd = getTotalUsd();
  const totalAmountVes = getTotalVes();

  // Load payment methods on mount
  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      const activeMethods = await paymentMethodRepository.getAll(true);
      setPaymentMethods(activeMethods);
      if (activeMethods.length > 0) {
        // Pre-select first 3 active methods
        const defaultCodes = activeMethods.slice(0, 3).map((m) => m.code);
        setSelectedMethodCodes(defaultCodes);
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
    }
  };

  // Helpers
  const getMethod = (code: string): LocalPaymentMethod | undefined =>
    paymentMethods.find((m) => m.code === code);

  const isBsMethod = (code: string): boolean =>
    getMethod(code)?.currency === 'VES';

  const toUSD = (code: string, rawVal: string): number => {
    const val = parseFloat(rawVal) || 0;
    return isBsMethod(code) ? convertVesToUsd(val, exchangeRate) : val;
  };

  const calculateTotalPaidUSD = (): number =>
    Object.entries(payments).reduce(
      (sum, [code, val]) => sum + toUSD(code, val),
      0
    );

  const totalPaidUsd = Number(calculateTotalPaidUSD().toFixed(2));
  const remainingUsd = Number((totalAmountUsd - totalPaidUsd).toFixed(2));
  const remainingVes = convertUsdToVes(Math.abs(remainingUsd), exchangeRate);

  const isComplete = Math.abs(remainingUsd) < 0.01;
  const hasOverpayment = remainingUsd < -0.01;

  const toggleMethodSelection = (code: string) => {
    setSelectedMethodCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handlePaymentChange = (code: string, val: string) => {
    setPayments((prev) => ({ ...prev, [code]: val }));
  };

  const handleReferenceChange = (code: string, val: string) => {
    setReferences((prev) => ({ ...prev, [code]: val }));
  };

  const handleNoteChange = (code: string, val: string) => {
    setNotes((prev) => ({ ...prev, [code]: val }));
  };

  const clearPayments = () => {
    setPayments({});
    setReferences({});
    setNotes({});
    setFocusedInput(null);
  };

  /**
   * "Completar": rellena el método enfocado con el monto exacto restante.
   */
  const handleCompletePayment = () => {
    if (!focusedInput) return;
    const paidWithoutFocused = Object.entries(payments).reduce(
      (sum, [code, val]) => (code === focusedInput ? sum : sum + toUSD(code, val)),
      0
    );
    const remainingForFocused = totalAmountUsd - paidWithoutFocused;
    if (remainingForFocused <= 0) return;

    const valueToSet = isBsMethod(focusedInput)
      ? convertUsdToVes(remainingForFocused, exchangeRate)
      : remainingForFocused;

    setPayments((prev) => ({ ...prev, [focusedInput]: valueToSet.toFixed(2) }));
  };

  /**
   * "Fiar (Crédito)": registra el saldo restante bajo CREDITO.
   */
  const handleCreditPayment = () => {
    if (remainingUsd <= 0) return;
    setPayments((prev) => ({ ...prev, ['CREDITO']: remainingUsd.toFixed(2) }));
  };

  const isCashMethod = (code: string): boolean => {
    if (code === 'CREDITO') return true;
    const method = getMethod(code);
    if (!method) return false;
    const codeLower = (method.code || '').toLowerCase();
    const nameLower = (method.name || '').toLowerCase();
    return (
      codeLower.includes('efectivo') ||
      codeLower.includes('cash') ||
      nameLower.includes('efectivo') ||
      nameLower.includes('cash')
    );
  };

  const checkMissingReferences = (): string[] => {
    const missing: string[] = [];
    Object.entries(payments).forEach(([code, val]) => {
      const amount = parseFloat(val) || 0;
      if (amount > 0 && !isCashMethod(code)) {
        const ref = (references[code] || '').trim();
        if (!ref) {
          const method = getMethod(code);
          missing.push(method?.name || code);
        }
      }
    });
    return missing;
  };

  const handleProcessPayment = async () => {
    const missingRefs = checkMissingReferences();
    if (missingRefs.length > 0) {
      Alert.alert(
        'Comprobante Requerido',
        `Ingrese el N° de comprobante / referencia para: ${missingRefs.join(', ')}`
      );
      return;
    }

    if (!isComplete && !hasOverpayment) {
      Alert.alert('Pago Incompleto', `Faltan ${formatUSD(remainingUsd)} por pagar.`);
      return;
    }

    setProcessing(true);
    try {
      const saleId = generateUUID();
      const createdAt = new Date().toISOString();

      // Ensure client exists in local DB
      let activeClientId = client?.id;
      if (!activeClientId) {
        activeClientId = generateUUID();
        const idParts = (clientDni || '').split('-');
        const idType = (idParts.length > 1 ? idParts[0] : 'CI') as 'CI' | 'RIF' | 'Pasaporte';
        const idNum = idParts.length > 1 ? idParts.slice(1).join('-') : clientDni;

        const newClient: LocalClient = {
          id: activeClientId,
          dni_rif: clientDni,
          name: clientName,
          email: 'cliente@local.com',
          identification_type: idType,
          identification_number: idNum,
          credit_limit: 100,
          current_debt: 0,
          is_active: true,
          synced: false,
          updated_at: createdAt
        };
        await clientRepository.create(newClient);
      }

      // Build sale_payments list with snapshots
      const salePaymentsList: Omit<LocalSalePayment, 'sale_id'>[] = Object.entries(payments)
        .filter(([, val]) => (parseFloat(val) || 0) > 0)
        .map(([code, val]) => {
          const method = getMethod(code);
          const rawAmount = parseFloat(val) || 0;
          const amountUSD = toUSD(code, val);
          const amountVES = isBsMethod(code) ? rawAmount : convertUsdToVes(amountUSD, exchangeRate);

          const refStr = references[code] || '';
          const noteStr = notes[code] || '';
          const finalRef = [refStr, noteStr].filter(Boolean).join(' | ') || null;

          return {
            id: generateUUID(),
            payment_method: code,
            amount_usd: amountUSD,
            amount_ves: amountVES,
            reference: finalRef
          };
        });

      const saleItems = items.map((i) => ({
        id: generateUUID(),
        product_id: i.product_id,
        product_name: i.product_name,
        barcode: i.barcode,
        quantity: i.quantity,
        unit_price_usd: i.unit_price_usd,
        total_price_usd: i.total_price_usd,
        has_vat: i.has_vat
      }));

      // Register master sale in SQLite local DB + outbox queue
      await saleRepository.createSale(
        {
          id: saleId,
          client_id: activeClientId,
          client_name: clientName,
          client_dni: clientDni,
          subtotal_usd: getSubtotalUsd(),
          tax_usd: getTaxUsd(),
          total_usd: totalAmountUsd,
          total_ves: totalAmountVes,
          exchange_rate: exchangeRate,
          created_at: createdAt,
          user_name: 'Cajero Mobile'
        },
        saleItems,
        salePaymentsList
      );

      clearCart();

      const vueltoUsd = hasOverpayment ? Math.abs(remainingUsd) : 0;
      const vueltoVes = convertUsdToVes(vueltoUsd, exchangeRate);

      const summaryText = `Venta #${saleId.slice(0, 8)}\nCliente: ${clientName} (${clientDni})\nTotal: ${formatUSD(
        totalAmountUsd
      )} (${formatVES(totalAmountVes)})\nVuelto: ${
        vueltoUsd > 0 ? `${formatUSD(vueltoUsd)} (${formatVES(vueltoVes)})` : 'Exacto'
      }`;

      Alert.alert(
        '¡Venta Exitosa!',
        `Transacción registrada correctamente.\n\nVuelto a entregar: ${
          vueltoUsd > 0 ? `${formatUSD(vueltoUsd)} (${formatVES(vueltoVes)})` : 'Monto exacto (0.00)'
        }`,
        [
          {
            text: 'Compartir Comprobante',
            onPress: async () => {
              try {
                await Share.share({ message: summaryText });
              } catch (e) {
                // ignore
              }
              router.replace('/(tabs)/pos');
            }
          },
          {
            text: 'Cerrar',
            onPress: () => router.replace('/(tabs)/pos')
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('Error en Venta', err.message || 'No se pudo registrar la transacción.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-100">
      {/* Modal Header */}
      <View className="flex-row justify-between items-center bg-white border-b border-slate-200 px-4 pt-12 pb-3 shadow-sm">
        <View className="flex-row items-center gap-2">
          {step === 2 && (
            <Pressable onPress={() => setStep(1)} className="p-1.5 rounded-full bg-slate-100 mr-1">
              <ChevronLeft size={20} color="#334155" />
            </Pressable>
          )}
          <Text className="text-slate-900 font-extrabold text-lg">
            {step === 1 ? 'Seleccionar Métodos de Pago' : 'Totalizador de Pagos'}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} className="p-1.5 rounded-full bg-slate-100">
          <X size={20} color="#64748b" />
        </Pressable>
      </View>

      <ScrollView className="p-4 flex-1">
        {/* Totalizer Banner */}
        <Card className="mb-4 bg-indigo-900 border-indigo-900 p-4 rounded-3xl shadow-sm">
          <Text className="text-indigo-200 text-[11px] font-black uppercase tracking-wider">TOTAL A PAGAR</Text>
          <View className="flex-row justify-between items-baseline mt-1">
            <Text className="text-white font-black text-3xl">{formatUSD(totalAmountUsd)}</Text>
            <Text className="text-emerald-400 font-extrabold text-lg">{formatVES(totalAmountVes)}</Text>
          </View>
          <Text className="text-indigo-200 text-xs font-semibold mt-1">Tasa Ref: {exchangeRate} Bs/$</Text>
        </Card>

        {/* Client Info Card */}
        <Card className="mb-4 bg-white border-slate-200 p-4 rounded-3xl shadow-sm">
          <Text className="text-slate-900 font-extrabold text-xs mb-2 uppercase tracking-wide">Datos del Cliente</Text>
          <View className="flex-row gap-3">
            <View className="w-1/3">
              <Input
                label="RIF / C.I."
                value={clientDni}
                onChangeText={setClientDni}
                containerClassName="mb-0"
              />
            </View>
            <View className="flex-1">
              <Input
                label="Nombre / Razón Social"
                value={clientName}
                onChangeText={setClientName}
                containerClassName="mb-0"
              />
            </View>
          </View>
        </Card>

        {/* STEP 1: Select Payment Methods Grid */}
        {step === 1 && (
          <View className="mb-6">
            <Text className="text-slate-900 font-extrabold text-sm mb-3">
              Seleccione las formas de pago a utilizar:
            </Text>

            <View className="flex-row flex-wrap gap-2.5 mb-4">
              {paymentMethods.map((method) => {
                const isSelected = selectedMethodCodes.includes(method.code);
                return (
                  <Pressable
                    key={method.code}
                    onPress={() => toggleMethodSelection(method.code)}
                    className={`w-[48%] p-3.5 rounded-2xl border-2 items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-600 shadow-sm'
                        : 'bg-white border-slate-200 active:bg-slate-50'
                    }`}
                  >
                    <View className={`p-2.5 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-100'}`}>
                      <CreditCard size={20} color={isSelected ? '#ffffff' : '#64748b'} />
                    </View>
                    <Text className={`font-extrabold text-xs text-center ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {method.name}
                    </Text>
                    <View className="px-2 py-0.5 bg-slate-100 rounded-md">
                      <Text className="text-slate-600 text-[10px] font-black uppercase">
                        {method.currency}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Button
              disabled={selectedMethodCodes.length === 0}
              onPress={() => setStep(2)}
              variant="primary"
              size="lg"
            >
              Continuar al Totalizador
            </Button>
          </View>
        )}

        {/* STEP 2: Multi-Payment Breakdown & Amounts */}
        {step === 2 && (
          <View className="mb-6 space-y-3">
            {/* Toolbar Buttons */}
            <View className="flex-row gap-2 mb-2">
              <Pressable
                onPress={clearPayments}
                className="flex-1 py-2.5 px-3 bg-white border border-slate-200 rounded-2xl flex-row items-center justify-center gap-1 active:bg-slate-100"
              >
                <RotateCcw size={14} color="#64748b" />
                <Text className="text-slate-700 font-extrabold text-xs">Limpiar</Text>
              </Pressable>

              <Pressable
                onPress={handleCompletePayment}
                disabled={!focusedInput}
                className={`flex-1 py-2.5 px-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex-row items-center justify-center gap-1 ${
                  !focusedInput ? 'opacity-50' : 'active:bg-indigo-100'
                }`}
              >
                <CheckCheck size={14} color="#4f46e5" />
                <Text className="text-indigo-900 font-extrabold text-xs">Completar</Text>
              </Pressable>

              <Pressable
                onPress={handleCreditPayment}
                disabled={remainingUsd <= 0}
                className={`flex-1 py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-2xl flex-row items-center justify-center gap-1 ${
                  remainingUsd <= 0 ? 'opacity-50' : 'active:bg-amber-100'
                }`}
              >
                <FileText size={14} color="#d97706" />
                <Text className="text-amber-800 font-extrabold text-xs">Fiar (Crédito)</Text>
              </Pressable>
            </View>

            {/* Render Inputs for Selected Methods */}
            {selectedMethodCodes.map((code) => {
              const method = getMethod(code);
              const methodLabel = method?.name || (code === 'CREDITO' ? 'Crédito' : code);
              const currencySymbol = isBsMethod(code) ? 'Bs' : '$';
              const allowDec = method?.allow_decimals ?? true;
              const isCash = isCashMethod(code);

              return (
                <Card
                  key={code}
                  className={`p-3.5 bg-white border-2 rounded-2xl shadow-sm ${
                    focusedInput === code ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200'
                  }`}
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center gap-2">
                      <CreditCard size={16} color="#4f46e5" />
                      <Text className="text-slate-900 font-extrabold text-sm">{methodLabel}</Text>
                    </View>
                    <View className="px-2 py-0.5 bg-slate-100 rounded-md">
                      <Text className="text-slate-700 text-[10px] font-black uppercase">
                        {method?.currency || 'USD'}
                      </Text>
                    </View>
                  </View>

                  {/* Amount Input */}
                  <Input
                    label={`Monto a Pagar (${currencySymbol})`}
                    placeholder={allowDec ? '0.00' : '0'}
                    keyboardType="decimal-pad"
                    value={payments[code] || ''}
                    onFocus={() => setFocusedInput(code)}
                    onChangeText={(text) => {
                      let val = text;
                      if (!allowDec) {
                        val = val.replace(/[.,]/g, '');
                      }
                      handlePaymentChange(code, val);
                    }}
                  />

                  {/* Reference & Note Inputs */}
                  <View className="flex-row gap-2 mt-1">
                    <View className="flex-1">
                      <Input
                        label={isCash ? 'N° Comprobante (Opcional)' : 'N° Comprobante *'}
                        placeholder="Ej: 84920"
                        keyboardType="number-pad"
                        value={references[code] || ''}
                        onChangeText={(text) => handleReferenceChange(code, text)}
                        containerClassName="mb-0"
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Nota / Memo"
                        placeholder="Detalle..."
                        value={notes[code] || ''}
                        onChangeText={(text) => handleNoteChange(code, text)}
                        containerClassName="mb-0"
                      />
                    </View>
                  </View>
                </Card>
              );
            })}

            {/* Status & Balance Banner */}
            <Card className="p-4 bg-white border-slate-200 rounded-3xl shadow-sm my-2">
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-500 text-xs font-semibold">Total Pagado:</Text>
                <Text className="text-slate-900 font-extrabold text-sm">{formatUSD(totalPaidUsd)}</Text>
              </View>

              {/* State Pill */}
              <View
                className={`p-3 rounded-2xl border flex-row items-center gap-2 ${
                  isComplete
                    ? 'bg-emerald-50 border-emerald-200'
                    : hasOverpayment
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {isComplete ? (
                  <>
                    <CheckCircle2 size={18} color="#059669" />
                    <Text className="text-emerald-800 font-extrabold text-xs flex-1">
                      Pago completo. Listo para procesar.
                    </Text>
                  </>
                ) : hasOverpayment ? (
                  <>
                    <AlertCircle size={18} color="#d97706" />
                    <Text className="text-amber-800 font-extrabold text-xs flex-1">
                      Sobrepago de {formatUSD(Math.abs(remainingUsd))}. Dar vuelto: {formatVES(remainingVes)}.
                    </Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} color="#dc2626" />
                    <Text className="text-red-800 font-extrabold text-xs flex-1">
                      Faltan {formatUSD(Math.abs(remainingUsd))} por pagar.
                    </Text>
                  </>
                )}
              </View>
            </Card>

            {/* Process Button */}
            <Button
              loading={processing}
              disabled={!isComplete && !hasOverpayment}
              onPress={handleProcessPayment}
              variant="success"
              size="lg"
              className="mb-8"
            >
              Procesar y Registrar Venta
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
