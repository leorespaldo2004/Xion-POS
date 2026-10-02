import { getDb } from '../client';

export interface LocalCashSession {
  id: string;
  user_name: string;
  opened_at: string;
  closed_at?: string | null;
  initial_amount_usd: number;
  initial_amount_ves: number;
  closing_amount_usd?: number | null;
  closing_amount_ves?: number | null;
  total_sales_usd: number;
  total_sales_ves: number;
  status: 'open' | 'closed';
}

export const cashRepository = {
  async getActiveSession(): Promise<LocalCashSession | null> {
    const db = getDb();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM cash_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1`
    );
    return row || null;
  },

  async openSession(session: LocalCashSession): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO cash_sessions (
        id, user_name, opened_at, initial_amount_usd, initial_amount_ves,
        total_sales_usd, total_sales_ves, status
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 'open')`,
      [
        session.id,
        session.user_name,
        session.opened_at,
        session.initial_amount_usd,
        session.initial_amount_ves
      ]
    );
  },

  async closeSession(id: string, closingUsd: number, closingVes: number): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `UPDATE cash_sessions
       SET status = 'closed', closed_at = ?, closing_amount_usd = ?, closing_amount_ves = ?
       WHERE id = ?`,
      [new Date().toISOString(), closingUsd, closingVes, id]
    );
  }
};
