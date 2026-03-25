import sqlite3
import os
from pathlib import Path

db_path = Path(r"c:\Users\Leo\Desktop\Xion\XionPOS\local_backend\data\xion_offline.db")
if not db_path.exists():
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(product)")
    columns = cursor.fetchall()
    print("Columns in 'product' table:")
    for col in columns:
        print(col[1])
    conn.close()
