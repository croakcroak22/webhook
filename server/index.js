import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import webhookRoutes from './routes/webhooks.js';
import { initDatabase } from './database/init.js';
import { checkScheduledWebhooks } from './services/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitado para desarrollo
}));

// CORS configurado para desarrollo y producción
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tu-dominio.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Función para inicializar el servidor
const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor...');
    console.log('📍 Directorio actual:', __dirname);
    console.log('🌍 Entorno:', process.env.NODE_ENV || 'development');
    
    // Inicializar base de datos
    console.log('🔄 Inicializando base de datos...');
    await initDatabase();
    console.log('✅ Base de datos inicializada correctamente');

    // Rutas de la API
    app.use('/api/webhooks', webhookRoutes);

    // Endpoint de salud
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'SQLite',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Endpoint de información de la base de datos
    app.get('/api/db-info', async (req, res) => {
      try {
        const { dbAll } = await import('./database/init.js');
        
        const tables = await dbAll(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        
        const webhookCount = await dbAll(`SELECT COUNT(*) as count FROM webhooks`);
        const logCount = await dbAll(`SELECT COUNT(*) as count FROM webhook_logs`);
        
        res.json({
          success: true,
          database: 'SQLite',
          tables: tables.map(t => t.name),
          counts: {
            webhooks: webhookCount[0]?.count || 0,
            logs: logCount[0]?.count || 0
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Servir archivos estáticos en producción
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(join(__dirname, '../dist')));
      
      app.get('*', (req, res) => {
        res.sendFile(join(__dirname, '../dist/index.html'));
      });
    }

    // Manejo de errores global
    app.use((err, req, res, next) => {
      console.error('❌ Error global:', err);
      console.error('Stack:', err.stack);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    // Manejo de rutas no encontradas
    app.use('*', (req, res) => {
      console.log('❌ Ruta no encontrada:', req.originalUrl);
      res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        path: req.originalUrl
      });
    });

    // Programar verificación de webhooks cada minuto
    console.log('⏰ Configurando scheduler...');
    cron.schedule('* * * * *', () => {
      console.log('⏰ Ejecutando verificación de webhooks programados...');
      checkScheduledWebhooks();
    });

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log('🎉 ¡Servidor iniciado exitosamente!');
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📡 API disponible en http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 DB info: http://localhost:${PORT}/api/db-info`);
      console.log(`⏰ Scheduler activo - verificando webhooks cada minuto`);
    });

    // Manejo graceful de cierre
    const gracefulShutdown = () => {
      console.log('🛑 Cerrando servidor...');
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();