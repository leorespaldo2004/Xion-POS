import * as SQLite from 'expo-sqlite';
import { initDatabaseSchema } from './schema';

const DB_NAME = 'xion_pos.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const openDbAsync = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
};

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    // If not initialized yet asynchronously, fallback to openDatabaseSync
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
};

export const initDb = async (): Promise<SQLite.SQLiteDatabase> => {
  const db = await openDbAsync();
  await initDatabaseSchema(db);
  return db;
};
