import { getDb } from '../client';

export interface LocalClient {
  id: string;
  dni_rif: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  synced: boolean;
  updated_at: string;
}

export const clientRepository = {
  async getAll(): Promise<LocalClient[]> {
    const db = getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM clients ORDER BY name ASC');
    return rows.map((r) => ({ ...r, synced: Boolean(r.synced) }));
  },

  async search(query: string): Promise<LocalClient[]> {
    const db = getDb();
    const term = `%${query}%`;
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM clients WHERE name LIKE ? OR dni_rif LIKE ? ORDER BY name ASC LIMIT 30',
      [term, term]
    );
    return rows.map((r) => ({ ...r, synced: Boolean(r.synced) }));
  },

  async getById(id: string): Promise<LocalClient | null> {
    const db = getDb();
    const r = await db.getFirstAsync<any>('SELECT * FROM clients WHERE id = ?', [id]);
    if (!r) return null;
    return { ...r, synced: Boolean(r.synced) };
  },

  async create(client: LocalClient): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO clients (id, dni_rif, name, email, phone, address, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client.id,
        client.dni_rif,
        client.name,
        client.email || null,
        client.phone || null,
        client.address || null,
        client.synced ? 1 : 0,
        client.updated_at
      ]
    );
  },

  async upsertMany(clients: LocalClient[]): Promise<void> {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      for (const c of clients) {
        await db.runAsync(
          `INSERT INTO clients (id, dni_rif, name, email, phone, address, synced, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             dni_rif = excluded.dni_rif,
             name = excluded.name,
             email = excluded.email,
             phone = excluded.phone,
             address = excluded.address,
             synced = excluded.synced,
             updated_at = excluded.updated_at`,
          [
            c.id,
            c.dni_rif,
            c.name,
            c.email || null,
            c.phone || null,
            c.address || null,
            c.synced ? 1 : 0,
            c.updated_at
          ]
        );
      }
    });
  }
};
