import * as SQLite from 'expo-sqlite';

export async function initDatabaseSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT,
      name TEXT NOT NULL,
      category_id TEXT,
      price_usd REAL NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      wholesale_price_usd REAL NOT NULL DEFAULT 0,
      package_quantity INTEGER NOT NULL DEFAULT 1,
      current_stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'physical',
      has_vat INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      dni_rif TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      synced INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      client_name TEXT,
      client_dni TEXT,
      subtotal_usd REAL NOT NULL,
      tax_usd REAL NOT NULL,
      total_usd REAL NOT NULL,
      total_ves REAL NOT NULL,
      exchange_rate REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_sync',
      remote_id TEXT,
      user_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      barcode TEXT,
      quantity REAL NOT NULL,
      unit_price_usd REAL NOT NULL,
      total_price_usd REAL NOT NULL,
      has_vat INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sale_payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      amount_ves REAL NOT NULL,
      reference TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      last_error TEXT,
      created_at TEXT NOT NULL
    );

    INSERT OR IGNORE INTO system_config (key, value) VALUES ('api_url', 'http://192.168.1.100:8000');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('bcv_rate', '36.50');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('parallel_rate', '38.00');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('auto_print', 'false');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('printer_mac', '');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('printer_name', '');
  `);
}
