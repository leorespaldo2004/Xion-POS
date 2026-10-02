import { getDb } from '../client';

export interface LocalSupplier {
  id: string;
  dni_rif: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  identification_type: 'RIF' | 'CI' | 'Pasaporte';
  identification_number: string;
  category: string;
  payment_terms?: string | null;
  notes?: string | null;
  is_active: boolean;
  synced: boolean;
  updated_at: string;
}

function mapRow(r: any): LocalSupplier {
  const dniRif = r.dni_rif || (r.identification_type ? `${r.identification_type}-${r.identification_number}` : '');
  const idParts = dniRif.split('-');
  const type = r.identification_type || (idParts.length > 1 ? idParts[0] : 'RIF');
  const num = r.identification_number || (idParts.length > 1 ? idParts.slice(1).join('-') : dniRif);

  return {
    id: r.id,
    dni_rif: dniRif,
    name: r.name,
    email: r.email || '',
    phone: r.phone || null,
    address: r.address || null,
    identification_type: (type as any) || 'RIF',
    identification_number: num || '',
    category: r.category || 'Varios',
    payment_terms: r.payment_terms || null,
    notes: r.notes || null,
    is_active: r.is_active === undefined || r.is_active === null ? true : Boolean(r.is_active),
    synced: Boolean(r.synced ?? 1),
    updated_at: r.updated_at || new Date().toISOString()
  };
}

export const supplierRepository = {
  async getAll(): Promise<LocalSupplier[]> {
    const db = getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM suppliers ORDER BY name ASC');
    return rows.map(mapRow);
  },

  async search(query: string): Promise<LocalSupplier[]> {
    const db = getDb();
    const term = `%${query}%`;
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM suppliers WHERE name LIKE ? OR email LIKE ? OR dni_rif LIKE ? OR identification_number LIKE ? OR category LIKE ? ORDER BY name ASC LIMIT 50',
      [term, term, term, term, term]
    );
    return rows.map(mapRow);
  },

  async getById(id: string): Promise<LocalSupplier | null> {
    const db = getDb();
    const r = await db.getFirstAsync<any>('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!r) return null;
    return mapRow(r);
  },

  async create(supplier: LocalSupplier): Promise<void> {
    const db = getDb();
    const dniRif = supplier.dni_rif || `${supplier.identification_type}-${supplier.identification_number}`;
    await db.runAsync(
      `INSERT INTO suppliers (
        id, dni_rif, name, email, phone, address, identification_type,
        identification_number, category, payment_terms, notes, is_active, synced, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplier.id,
        dniRif,
        supplier.name,
        supplier.email || null,
        supplier.phone || null,
        supplier.address || null,
        supplier.identification_type || 'RIF',
        supplier.identification_number || '',
        supplier.category || 'Varios',
        supplier.payment_terms || null,
        supplier.notes || null,
        supplier.is_active ? 1 : 0,
        supplier.synced ? 1 : 0,
        supplier.updated_at || new Date().toISOString()
      ]
    );
  },

  async update(id: string, data: Partial<LocalSupplier>): Promise<void> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return;

    const updated = { ...existing, ...data, updated_at: new Date().toISOString(), synced: false };
    const dniRif = updated.dni_rif || `${updated.identification_type}-${updated.identification_number}`;

    await db.runAsync(
      `UPDATE suppliers SET
        dni_rif = ?,
        name = ?,
        email = ?,
        phone = ?,
        address = ?,
        identification_type = ?,
        identification_number = ?,
        category = ?,
        payment_terms = ?,
        notes = ?,
        is_active = ?,
        synced = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        dniRif,
        updated.name,
        updated.email || null,
        updated.phone || null,
        updated.address || null,
        updated.identification_type,
        updated.identification_number,
        updated.category,
        updated.payment_terms || null,
        updated.notes || null,
        updated.is_active ? 1 : 0,
        updated.synced ? 1 : 0,
        updated.updated_at,
        id
      ]
    );
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'UPDATE suppliers SET is_active = ?, synced = 0, updated_at = ? WHERE id = ?',
      [isActive ? 1 : 0, new Date().toISOString(), id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.runAsync('DELETE FROM suppliers WHERE id = ?', [id]);
  },

  async upsertMany(suppliers: LocalSupplier[]): Promise<void> {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      for (const s of suppliers) {
        const dniRif = s.dni_rif || `${s.identification_type}-${s.identification_number}`;
        await db.runAsync(
          `INSERT INTO suppliers (
            id, dni_rif, name, email, phone, address, identification_type,
            identification_number, category, payment_terms, notes, is_active, synced, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             dni_rif = excluded.dni_rif,
             name = excluded.name,
             email = excluded.email,
             phone = excluded.phone,
             address = excluded.address,
             identification_type = excluded.identification_type,
             identification_number = excluded.identification_number,
             category = excluded.category,
             payment_terms = excluded.payment_terms,
             notes = excluded.notes,
             is_active = excluded.is_active,
             synced = excluded.synced,
             updated_at = excluded.updated_at`,
          [
            s.id,
            dniRif,
            s.name,
            s.email || null,
            s.phone || null,
            s.address || null,
            s.identification_type || 'RIF',
            s.identification_number || '',
            s.category || 'Varios',
            s.payment_terms || null,
            s.notes || null,
            s.is_active ? 1 : 0,
            s.synced ? 1 : 0,
            s.updated_at || new Date().toISOString()
          ]
        );
      }
    });
  }
};

