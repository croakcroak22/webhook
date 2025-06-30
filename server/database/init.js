import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export const initDatabase = async () => {
  try {
    // Configuración de conexión a SQLite
    db = await open({
      filename: path.join(__dirname, '../../webhooks.db'),
      driver: sqlite3.Database
    });

    console.log('📊 Conectado a SQLite');
    
    // Crear tablas si no existen
    await db.exec(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        message TEXT NOT NULL,
        leads TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        executed_at TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        deleted_at TEXT,
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        response TEXT,
        duration INTEGER,
        FOREIGN KEY (webhook_id) REFERENCES webhooks (id)
      )
    `);

    // Crear índices para mejor rendimiento
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status) WHERE is_deleted = FALSE
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_scheduled ON webhooks(scheduled_date, scheduled_time) WHERE is_deleted = FALSE
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_deleted ON webhooks(is_deleted, deleted_at)
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id)
    `);

    console.log('✅ Tablas de SQLite inicializadas');
    
  } catch (error) {
    console.error('❌ Error conectando a SQLite:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  return db;
};

// Funciones helper para queries
export const dbQuery = async (text, params = []) => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  return await db.all(text, params);
};

export const dbRun = async (text, params = []) => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  const result = await db.run(text, params);
  return {
    rowCount: result.changes || 0,
    rows: []
  };
};

export const dbGet = async (text, params = []) => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  return await db.get(text, params);
};

export const dbAll = async (text, params = []) => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  return await db.all(text, params);
};