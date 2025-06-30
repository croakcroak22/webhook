import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export const initDatabase = async () => {
  try {
    // Ensure the database directory exists
    const dbPath = path.join(__dirname, '../../webhooks.db');
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('📊 Conectando a SQLite en:', dbPath);

    // Configuración de conexión a SQLite
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('📊 Conectado a SQLite exitosamente');
    
    // Verificar si las tablas existen
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    console.log('📋 Tablas existentes:', tables.map(t => t.name));
    
    // Crear tablas si no existen
    console.log('🔧 Creando tabla webhooks...');
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

    console.log('🔧 Creando tabla webhook_logs...');
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
    console.log('🔧 Creando índices...');
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

    // Verificar tablas después de la creación
    const tablesAfter = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    console.log('✅ Tablas creadas:', tablesAfter.map(t => t.name));
    
    // Verificar estructura de la tabla webhooks
    const webhooksSchema = await db.all(`PRAGMA table_info(webhooks)`);
    console.log('📋 Estructura tabla webhooks:', webhooksSchema);
    
    // Verificar estructura de la tabla webhook_logs
    const logsSchema = await db.all(`PRAGMA table_info(webhook_logs)`);
    console.log('📋 Estructura tabla webhook_logs:', logsSchema);
    
    // Contar registros existentes
    const webhookCount = await db.get(`SELECT COUNT(*) as count FROM webhooks`);
    const logCount = await db.get(`SELECT COUNT(*) as count FROM webhook_logs`);
    
    console.log('📊 Registros existentes:');
    console.log('  - Webhooks:', webhookCount.count);
    console.log('  - Logs:', logCount.count);

    console.log('✅ Base de datos SQLite inicializada correctamente');
    
  } catch (error) {
    console.error('❌ Error conectando a SQLite:', error);
    console.error('Stack trace:', error.stack);
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
  try {
    console.log('🔍 Ejecutando query:', text, 'Params:', params);
    const result = await db.all(text, params);
    console.log('✅ Query ejecutada, resultados:', result.length, 'filas');
    return result;
  } catch (error) {
    console.error('❌ Error en dbQuery:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
};

export const dbRun = async (text, params = []) => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  try {
    console.log('🔧 Ejecutando comando:', text, 'Params:', params);
    const result = await db.run(text, params);
    console.log('✅ Comando ejecutado, cambios:', result.changes);
    return {
      rowCount: result.changes || 0,
      rows: []
    };
  } catch (error) {
    console.error('❌ Error en dbRun:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
};

export const dbGet = async (text, params = []) => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  try {
    console.log('🔍 Ejecutando get:', text, 'Params:', params);
    const result = await db.get(text, params);
    console.log('✅ Get ejecutado, resultado:', result ? 'encontrado' : 'no encontrado');
    return result;
  } catch (error) {
    console.error('❌ Error en dbGet:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
};

export const dbAll = async (text, params = []) => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  try {
    console.log('🔍 Ejecutando all:', text, 'Params:', params);
    const result = await db.all(text, params);
    console.log('✅ All ejecutado, resultados:', result.length, 'filas');
    return result;
  } catch (error) {
    console.error('❌ Error en dbAll:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
};