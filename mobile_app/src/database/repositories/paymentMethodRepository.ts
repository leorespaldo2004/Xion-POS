import { getDb } from '../client';

export interface LocalPaymentMethod {
  id: string;
  name: string;
  code: string;
  currency: 'VES' | 'USD' | string;
  allow_decimals: boolean;
  is_system: boolean;
  is_active: boolean;
  requires_reference: boolean;
  image_url?: string | null;
}

function mapRow(r: any): LocalPaymentMethod {
  return {
    id: String(r.id),
    name: r.name,
    code: r.code,
    currency: r.currency || 'USD',
    allow_decimals: r.allow_decimals === undefined || r.allow_decimals === null ? true : Boolean(r.allow_decimals),
    is_system: Boolean(r.is_system),
    is_active: r.is_active === undefined || r.is_active === null ? true : Boolean(r.is_active),
    requires_reference: Boolean(r.requires_reference),
    image_url: r.image_url || null
  };
}

export const paymentMethodRepository = {
  async getAll(activeOnly?: boolean): Promise<LocalPaymentMethod[]> {
    const db = getDb();
    let query = 'SELECT * FROM payment_methods';
    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY is_system DESC, name ASC';
    
    const rows = await db.getAllAsync<any>(query);
    return rows.map(mapRow);
  },

  async search(query: string): Promise<LocalPaymentMethod[]> {
    const db = getDb();
    const term = `%${query}%`;
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM payment_methods WHERE name LIKE ? OR code LIKE ? OR currency LIKE ? ORDER BY name ASC',
      [term, term, term]
    );
    return rows.map(mapRow);
  },

  async getById(id: string): Promise<LocalPaymentMethod | null> {
    const db = getDb();
    const r = await db.getFirstAsync<any>('SELECT * FROM payment_methods WHERE id = ?', [id]);
    if (!r) return null;
    return mapRow(r);
  },

  async getByCode(code: string): Promise<LocalPaymentMethod | null> {
    const db = getDb();
    const r = await db.getFirstAsync<any>('SELECT * FROM payment_methods WHERE code = ?', [code]);
    if (!r) return null;
    return mapRow(r);
  },

  async create(pm: LocalPaymentMethod): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO payment_methods (
        id, name, code, is_active, currency, allow_decimals, is_system, requires_reference, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pm.id,
        pm.name,
        pm.code,
        pm.is_active ? 1 : 0,
        pm.currency || 'USD',
        pm.allow_decimals ? 1 : 0,
        pm.is_system ? 1 : 0,
        pm.requires_reference ? 1 : 0,
        pm.image_url || null
      ]
    );
  },

  async update(id: string, data: Partial<LocalPaymentMethod>): Promise<void> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return;

    const updated = { ...existing, ...data };

    await db.runAsync(
      `UPDATE payment_methods SET
        name = ?,
        currency = ?,
        allow_decimals = ?,
        is_active = ?,
        requires_reference = ?,
        image_url = ?
       WHERE id = ?`,
      [
        updated.name,
        updated.currency,
        updated.allow_decimals ? 1 : 0,
        updated.is_active ? 1 : 0,
        updated.requires_reference ? 1 : 0,
        updated.image_url || null,
        id
      ]
    );
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'UPDATE payment_methods SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    const pm = await this.getById(id);
    if (pm?.is_system) {
      throw new Error('No se pueden eliminar métodos de pago del sistema');
    }
    await db.runAsync('DELETE FROM payment_methods WHERE id = ?', [id]);
  },

  async upsertMany(methods: LocalPaymentMethod[]): Promise<void> {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      for (const pm of methods) {
        await db.runAsync(
          `INSERT INTO payment_methods (
            id, name, code, is_active, currency, allow_decimals, is_system, requires_reference, image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             code = excluded.code,
             is_active = excluded.is_active,
             currency = excluded.currency,
             allow_decimals = excluded.allow_decimals,
             is_system = excluded.is_system,
             requires_reference = excluded.requires_reference,
             image_url = excluded.image_url`,
          [
            pm.id,
            pm.name,
            pm.code,
            pm.is_active ? 1 : 0,
            pm.currency || 'USD',
            pm.allow_decimals ? 1 : 0,
            pm.is_system ? 1 : 0,
            pm.requires_reference ? 1 : 0,
            pm.image_url || null
          ]
        );
      }
    });
  }
};
