import { getDb } from '../client';
import { generateUUID } from '../../utils/uuid';
import { syncRepository } from './syncRepository';

export interface LocalPurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  cost_usd: number;
  total_cost_usd: number;
}

export interface LocalPurchase {
  id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  invoice_number?: string | null;
  subtotal_usd: number;
  tax_usd: number;
  total_usd: number;
  status: string;
  created_at: string;
  items?: LocalPurchaseItem[];
}

export const purchaseRepository = {
  async getAll(): Promise<LocalPurchase[]> {
    const db = getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM purchases ORDER BY created_at DESC'
    );
    return rows;
  },

  async getById(id: string): Promise<LocalPurchase | null> {
    const db = getDb();
    const purchase = await db.getFirstAsync<any>(
      'SELECT * FROM purchases WHERE id = ?',
      [id]
    );
    if (!purchase) return null;

    const items = await db.getAllAsync<any>(
      'SELECT * FROM purchase_items WHERE purchase_id = ?',
      [id]
    );

    return {
      ...purchase,
      items
    };
  },

  async create(
    purchase: Omit<LocalPurchase, 'id' | 'created_at'>,
    items: Omit<LocalPurchaseItem, 'id' | 'purchase_id'>[]
  ): Promise<LocalPurchase> {
    const db = getDb();
    const purchaseId = generateUUID();
    const now = new Date().toISOString();

    const fullPurchase: LocalPurchase = {
      ...purchase,
      id: purchaseId,
      created_at: now
    };

    await db.withTransactionAsync(async () => {
      // 1. Insert master purchase
      await db.runAsync(
        `INSERT INTO purchases (id, supplier_id, supplier_name, invoice_number, subtotal_usd, tax_usd, total_usd, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fullPurchase.id,
          fullPurchase.supplier_id || null,
          fullPurchase.supplier_name || 'Proveedor Contado',
          fullPurchase.invoice_number || null,
          fullPurchase.subtotal_usd,
          fullPurchase.tax_usd,
          fullPurchase.total_usd,
          fullPurchase.status || 'completed',
          fullPurchase.created_at
        ]
      );

      // 2. Insert items & Update Product Stock + Cost
      for (const item of items) {
        const itemId = generateUUID();
        await db.runAsync(
          `INSERT INTO purchase_items (id, purchase_id, product_id, product_name, quantity, cost_usd, total_cost_usd)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            purchaseId,
            item.product_id,
            item.product_name,
            item.quantity,
            item.cost_usd,
            item.total_cost_usd
          ]
        );

        // Update product stock and unit cost in SQLite
        await db.runAsync(
          `UPDATE products 
           SET current_stock = current_stock + ?, 
               cost_usd = ?,
               updated_at = ?
           WHERE id = ?`,
          [item.quantity, item.cost_usd, now, item.product_id]
        );
      }
    });

    // 3. Enqueue Sync
    try {
      await syncRepository.enqueue('CREATE_PURCHASE', JSON.stringify({ purchase: fullPurchase, items }));
    } catch (err) {
      console.error('Failed to enqueue purchase sync:', err);
    }

    return fullPurchase;
  }
};
