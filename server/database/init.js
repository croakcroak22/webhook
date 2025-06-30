import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

export const initDatabase = async () => {
  try {
    const dbPath = process.env.DATABASE_PATH || join(__dirname, '../webhooks.db');
    console.log('📁 Ruta de la base de datos:', dbPath);
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('🔗 Conexión a SQLite establecida');

    // Crear tabla de webhooks
    await db.exec(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        message TEXT,
        leads TEXT,
        tags TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed_at DATETIME,
        deleted_at DATETIME,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3
      )
    `);

    // Crear tabla de logs
    await db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webhook_id TEXT,
        status TEXT NOT NULL,
        message TEXT,
        response_data TEXT,
        error_message TEXT,
        execution_time INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (webhook_id) REFERENCES webhooks (id)
      )
    `);

    console.log('✅ Tablas de base de datos creadas/verificadas');
    return db;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  return db;
};

export const dbGet = async (query, params = []) => {
  const database = getDatabase();
  return await database.get(query, params);
};

export const dbAll = async (query, params = []) => {
  const database = getDatabase();
  return await database.all(query, params);
};

export const dbRun = async (query, params = []) => {
  const database = getDatabase();
  return await database.run(query, params);
};