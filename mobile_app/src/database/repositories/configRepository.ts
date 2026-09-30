import { getDb } from '../client';

export interface SystemConfig {
  api_url: string;
  bcv_rate: number;
  parallel_rate: number;
  auto_print: boolean;
  printer_mac: string;
  printer_name: string;
}

export const configRepository = {
  async get(key: string): Promise<string | null> {
    const db = getDb();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM system_config WHERE key = ?',
      [key]
    );
    return result ? result.value : null;
  },

  async set(key: string, value: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
  },

  async getAllConfig(): Promise<SystemConfig> {
    const db = getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM system_config'
    );
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return {
      api_url: map['api_url'] || 'http://192.168.1.100:8000',
      bcv_rate: parseFloat(map['bcv_rate'] || '36.50'),
      parallel_rate: parseFloat(map['parallel_rate'] || '38.00'),
      auto_print: map['auto_print'] === 'true',
      printer_mac: map['printer_mac'] || '',
      printer_name: map['printer_name'] || ''
    };
  }
};
