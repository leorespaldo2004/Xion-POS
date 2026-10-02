import { getDb } from '../client';

export interface LocalClient {
  id: string;
  dni_rif: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  identification_type: 'CI' | 'RIF' | 'Pasaporte';
  identification_number: string;
  credit_limit: number;
  current_debt: number;
  is_active: boolean;
  synced: boolean;
  updated_at: string;
}

function mapRow(r: any): LocalClient {
  const dniRif = r.dni_rif || (r.identification_type ? `${r.identification_type}-${r.identification_number}` : '');
  const idParts = dniRif.split('-');
  const type = r.identification_type || (idParts.length > 1 ? idParts[0] : 'CI');
  const num = r.identification_number || (idParts.length > 1 ? idParts.slice(1).join('-') : dniRif);

  return {
    id: r.id,
    dni_rif: dniRif,
    name: r.name,
    email: r.email || '',
    phone: r.phone || null,
    address: r.address || null,
    identification_type: (type as any) || 'CI',
    identification_number: num || '',
    credit_limit: Number(r.credit_limit ?? 100),
    current_debt: Number(r.current_debt ?? 0),
    is_active: r.is_active === undefined || r.is_active === null ? true : Boolean(r.is_active),
    synced: Boolean(r.synced),
    updated_at: r.updated_at || new Date().toISOString()
  };
}

export const clientRepository = {
  async getAll(): Promise<LocalClient[]> {
    const db = getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM clients ORDER BY name ASC');
    return rows.map(mapRow);
  },

  async search(query: string): Promise<LocalClient[]> {
    const db = getDb();
    const term = `%${query}%`;
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM clients WHERE name LIKE ? OR email LIKE ? OR dni_rif LIKE ? OR identification_number LIKE ? ORDER BY name ASC LIMIT 50',
      [term, term, term, term]
    );
    return rows.map(mapRow);
  },

  async getById(id: string): Promise<LocalClient | null> {
    const db = getDb();
    const r = await db.getFirstAsync<any>('SELECT * FROM clients WHERE id = ?', [id]);
    if (!r) return null;
    return mapRow(r);
  },

  async getByDniRif(dniRif: string): Promise<LocalClient | null> {
    const db = getDb();
    const r = await db.getFirstAsync<any>('SELECT * FROM clients WHERE UPPER(dni_rif) = UPPER(?) OR UPPER(identification_number) = UPPER(?)', [dniRif, dniRif]);
    if (!r) return null;
    return mapRow(r);
  },

  async create(client: LocalClient): Promise<void> {
    const db = getDb();
    const dniRif = client.dni_rif || `${client.identification_type}-${client.identification_number}`;
    await db.runAsync(
      `INSERT INTO clients (
        id, dni_rif, name, email, phone, address, identification_type,
        identification_number, credit_limit, current_debt, is_active, synced, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client.id,
        dniRif,
        client.name,
        client.email || null,
        client.phone || null,
        client.address || null,
        client.identification_type || 'CI',
        client.identification_number || '',
        client.credit_limit ?? 100,
        client.current_debt ?? 0,
        client.is_active ? 1 : 0,
        client.synced ? 1 : 0,
        client.updated_at || new Date().toISOString()
      ]
    );
  },

  async update(id: string, data: Partial<LocalClient>): Promise<void> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return;

    const updated = { ...existing, ...data, updated_at: new Date().toISOString(), synced: false };
    const dniRif = updated.dni_rif || `${updated.identification_type}-${updated.identification_number}`;

    await db.runAsync(
      `UPDATE clients SET
        dni_rif = ?,
        name = ?,
        email = ?,
        phone = ?,
        address = ?,
        identification_type = ?,
        identification_number = ?,
        credit_limit = ?,
        current_debt = ?,
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
        updated.credit_limit,
        updated.current_debt,
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
      'UPDATE clients SET is_active = ?, synced = 0, updated_at = ? WHERE id = ?',
      [isActive ? 1 : 0, new Date().toISOString(), id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
  },

  async upsertMany(clients: LocalClient[]): Promise<void> {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      for (const c of clients) {
        const dniRif = c.dni_rif || `${c.identification_type}-${c.identification_number}`;
        await db.runAsync(
          `INSERT INTO clients (
            id, dni_rif, name, email, phone, address, identification_type,
            identification_number, credit_limit, current_debt, is_active, synced, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             dni_rif = excluded.dni_rif,
             name = excluded.name,
             email = excluded.email,
             phone = excluded.phone,
             address = excluded.address,
             identification_type = excluded.identification_type,
             identification_number = excluded.identification_number,
             credit_limit = excluded.credit_limit,
             current_debt = excluded.current_debt,
             is_active = excluded.is_active,
             synced = excluded.synced,
             updated_at = excluded.updated_at`,
          [
            c.id,
            dniRif,
            c.name,
            c.email || null,
            c.phone || null,
            c.address || null,
            c.identification_type || 'CI',
            c.identification_number || '',
            c.credit_limit ?? 100,
            c.current_debt ?? 0,
            c.is_active ? 1 : 0,
            c.synced ? 1 : 0,
            c.updated_at || new Date().toISOString()
          ]
        );
      }
    });
  }
};

