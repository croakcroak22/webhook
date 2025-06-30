import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database/init.js';
import { validateWebhookData } from '../utils/validation.js';
import { executeWebhook } from '../services/webhookExecutor.js';

const router = express.Router();

// Recibir webhook desde n8n
router.post('/receive', async (req, res) => {
  try {
    console.log('📥 Webhook recibido desde n8n:', req.body);
    
    // Validar datos
    const validation = validateWebhookData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.errors
      });
    }

    const webhookId = uuidv4();
    const now = new Date();

    // Guardar webhook en la base de datos
    await dbRun(`
      INSERT INTO webhooks (
        id, name, scheduled_date, scheduled_time, webhook_url, 
        message, leads, tags, status, created_at, max_retries
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
    `, [
      webhookId,
      req.body.name,
      req.body.scheduledDate,
      req.body.scheduledTime,
      req.body.webhookUrl,
      req.body.message,
      JSON.stringify(req.body.leads),
      JSON.stringify(req.body.tags || []),
      now,
      req.body.maxRetries || 3
    ]);

    // Log de creación
    await dbRun(`
      INSERT INTO webhook_logs (id, webhook_id, status, message)
      VALUES ($1, $2, 'success', $3)
    `, [
      uuidv4(),
      webhookId,
      `Webhook creado desde n8n: ${req.body.name}`
    ]);

    console.log(`✅ Webhook guardado: ${webhookId}`);

    res.json({
      success: true,
      message: 'Webhook programado exitosamente',
      webhookId,
      scheduledFor: `${req.body.scheduledDate} ${req.body.scheduledTime}`
    });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener todos los webhooks (solo activos)
router.get('/', async (req, res) => {
  try {
    const webhooks = await dbAll(`
      SELECT * FROM webhooks 
      WHERE is_deleted = FALSE
      ORDER BY created_at DESC
    `);

    // Parsear JSON fields
    const parsedWebhooks = webhooks.map(webhook => ({
      ...webhook,
      leads: typeof webhook.leads === 'string' ? JSON.parse(webhook.leads) : webhook.leads || [],
      tags: typeof webhook.tags === 'string' ? JSON.parse(webhook.tags) : webhook.tags || []
    }));

    res.json({
      success: true,
      webhooks: parsedWebhooks
    });
  } catch (error) {
    console.error('Error obteniendo webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo webhooks'
    });
  }
});

// Obtener webhooks eliminados (papelera)
router.get('/trash', async (req, res) => {
  try {
    const webhooks = await dbAll(`
      SELECT * FROM webhooks 
      WHERE is_deleted = TRUE
      ORDER BY deleted_at DESC
    `);

    // Parsear JSON fields
    const parsedWebhooks = webhooks.map(webhook => ({
      ...webhook,
      leads: typeof webhook.leads === 'string' ? JSON.parse(webhook.leads) : webhook.leads || [],
      tags: typeof webhook.tags === 'string' ? JSON.parse(webhook.tags) : webhook.tags || []
    }));

    res.json({
      success: true,
      webhooks: parsedWebhooks
    });
  } catch (error) {
    console.error('Error obteniendo webhooks eliminados:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo webhooks eliminados'
    });
  }
});

// Obtener webhook por ID
router.get('/:id', async (req, res) => {
  try {
    const webhook = await dbGet(`
      SELECT * FROM webhooks WHERE id = $1 AND is_deleted = FALSE
    `, [req.params.id]);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    // Parsear JSON fields
    webhook.leads = typeof webhook.leads === 'string' ? JSON.parse(webhook.leads) : webhook.leads || [];
    webhook.tags = typeof webhook.tags === 'string' ? JSON.parse(webhook.tags) : webhook.tags || [];

    res.json({
      success: true,
      webhook
    });
  } catch (error) {
    console.error('Error obteniendo webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo webhook'
    });
  }
});

// Ejecutar webhook manualmente
router.post('/:id/execute', async (req, res) => {
  try {
    const webhook = await dbGet(`
      SELECT * FROM webhooks WHERE id = $1 AND is_deleted = FALSE
    `, [req.params.id]);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    // Parsear JSON fields
    webhook.leads = typeof webhook.leads === 'string' ? JSON.parse(webhook.leads) : webhook.leads || [];
    webhook.tags = typeof webhook.tags === 'string' ? JSON.parse(webhook.tags) : webhook.tags || [];

    const result = await executeWebhook(webhook, true);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Error ejecutando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando webhook'
    });
  }
});

