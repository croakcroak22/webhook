import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

export const initDatabase = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // Crear la conexión a la base de datos
    db = await open({
      filename: join(__dirname, '../../webhooks.db'),
      driver: sqlite3.Database
    });

    console.log('✅ Conexión a base de datos establecida');

    // Crear tabla de webhooks si no existe
    await db.exec(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        method TEXT DEFAULT 'POST',
        headers TEXT DEFAULT '{}',
        body TEXT DEFAULT '{}',
        schedule_type TEXT NOT NULL,
        schedule_value TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de logs si no existe
    await db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL,
        status TEXT NOT NULL,
        response_code INTEGER,
        response_body TEXT,
        error_message TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (webhook_id) REFERENCES webhooks (id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tablas de base de datos verificadas/creadas');
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