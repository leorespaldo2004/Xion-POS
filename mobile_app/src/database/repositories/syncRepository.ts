import { getDb } from '../client';
import { generateUUID } from '../../utils/uuid';

export interface SyncQueueItem {
  id: string;
  action: 'CREATE_SALE' | 'UPDATE_STOCK' | 'CREATE_CLIENT' | 'CREATE_PURCHASE';
  payload: string; // JSON string
  retry_count: number;
  status: 'pending' | 'processing' | 'failed';
  last_error?: string | null;
  created_at: string;
}

export const syncRepository = {
  async addToQueue(item: Omit<SyncQueueItem, 'retry_count' | 'status' | 'last_error'>): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `INSERT INTO sync_queue (id, action, payload, retry_count, status, created_at)
       VALUES (?, ?, ?, 0, 'pending', ?)`,
      [item.id, item.action, item.payload, item.created_at]
    );
  },

  async enqueue(action: SyncQueueItem['action'], payload: string): Promise<void> {
    await this.addToQueue({
      id: generateUUID(),
      action,
      payload,
      created_at: new Date().toISOString()
    });
  },

  async getPendingQueue(): Promise<SyncQueueItem[]> {
    const db = getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue WHERE status = 'pending' OR status = 'failed' AND retry_count < 5 ORDER BY created_at ASC`
    );
    return rows;
  },

  async updateQueueStatus(id: string, status: 'pending' | 'processing' | 'failed', error?: string): Promise<void> {
    const db = getDb();
    if (status === 'failed') {
      await db.runAsync(
        `UPDATE sync_queue SET status = ?, retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
        [status, error || null, id]
      );
    } else {
      await db.runAsync(
        `UPDATE sync_queue SET status = ?, last_error = ? WHERE id = ?`,
        [status, error || null, id]
      );
    }
  },

  async removeQueueItem(id: string): Promise<void> {
    const db = getDb();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  },

  async getPendingCount(): Promise<number> {
    const db = getDb();
    const res = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status != 'synced'`
    );
    return res ? res.count : 0;
  }
};
