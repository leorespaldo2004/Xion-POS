import sqlite3
from pathlib import Path

db_path = Path(r"c:\Users\Leo\Desktop\Xion\XionPOS\local_backend\data\xion_offline.db")

if not db_path.exists():
    print(f"Error: Database not found at {db_path}")
else:
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if tags already exists (just in case)
        cursor.execute("PRAGMA table_info(product)")
        cols = [col[1] for col in cursor.fetchall()]
        
        if "tags" not in cols:
            print("Adding 'tags' column to 'product' table...")
            cursor.execute("ALTER TABLE product ADD COLUMN tags TEXT")
            # Also create index since it's defined in Field(index=True)
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_product_tags ON product (tags)")
            print("Successfully added 'tags' column and index.")
        else:
            print("'tags' column already exists.")

        # Check systemconfig table
        cursor.execute("PRAGMA table_info(systemconfig)")
        sys_cols = [col[1] for col in cursor.fetchall()]
        if "payment_methods_json" not in sys_cols:
            default_methods = '[{"id":"efectivo-usd","label":"Efectivo USD","icon":"DollarSign","color":"text-green-600","currency":"USD"},{"id":"efectivo-bs","label":"Efectivo Bs","icon":"Banknote","color":"text-blue-600","currency":"VES"},{"id":"debito","label":"Débito","icon":"CreditCard","color":"text-purple-600","currency":"VES"},{"id":"credito","label":"Crédito","icon":"CreditCard","color":"text-orange-600","currency":"VES"},{"id":"transferencia","label":"Transferencia","icon":"Smartphone","color":"text-cyan-600","currency":"VES"},{"id":"pago-movil","label":"Pago Móvil","icon":"QrCode","color":"text-pink-600","currency":"VES"}]'
            print("Adding 'payment_methods_json' column to 'systemconfig' table...")
            cursor.execute(f"ALTER TABLE systemconfig ADD COLUMN payment_methods_json TEXT NOT NULL DEFAULT '{default_methods}'")
            print("Successfully added 'payment_methods_json' column.")
        else:
            print("'payment_methods_json' column already exists.")
            
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error updating database: {e}")
