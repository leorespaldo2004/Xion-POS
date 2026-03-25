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
            
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error updating database: {e}")
