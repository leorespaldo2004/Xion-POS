import * as SQLite from 'expo-sqlite';
import { initDatabaseSchema } from './schema';

const DB_NAME = 'xion_pos.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
};

export const initDb = async (): Promise<SQLite.SQLiteDatabase> => {
  const db = getDb();
  await initDatabaseSchema(db);
  return db;
};
