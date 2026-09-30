import { getDb } from '../client';

export interface LocalProduct {
  id: string;
  barcode: string | null;
  name: string;
  category_id: string | null;
  price_usd: number;
  cost_usd: number;
  wholesale_price_usd: number;
  package_quantity: number;
  current_stock: number;
  min_stock: number;
  type: string;
  has_vat: boolean;
  updated_at: string;
}

export const productRepository = {
  async getAll(): Promise<LocalProduct[]> {
    const db = getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM products ORDER BY name ASC');
    return rows.map((r) => ({
      ...r,
      has_vat: Boolean(r.has_vat)
    }));
  },

  async search(query: string): Promise<LocalProduct[]> {
    const db = getDb();
    const term = `%${query}%`;
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM products WHERE name LIKE ? OR barcode LIKE ? ORDER BY name ASC LIMIT 50',
      [term, term]
    );
    return rows.map((r) => ({
      ...r,
      has_vat: Boolean(r.has_vat)
    }));
  },

  async getByBarcode(barcode: string): Promise<LocalProduct | null> {
    const db = getDb();
    const r = await db.getFirstAsync<any>(
      'SELECT * FROM products WHERE barcode = ?',
      [barcode]
    );
    if (!r) return null;
    return {
      ...r,
      has_vat: Boolean(r.has_vat)
    };
  },

  async getById(id: string): Promise<LocalProduct | null> {
    const db = getDb();
    const r = await db.getFirstAsync<any>(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    if (!r) return null;
    return {
      ...r,
      has_vat: Boolean(r.has_vat)
    };
  },

  async upsertMany(products: LocalProduct[]): Promise<void> {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      for (const p of products) {
        await db.runAsync(
          `INSERT INTO products (
            id, barcode, name, category_id, price_usd, cost_usd, wholesale_price_usd,
            package_quantity, current_stock, min_stock, type, has_vat, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            barcode = excluded.barcode,
            name = excluded.name,
            category_id = excluded.category_id,
            price_usd = excluded.price_usd,
            cost_usd = excluded.cost_usd,
            wholesale_price_usd = excluded.wholesale_price_usd,
            package_quantity = excluded.package_quantity,
            current_stock = excluded.current_stock,
            min_stock = excluded.min_stock,
            type = excluded.type,
            has_vat = excluded.has_vat,
            updated_at = excluded.updated_at`,
          [
            p.id,
            p.barcode || null,
            p.name,
            p.category_id || null,
            p.price_usd,
            p.cost_usd,
            p.wholesale_price_usd,
            p.package_quantity,
            p.current_stock,
            p.min_stock,
            p.type,
            p.has_vat ? 1 : 0,
            p.updated_at
          ]
        );
      }
    });
  },

  async updateStock(productId: string, deltaQty: number): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
      [deltaQty, productId]
    );
  }
};
