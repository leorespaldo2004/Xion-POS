import * as SQLite from 'expo-sqlite';
import initialData from './initial_data.json';

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
      identification_type TEXT NOT NULL DEFAULT 'CI',
      identification_number TEXT NOT NULL DEFAULT '',
      credit_limit REAL NOT NULL DEFAULT 0.0,
      current_debt REAL NOT NULL DEFAULT 0.0,
      is_active INTEGER NOT NULL DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      dni_rif TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      identification_type TEXT NOT NULL DEFAULT 'RIF',
      identification_number TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Varios',
      payment_terms TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      synced INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_sessions (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      initial_amount_usd REAL NOT NULL DEFAULT 0,
      initial_amount_ves REAL NOT NULL DEFAULT 0,
      closing_amount_usd REAL,
      closing_amount_ves REAL,
      total_sales_usd REAL NOT NULL DEFAULT 0,
      total_sales_ves REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open'
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      supplier_id TEXT,
      supplier_name TEXT,
      invoice_number TEXT,
      subtotal_usd REAL NOT NULL,
      tax_usd REAL NOT NULL,
      total_usd REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      cost_usd REAL NOT NULL,
      total_cost_usd REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS delivery_notes (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      note_number TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      address TEXT,
      status TEXT NOT NULL DEFAULT 'issued',
      created_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      total_refunded_usd REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      currency TEXT NOT NULL DEFAULT 'USD',
      allow_decimals INTEGER NOT NULL DEFAULT 1,
      is_system INTEGER NOT NULL DEFAULT 0,
      requires_reference INTEGER NOT NULL DEFAULT 0,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    INSERT OR IGNORE INTO system_config (key, value) VALUES ('api_url', 'http://192.168.1.100:8000');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('api_url', 'http://192.168.1.100:8000');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('bcv_rate', '42.75');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('parallel_rate', '45.00');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('auto_print', 'false');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('printer_mac', '');
    INSERT OR IGNORE INTO system_config (key, value) VALUES ('printer_name', '');
  `);

  // Safe migrations for existing SQLite databases
  const clientMigrations = [
    "ALTER TABLE clients ADD COLUMN identification_type TEXT NOT NULL DEFAULT 'CI';",
    "ALTER TABLE clients ADD COLUMN identification_number TEXT NOT NULL DEFAULT '';",
    "ALTER TABLE clients ADD COLUMN credit_limit REAL NOT NULL DEFAULT 0.0;",
    "ALTER TABLE clients ADD COLUMN current_debt REAL NOT NULL DEFAULT 0.0;",
    "ALTER TABLE clients ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;"
  ];
  for (const sql of clientMigrations) {
    try { await db.execAsync(sql); } catch (e) { /* Column already exists */ }
  }

  const supplierMigrations = [
    "ALTER TABLE suppliers ADD COLUMN identification_type TEXT NOT NULL DEFAULT 'RIF';",
    "ALTER TABLE suppliers ADD COLUMN identification_number TEXT NOT NULL DEFAULT '';",
    "ALTER TABLE suppliers ADD COLUMN category TEXT NOT NULL DEFAULT 'Varios';",
    "ALTER TABLE suppliers ADD COLUMN payment_terms TEXT;",
    "ALTER TABLE suppliers ADD COLUMN notes TEXT;",
    "ALTER TABLE suppliers ADD COLUMN synced INTEGER NOT NULL DEFAULT 1;"
  ];
  for (const sql of supplierMigrations) {
    try { await db.execAsync(sql); } catch (e) { /* Column already exists */ }
  }

  const pmMigrations = [
    "ALTER TABLE payment_methods ADD COLUMN allow_decimals INTEGER NOT NULL DEFAULT 1;",
    "ALTER TABLE payment_methods ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;",
    "ALTER TABLE payment_methods ADD COLUMN image_url TEXT;"
  ];
  for (const sql of pmMigrations) {
    try { await db.execAsync(sql); } catch (e) { /* Column already exists */ }
  }

  await seedDatabaseIfEmpty(db);
}

export async function seedDatabaseIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const countRes = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM products');
  if (countRes && countRes.count > 0) {
    return; // Already populated
  }
  await forceSeedDatabase(db);
}

export async function forceSeedDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  if (initialData.products && initialData.products.length > 0) {
    await db.withTransactionAsync(async () => {
      // Clear existing records
      await db.execAsync(`
        DELETE FROM products;
        DELETE FROM clients;
        DELETE FROM suppliers;
        DELETE FROM payment_methods;
        DELETE FROM sales;
        DELETE FROM sale_items;
        DELETE FROM sale_payments;
      `);

      // Seed products
      for (const p of initialData.products) {
        await db.runAsync(
          `INSERT OR REPLACE INTO products (
            id, barcode, name, category_id, price_usd, cost_usd, wholesale_price_usd,
            package_quantity, current_stock, min_stock, type, has_vat, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

      // Seed clients
      for (const c of initialData.clients || []) {
        const idParts = (c.dni_rif || '').split('-');
        const idType = idParts.length > 1 ? idParts[0] : 'CI';
        const idNum = idParts.length > 1 ? idParts.slice(1).join('-') : (c.dni_rif || '');

        await db.runAsync(
          `INSERT OR REPLACE INTO clients (
            id, dni_rif, name, email, phone, address, identification_type,
            identification_number, credit_limit, current_debt, is_active, synced, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id,
            c.dni_rif,
            c.name,
            c.email || null,
            c.phone || null,
            c.address || null,
            idType,
            idNum,
            (c as any).credit_limit ?? 100,
            (c as any).current_debt ?? 0,
            (c as any).is_active ?? 1,
            c.synced || 1,
            c.updated_at
          ]
        );
      }

      // Seed suppliers
      for (const s of initialData.suppliers || []) {
        const idParts = (s.dni_rif || '').split('-');
        const idType = idParts.length > 1 ? idParts[0] : 'RIF';
        const idNum = idParts.length > 1 ? idParts.slice(1).join('-') : (s.dni_rif || '');

        await db.runAsync(
          `INSERT OR REPLACE INTO suppliers (
            id, dni_rif, name, email, phone, address, identification_type,
            identification_number, category, payment_terms, notes, is_active, synced, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id,
            s.dni_rif,
            s.name,
            s.email || null,
            s.phone || null,
            s.address || null,
            idType,
            idNum,
            (s as any).category || 'Varios',
            (s as any).payment_terms || null,
            (s as any).notes || null,
            s.is_active || 1,
            (s as any).synced || 1,
            s.updated_at
          ]
        );
      }

      // Seed payment methods
      for (const pm of initialData.payment_methods || []) {
        await db.runAsync(
          `INSERT OR REPLACE INTO payment_methods (
            id, name, code, is_active, currency, allow_decimals, is_system, requires_reference, image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pm.id,
            pm.name,
            pm.code,
            pm.is_active ?? 1,
            pm.currency || 'USD',
            (pm as any).allow_decimals ?? 1,
            (pm as any).is_system ?? 1,
            pm.requires_reference ?? 0,
            (pm as any).image_url || null
          ]
        );
      }

      // Seed sales
      for (const s of initialData.sales || []) {
        await db.runAsync(
          `INSERT OR REPLACE INTO sales (id, client_id, client_name, client_dni, subtotal_usd, tax_usd, total_usd, total_ves, exchange_rate, status, remote_id, user_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id,
            s.client_id || null,
            s.client_name,
            s.client_dni,
            s.subtotal_usd,
            s.tax_usd,
            s.total_usd,
            s.total_ves,
            s.exchange_rate,
            s.status,
            s.remote_id || s.id,
            s.user_name,
            s.created_at
          ]
        );
      }

      // Seed sale items
      for (const item of initialData.sale_items || []) {
        await db.runAsync(
          `INSERT OR REPLACE INTO sale_items (id, sale_id, product_id, product_name, barcode, quantity, unit_price_usd, total_price_usd, has_vat)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.sale_id,
            item.product_id,
            item.product_name,
            item.barcode || null,
            item.quantity,
            item.unit_price_usd,
            item.total_price_usd,
            item.has_vat
          ]
        );
      }

      // Seed sale payments
      for (const pay of initialData.sale_payments || []) {
        await db.runAsync(
          `INSERT OR REPLACE INTO sale_payments (id, sale_id, payment_method, amount_usd, amount_ves, reference)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [pay.id, pay.sale_id, pay.payment_method, pay.amount_usd, pay.amount_ves, pay.reference || null]
        );
      }
    });
  }
}


