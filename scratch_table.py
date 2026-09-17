import sqlite3
c=sqlite3.connect('local_backend/data/xion_offline.db')
print(c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cash_sessions'").fetchall())
