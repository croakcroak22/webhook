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
    const now = new Date().toISOString();

    // Guardar webhook en la base de datos
    await dbRun(`
      INSERT INTO webhooks (
        id, name, scheduled_date, scheduled_time, webhook_url, 
        message, leads, tags, status, created_at, max_retries
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
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
      VALUES (?, ?, 'success', ?)
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

// Obtener todos los webhooks
router.get('/', async (req, res) => {
  try {
    const webhooks = await dbAll(`
      SELECT * FROM webhooks 
      ORDER BY created_at DESC
    `);

    // Parsear JSON fields
    const parsedWebhooks = webhooks.map(webhook => ({
      ...webhook,
      leads: JSON.parse(webhook.leads),
      tags: JSON.parse(webhook.tags || '[]')
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

// Obtener webhook por ID
router.get('/:id', async (req, res) => {
  try {
    const webhook = await dbGet(`
      SELECT * FROM webhooks WHERE id = ?
    `, [req.params.id]);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    // Parsear JSON fields
    webhook.leads = JSON.parse(webhook.leads);
    webhook.tags = JSON.parse(webhook.tags || '[]');

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
      SELECT * FROM webhooks WHERE id = ?
    `, [req.params.id]);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    // Parsear JSON fields
    webhook.leads = JSON.parse(webhook.leads);
    webhook.tags = JSON.parse(webhook.tags || '[]');

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

// Eliminar webhook
router.delete('/:id', async (req, res) => {
  try {
    const result = await dbRun(`
      DELETE FROM webhooks WHERE id = ?
    `, [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    // Eliminar logs relacionados
    await dbRun(`
      DELETE FROM webhook_logs WHERE webhook_id = ?
    `, [req.params.id]);

    res.json({
      success: true,
      message: 'Webhook eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando webhook'
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
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
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