// Eliminar webhook (mover a papelera)
router.delete('/:id', async (req, res) => {
  try {
    const result = await dbRun(`
      UPDATE webhooks 
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND is_deleted = FALSE
    `, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    // Log de eliminación
    await dbRun(`
      INSERT INTO webhook_logs (id, webhook_id, status, message)
      VALUES ($1, $2, 'info', $3)
    `, [
      uuidv4(),
      req.params.id,
      'Webhook movido a papelera'
    ]);

    res.json({
      success: true,
      message: 'Webhook movido a papelera'
    });
  } catch (error) {
    console.error('Error eliminando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando webhook'
    });
  }
});

// Eliminar todos los webhooks (mover a papelera)
router.delete('/bulk/all', async (req, res) => {
  try {
    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE ALL WEBHOOKS') {
      return res.status(400).json({
        success: false,
        message: 'Confirmación incorrecta'
      });
    }

    const result = await dbRun(`
      UPDATE webhooks 
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP 
      WHERE is_deleted = FALSE
    `);

    // Log de eliminación masiva
    await dbRun(`
      INSERT INTO webhook_logs (id, webhook_id, status, message)
      VALUES ($1, $2, 'info', $3)
    `, [
      uuidv4(),
      'bulk-delete',
      `Eliminación masiva: ${result.rowCount} webhooks movidos a papelera`
    ]);

    res.json({
      success: true,
      message: `${result.rowCount} webhooks movidos a papelera`,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error eliminando todos los webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando webhooks'
    });
  }
});

// Restaurar webhook desde papelera
router.post('/:id/restore', async (req, res) => {
  try {
    const result = await dbRun(`
      UPDATE webhooks 
      SET is_deleted = FALSE, deleted_at = NULL 
      WHERE id = $1 AND is_deleted = TRUE
    `, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado en papelera'
      });
    }

    // Log de restauración
    await dbRun(`
      INSERT INTO webhook_logs (id, webhook_id, status, message)
      VALUES ($1, $2, 'info', $3)
    `, [
      uuidv4(),
      req.params.id,
      'Webhook restaurado desde papelera'
    ]);

    res.json({
      success: true,
      message: 'Webhook restaurado exitosamente'
    });
  } catch (error) {
    console.error('Error restaurando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error restaurando webhook'
    });
  }
});

// Eliminar permanentemente webhook
router.delete('/:id/permanent', async (req, res) => {
  try {
    // Eliminar logs relacionados primero
    await dbRun(`
      DELETE FROM webhook_logs WHERE webhook_id = $1
    `, [req.params.id]);

    // Eliminar webhook permanentemente
    const result = await dbRun(`
      DELETE FROM webhooks WHERE id = $1 AND is_deleted = TRUE
    `, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado en papelera'
      });
    }

    res.json({
      success: true,
      message: 'Webhook eliminado permanentemente'
    });
  } catch (error) {
    console.error('Error eliminando webhook permanentemente:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando webhook permanentemente'
    });
  }
});

// Vaciar papelera completamente
router.delete('/trash/empty', async (req, res) => {
  try {
    const { confirmation } = req.body;
    
    if (confirmation !== 'EMPTY TRASH') {
      return res.status(400).json({
        success: false,
        message: 'Confirmación incorrecta'
      });
    }

    // Obtener IDs de webhooks en papelera
    const trashedWebhooks = await dbAll(`
      SELECT id FROM webhooks WHERE is_deleted = TRUE
    `);

    // Eliminar logs de webhooks en papelera
    for (const webhook of trashedWebhooks) {
      await dbRun(`
        DELETE FROM webhook_logs WHERE webhook_id = $1
      `, [webhook.id]);
    }

    // Eliminar webhooks permanentemente
    const result = await dbRun(`
      DELETE FROM webhooks WHERE is_deleted = TRUE
    `);

    res.json({
      success: true,
      message: `${result.rowCount} webhooks eliminados permanentemente`,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error vaciando papelera:', error);
    res.status(500).json({
      success: false,
      message: 'Error vaciando papelera'
    });
  }
});

// Obtener logs
router.get('/logs/all', async (req, res) => {
  try {
    const logs = await dbAll(`
      SELECT wl.*, w.name as webhook_name
      FROM webhook_logs wl
      LEFT JOIN webhooks w ON wl.webhook_id = w.id
      ORDER BY wl.timestamp DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo logs'
    });
  }
});

// Obtener estadísticas
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await dbGet(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' AND is_deleted = FALSE THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'sent' AND is_deleted = FALSE THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' AND is_deleted = FALSE THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' AND is_deleted = FALSE THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN is_deleted = TRUE THEN 1 ELSE 0 END) as deleted
      FROM webhooks
    `);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas'
    });
  }
});

export default router;