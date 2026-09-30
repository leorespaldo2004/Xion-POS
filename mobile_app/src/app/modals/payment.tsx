import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { DollarSign, CreditCard, Smartphone, Check, X, Printer } from 'lucide-react-native';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useCartStore } from '../../stores/cart-store';
import { saleRepository, LocalSalePayment } from '../../database/repositories/saleRepository';
import { clientRepository, LocalClient } from '../../database/repositories/clientRepository';
import { usePrinter } from '../../hooks/usePrinter';
import { generateUUID } from '../../utils/uuid';
import { formatUSD, formatVES, convertUsdToVes, convertVesToUsd } from '../../utils/formatters';

export default function PaymentModal() {
  const {
    items,
    client,
    exchangeRate,
    getSubtotalUsd,
    getTaxUsd,
    getTotalUsd,
    getTotalVes,
    clearCart
  } = useCartStore();

  const { autoPrint, printSale } = usePrinter();

  // Payment inputs
  const [cashUsd, setCashUsd] = useState('');
  const [cashVes, setCashVes] = useState('');
  const [pagoMovilVes, setPagoMovilVes] = useState('');
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [posCardUsd, setPosCardUsd] = useState('');
  const [posCardRef, setPosCardRef] = useState('');

  // Quick Client registration inputs if none selected
  const [clientDni, setClientDni] = useState(client?.dni_rif || 'V-00000000-0');
  const [clientName, setClientName] = useState(client?.name || 'Cliente Contado');

  const [processing, setProcessing] = useState(false);

  const totalUsdNeeded = getTotalUsd();
  const totalVesNeeded = getTotalVes();

  // Calculations
  const numCashUsd = parseFloat(cashUsd) || 0;
  const numCashVes = parseFloat(cashVes) || 0;
  const numPagoMovilVes = parseFloat(pagoMovilVes) || 0;
  const numPosCardUsd = parseFloat(posCardUsd) || 0;

  const numCashVesInUsd = convertVesToUsd(numCashVes, exchangeRate);
  const numPagoMovilVesInUsd = convertVesToUsd(numPagoMovilVes, exchangeRate);

  const totalPaidUsd = Number(
    (numCashUsd + numCashVesInUsd + numPagoMovilVesInUsd + numPosCardUsd).toFixed(2)
  );

  const differenceUsd = Number((totalPaidUsd - totalUsdNeeded).toFixed(2));
  const differenceVes = convertUsdToVes(Math.abs(differenceUsd), exchangeRate);

  const isComplete = totalPaidUsd >= totalUsdNeeded - 0.01;

  const handleProcessPayment = async () => {
    if (!isComplete) {
      Alert.alert(
        'Pago Incompleto',
        `Monto faltante: ${formatUSD(Math.abs(differenceUsd))} (${formatVES(differenceVes)})`
      );
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
        const newClient: LocalClient = {
          id: activeClientId,
          dni_rif: clientDni,
          name: clientName,
          synced: false,
          updated_at: createdAt
        };
        await clientRepository.create(newClient);
      }

      // Build payments array
      const payments: Omit<LocalSalePayment, 'sale_id'>[] = [];

      if (numCashUsd > 0) {
        payments.push({
          id: generateUUID(),
          payment_method: 'cash_usd',
          amount_usd: numCashUsd,
          amount_ves: convertUsdToVes(numCashUsd, exchangeRate)
        });
      }

      if (numCashVes > 0) {
        payments.push({
          id: generateUUID(),
          payment_method: 'cash_ves',
          amount_usd: numCashVesInUsd,
          amount_ves: numCashVes
        });
      }

      if (numPagoMovilVes > 0) {
        payments.push({
          id: generateUUID(),
          payment_method: 'pago_movil',
          amount_usd: numPagoMovilVesInUsd,
          amount_ves: numPagoMovilVes,
          reference: pagoMovilRef || null
        });
      }

      if (numPosCardUsd > 0) {
        payments.push({
          id: generateUUID(),
          payment_method: 'pos_card',
          amount_usd: numPosCardUsd,
          amount_ves: convertUsdToVes(numPosCardUsd, exchangeRate),
          reference: posCardRef || null
        });
      }

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

      // Register master sale in SQLite + Outbox Queue
      const createdSale = await saleRepository.createSale(
        {
          id: saleId,
          client_id: activeClientId,
          client_name: clientName,
          client_dni: clientDni,
          subtotal_usd: getSubtotalUsd(),
          tax_usd: getTaxUsd(),
          total_usd: totalUsdNeeded,
          total_ves: totalVesNeeded,
          exchange_rate: exchangeRate,
          created_at: createdAt,
          user_name: 'Cajero Mobile'
        },
        saleItems,
        payments
      );

      // Auto print thermal ticket if configured
      if (autoPrint) {
        const fullSale = await saleRepository.getById(createdSale.id);
        if (fullSale && fullSale.items && fullSale.payments) {
          await printSale(fullSale, fullSale.items, fullSale.payments);
        }
      }

      clearCart();

      Alert.alert(
        '¡Venta Exitosa!',
        `Registrada en SQLite local.\nCambio a entregar: ${
          differenceUsd > 0
            ? `${formatUSD(differenceUsd)} (${formatVES(differenceVes)})`
            : 'Exacto'
        }`,
        [
          {
            text: 'Aceptar',
            onPress: () => router.replace('/(tabs)/pos')
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('Error procesando venta', err.message || 'Intente nuevamente.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      {/* Modal Header */}
      <View className="flex-row justify-between items-center bg-gray-900 border-b border-gray-800 p-4">
        <Text className="text-white font-bold text-lg">Cobro y Registro de Pago</Text>
        <Pressable onPress={() => router.back()} className="p-1">
          <X size={24} color="#9ca3af" />
        </Pressable>
      </View>

      <ScrollView className="p-4 flex-1">
        {/* Total to pay banner */}
        <Card className="mb-4 bg-indigo-950/60 border-indigo-800 p-4">
          <Text className="text-indigo-300 text-xs font-semibold">TOTAL A COBRAR</Text>
          <View className="flex-row justify-between items-baseline mt-1">
            <Text className="text-white font-extrabold text-3xl">{formatUSD(totalUsdNeeded)}</Text>
            <Text className="text-emerald-400 font-bold text-xl">{formatVES(totalVesNeeded)}</Text>
          </View>
          <Text className="text-gray-400 text-xs mt-1">Tasa Aplicada: {exchangeRate} Bs/$</Text>
        </Card>

        {/* Client Info */}
        <Card className="mb-4">
          <Text className="text-white font-bold text-sm mb-3">Datos del Cliente</Text>
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
                label="Nombre o Razón Social"
                value={clientName}
                onChangeText={setClientName}
                containerClassName="mb-0"
              />
            </View>
          </View>
        </Card>

        {/* Multi-payment methods */}
        <Card className="mb-4">
          <Text className="text-white font-bold text-sm mb-3">Métodos de Pago Combinados</Text>

          {/* 1. Cash USD */}
          <Input
            label="Efectivo en Dólares ($ USD)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={cashUsd}
            onChangeText={setCashUsd}
          />

          {/* 2. Cash VES */}
          <Input
            label="Efectivo en Bolívares (Bs. VES)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={cashVes}
            onChangeText={setCashVes}
          />

          {/* 3. Pago Movil */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Pago Móvil (Bs. VES)"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={pagoMovilVes}
                onChangeText={setPagoMovilVes}
              />
            </View>
            <View className="flex-1">
              <Input
                label="Nro de Referencia"
                placeholder="Ej: 8492"
                keyboardType="number-pad"
                value={pagoMovilRef}
                onChangeText={setPagoMovilRef}
              />
            </View>
          </View>

          {/* 4. POS Card */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Punto / Tarjeta ($ USD)"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={posCardUsd}
                onChangeText={setPosCardUsd}
              />
            </View>
            <View className="flex-1">
              <Input
                label="Referencia Punto"
                placeholder="Ej: 1042"
                keyboardType="number-pad"
                value={posCardRef}
                onChangeText={setPosCardRef}
              />
            </View>
          </View>
        </Card>

        {/* Balance & Change Status */}
        <Card className="mb-6 p-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-400 text-sm">Total Registrado:</Text>
            <Text className="text-white font-bold text-sm">{formatUSD(totalPaidUsd)}</Text>
          </View>

          <View className="flex-row justify-between items-center border-t border-gray-800 pt-2">
            <Text className="text-white font-bold text-base">
              {differenceUsd >= 0 ? 'Cambio / Vuelto:' : 'Faltante:'}
            </Text>
            <View className="items-end">
              <Text
                className={`font-extrabold text-lg ${
                  differenceUsd >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatUSD(Math.abs(differenceUsd))}
              </Text>
              <Text className="text-gray-400 text-xs">{formatVES(differenceVes)}</Text>
            </View>
          </View>
        </Card>

        {/* Action Button */}
        <Button
          loading={processing}
          disabled={!isComplete}
          onPress={handleProcessPayment}
          variant="success"
          size="lg"
          className="mb-8"
        >
          Confirmar y Registrar Venta
        </Button>
      </ScrollView>
    </View>
  );
}
