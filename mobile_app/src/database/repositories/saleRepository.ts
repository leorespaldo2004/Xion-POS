import { getDb } from '../client';
import { syncRepository } from './syncRepository';
import { productRepository } from './productRepository';

export interface LocalSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  barcode: string | null;
  quantity: number;
  unit_price_usd: number;
  total_price_usd: number;
  has_vat: boolean;
}

export interface LocalSalePayment {
  id: string;
  sale_id: string;
  payment_method: 'cash_usd' | 'cash_ves' | 'pago_movil' | 'pos_card' | 'zelle';
  amount_usd: number;
  amount_ves: number;
  reference?: string | null;
}

export interface LocalSale {
  id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_dni?: string | null;
  subtotal_usd: number;
  tax_usd: number;
  total_usd: number;
  total_ves: number;
  exchange_rate: number;
  status: 'pending_sync' | 'synced' | 'cancelled';
  remote_id?: string | null;
  user_name?: string | null;
  created_at: string;
  items?: LocalSaleItem[];
  payments?: LocalSalePayment[];
}

export const saleRepository = {
  async createSale(
    sale: Omit<LocalSale, 'status' | 'remote_id'>,
    items: Omit<LocalSaleItem, 'sale_id'>[],
    payments: Omit<LocalSalePayment, 'sale_id'>[]
  ): Promise<LocalSale> {
    const db = getDb();
    const fullSale: LocalSale = {
      ...sale,
      status: 'pending_sync',
      remote_id: null
    };

    await db.withTransactionAsync(async () => {
      // 1. Insert master sale record
      await db.runAsync(
        `INSERT INTO sales (
          id, client_id, client_name, client_dni, subtotal_usd, tax_usd,
          total_usd, total_ves, exchange_rate, status, remote_id, user_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_sync', NULL, ?, ?)`,
        [
          fullSale.id,
          fullSale.client_id || null,
          fullSale.client_name || null,
          fullSale.client_dni || null,
          fullSale.subtotal_usd,
          fullSale.tax_usd,
          fullSale.total_usd,
          fullSale.total_ves,
          fullSale.exchange_rate,
          fullSale.user_name || 'Cajero Mobile',
          fullSale.created_at
        ]
      );

      // 2. Insert items and update stock
      for (const item of items) {
        await db.runAsync(
          `INSERT INTO sale_items (
            id, sale_id, product_id, product_name, barcode, quantity,
            unit_price_usd, total_price_usd, has_vat
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            fullSale.id,
            item.product_id,
            item.product_name,
            item.barcode || null,
            item.quantity,
            item.unit_price_usd,
            item.total_price_usd,
            item.has_vat ? 1 : 0
          ]
        );

        // Decrement local inventory stock
        await productRepository.updateStock(item.product_id, -item.quantity);
      }

      // 3. Insert payments
      for (const pay of payments) {
        await db.runAsync(
          `INSERT INTO sale_payments (
            id, sale_id, payment_method, amount_usd, amount_ves, reference
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            pay.id,
            fullSale.id,
            pay.payment_method,
            pay.amount_usd,
            pay.amount_ves,
            pay.reference || null
          ]
        );
      }

      // 4. Add to sync queue for outbox processing
      await syncRepository.addToQueue({
        id: `sync_${fullSale.id}`,
        action: 'CREATE_SALE',
        payload: JSON.stringify({ sale: fullSale, items, payments }),
        created_at: fullSale.created_at
      });
    });

    return fullSale;
  },

  async getAll(limit = 100): Promise<LocalSale[]> {
    const db = getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM sales ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows;
  },

  async getPendingSync(): Promise<LocalSale[]> {
    const db = getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sales WHERE status = 'pending_sync' ORDER BY created_at ASC`
    );
    return rows;
  },

  async markSynced(localId: string, remoteId: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `UPDATE sales SET status = 'synced', remote_id = ? WHERE id = ?`,
      [remoteId, localId]
    );
  },

  async getById(id: string): Promise<LocalSale | null> {
    const db = getDb();
    const saleRow = await db.getFirstAsync<any>('SELECT * FROM sales WHERE id = ?', [id]);
    if (!saleRow) return null;

    const itemRows = await db.getAllAsync<any>(
      'SELECT * FROM sale_items WHERE sale_id = ?',
      [id]
    );
    const paymentRows = await db.getAllAsync<any>(
      'SELECT * FROM sale_payments WHERE sale_id = ?',
      [id]
    );

    return {
      ...saleRow,
      items: itemRows.map((i) => ({ ...i, has_vat: Boolean(i.has_vat) })),
      payments: paymentRows
    };
  }
};
