import sqlite3 from 'sqlite3';
import { promisify } from 'util';

let db;

export const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database('./webhooks.db', (err) => {
      if (err) {
        console.error('Error conectando a la base de datos:', err);
        reject(err);
        return;
      }
      
      console.log('📊 Conectado a la base de datos SQLite');
      
      // Crear tablas
      db.serialize(() => {
        // Tabla de webhooks
        db.run(`
          CREATE TABLE IF NOT EXISTS webhooks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            scheduled_date TEXT NOT NULL,
            scheduled_time TEXT NOT NULL,
            webhook_url TEXT NOT NULL,
            message TEXT NOT NULL,
            leads TEXT NOT NULL,
            tags TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            executed_at TEXT,
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3
          )
        `);

        // Tabla de logs
        db.run(`
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

        console.log('✅ Tablas de base de datos inicializadas');
        resolve();
      });
    });
  });
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  return db;
};

// Promisificar métodos de la base de datos
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};