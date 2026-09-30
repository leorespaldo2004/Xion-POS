import { formatUSD, formatVES, formatDate } from '../utils/formatters';
import { LocalSale, LocalSaleItem, LocalSalePayment } from '../database/repositories/saleRepository';

export interface PrinterDevice {
  name: string;
  macAddress: string;
}

export const printerService = {
  /**
   * Generates formatted text/bytecode receipt for ESC/POS Thermal printers
   */
  generateReceiptText(
    sale: LocalSale,
    items: LocalSaleItem[],
    payments: LocalSalePayment[],
    businessName = 'XION POS'
  ): string {
    const divider = '--------------------------------\n';
    let text = '';

    // Header
    text += `\x1b\x61\x01`; // Center alignment
    text += `\x1b\x21\x30${businessName}\x1b\x21\x00\n`; // Double height & width
    text += `RECIBO DE VENTA\n`;
    text += `Ticket #: ${sale.id.substring(0, 8).toUpperCase()}\n`;
    text += `Fecha: ${formatDate(sale.created_at)}\n`;
    if (sale.client_name) {
      text += `Cliente: ${sale.client_name}\n`;
      if (sale.client_dni) text += `RIF/CI: ${sale.client_dni}\n`;
    }
    text += divider;

    // Items
    text += `\x1b\x61\x00`; // Left alignment
    for (const item of items) {
      const lineTotal = formatUSD(item.total_price_usd);
      text += `${item.product_name}\n`;
      text += `  ${item.quantity} x ${formatUSD(item.unit_price_usd)} = ${lineTotal}\n`;
    }
    text += divider;

    // Totals
    text += `Subtotal: ${formatUSD(sale.subtotal_usd)}\n`;
    if (sale.tax_usd > 0) {
      text += `IVA (16%): ${formatUSD(sale.tax_usd)}\n`;
    }
    text += `\x1b\x21\x10TOTAL USD: ${formatUSD(sale.total_usd)}\x1b\x21\x00\n`;
    text += `TOTAL VES: ${formatVES(sale.total_ves)}\n`;
    text += `Tasa Ref: ${sale.exchange_rate} Bs/$\n`;
    text += divider;

    // Payments
    text += `PAGOS:\n`;
    for (const p of payments) {
      let label = p.payment_method;
      if (p.payment_method === 'cash_usd') label = 'Efectivo USD';
      if (p.payment_method === 'cash_ves') label = 'Efectivo Bs';
      if (p.payment_method === 'pago_movil') label = 'Pago Móvil';
      if (p.payment_method === 'pos_card') label = 'Tarjeta Punto';
      if (p.payment_method === 'zelle') label = 'Zelle';

      text += `  - ${label}: ${formatUSD(p.amount_usd)} (${formatVES(p.amount_ves)})\n`;
      if (p.reference) text += `    Ref: ${p.reference}\n`;
    }
    text += divider;

    // Footer
    text += `\x1b\x61\x01`; // Center alignment
    text += `¡Gracias por su compra!\n\n\n`;
    text += `\x1d\x56\x41\x03`; // Cut paper command

    return text;
  },

  async connectAndPrint(
    printerMac: string,
    receiptText: string
  ): Promise<{ success: boolean; message: string }> {
    if (!printerMac) {
      return { success: false, message: 'No hay impresora Bluetooth seleccionada' };
    }

    try {
      // Bluetooth ESC/POS hardware print simulation for Dev Builds
      console.log(`[ESC/POS Printer ${printerMac}] Sending payload length: ${receiptText.length}`);
      return { success: true, message: 'Ticket impreso correctamente' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al conectar con la impresora' };
    }
  }
};
