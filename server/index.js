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
        uptime: process.uptime()
      });
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
      console.error('Error:', err);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    // Manejo de rutas no encontradas
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
      });
    });

    // Programar verificación de webhooks cada minuto
    console.log('⏰ Configurando scheduler...');
    cron.schedule('* * * * *', () => {
      checkScheduledWebhooks();
    });

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📡 API disponible en http://localhost:${PORT}/api`);
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