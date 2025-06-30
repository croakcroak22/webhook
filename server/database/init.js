import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

let pool;

export const initDatabase = async () => {
  try {
    // Configuración de conexión a PostgreSQL
    pool = new Pool({
      host: process.env.DB_HOST || '5us72d.easypanel.host',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'n8n',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'hEMb1q6H77Pi',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Probar conexión
    const client = await pool.connect();
    console.log('📊 Conectado a PostgreSQL');
    
    // Crear tablas si no existen
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        message TEXT NOT NULL,
        leads JSONB NOT NULL,
        tags JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        executed_at TIMESTAMP,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        deleted_at TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        response TEXT,
        duration INTEGER,
        FOREIGN KEY (webhook_id) REFERENCES webhooks (id)
      )
    `);

    // Crear índices para mejor rendimiento
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status) WHERE is_deleted = FALSE
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_scheduled ON webhooks(scheduled_date, scheduled_time) WHERE is_deleted = FALSE
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_deleted ON webhooks(is_deleted, deleted_at)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id)
    `);

    client.release();
    console.log('✅ Tablas de PostgreSQL inicializadas');
    
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!pool) {
    throw new Error('Base de datos no inicializada');
  }
  return pool;
};

// Funciones helper para queries
export const dbQuery = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

export const dbRun = async (text, params = []) => {
  const result = await dbQuery(text, params);
  return {
    rowCount: result.rowCount,
    rows: result.rows
  };
};

export const dbGet = async (text, params = []) => {
  const result = await dbQuery(text, params);
  return result.rows[0] || null;
};

export const dbAll = async (text, params = []) => {
  const result = await dbQuery(text, params);
  return result.rows;
};