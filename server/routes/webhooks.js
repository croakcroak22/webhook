import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../database/init.js';
import { validateWebhookPayload } from '../utils/validation.js';
import { executeWebhook } from '../services/webhookExecutor.js';

const router = express.Router();

// Obtener todos los webhooks activos
router.get('/', async (req, res) => {
  try {
    console.log('📋 Obteniendo webhooks activos...');
    
    const webhooks = await dbAll(`
      SELECT * FROM webhooks 
      WHERE deleted_at IS NULL 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Encontrados ${webhooks.length} webhooks activos`);
    
    res.json({
      success: true,
      webhooks
    });
  } catch (error) {
    console.error('❌ Error obteniendo webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo webhooks',
      error: error.message
    });
  }
});

// Obtener webhooks eliminados (papelera)
router.get('/trash', async (req, res) => {
  try {
    console.log('🗑️ Obteniendo webhooks eliminados...');
    
    const webhooks = await dbAll(`
      SELECT * FROM webhooks 
      WHERE deleted_at IS NOT NULL 
      ORDER BY deleted_at DESC
    `);
    
    console.log(`✅ Encontrados ${webhooks.length} webhooks eliminados`);
    
    res.json({
      success: true,
      webhooks
    });
  } catch (error) {
    console.error('❌ Error obteniendo webhooks eliminados:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo webhooks eliminados',
      error: error.message
    });
  }
});

// Obtener todos los logs
router.get('/logs/all', async (req, res) => {
  try {
    console.log('📊 Obteniendo todos los logs...');
    
    const logs = await dbAll(`
      SELECT 
        wl.*,
        w.name as webhook_name
      FROM webhook_logs wl
      LEFT JOIN webhooks w ON wl.webhook_id = w.id
      ORDER BY wl.created_at DESC
      LIMIT 1000
    `);
    
    console.log(`✅ Encontrados ${logs.length} logs`);
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('❌ Error obteniendo logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo logs',
      error: error.message
    });
  }
});

// Obtener logs de un webhook específico
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Obteniendo logs para webhook ${id}...`);
    
    const logs = await dbAll(`
      SELECT * FROM webhook_logs 
      WHERE webhook_id = ? 
      ORDER BY created_at DESC
    `, [id]);
    
    console.log(`✅ Encontrados ${logs.length} logs para webhook ${id}`);
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('❌ Error obteniendo logs del webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo logs del webhook',
      error: error.message
    });
  }
});

// Recibir webhook desde n8n
router.post('/receive', async (req, res) => {
  try {
    console.log('📨 Webhook recibido desde n8n:', req.body);
    
    const validation = validateWebhookPayload(req.body);
    if (!validation.isValid) {
      console.error('❌ Payload inválido:', validation.errors);
      return res.status(400).json({
        success: false,
        message: 'Payload inválido',
        errors: validation.errors
      });
    }

    const webhookData = validation.data;
    const webhookId = uuidv4();

    // Guardar webhook en la base de datos
    await dbRun(`
      INSERT INTO webhooks (
        id, name, scheduled_date, scheduled_time, webhook_url, 
        message, leads, tags, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `, [
      webhookId,
      webhookData.name,
      webhookData.scheduledDate,
      webhookData.scheduledTime,
      webhookData.webhookUrl,
      webhookData.message || null,
      JSON.stringify(webhookData.leads || []),
      JSON.stringify(webhookData.tags || [])
    ]);

    // Crear log inicial
    await dbRun(`
      INSERT INTO webhook_logs (webhook_id, status, message, created_at)
      VALUES (?, 'received', 'Webhook recibido y programado', CURRENT_TIMESTAMP)
    `, [webhookId]);

    console.log(`✅ Webhook ${webhookId} guardado exitosamente`);

    res.json({
      success: true,
      message: 'Webhook recibido y programado exitosamente',
      webhookId,
      scheduledFor: `${webhookData.scheduledDate} ${webhookData.scheduledTime}`
    });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando webhook',
      error: error.message
    });
  }
});

// Ejecutar webhook manualmente
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🚀 Ejecutando webhook ${id} manualmente...`);
    
    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    if (webhook.deleted_at) {
      return res.status(400).json({
        success: false,
        message: 'No se puede ejecutar un webhook eliminado'
      });
    }

    const result = await executeWebhook(webhook, true);
    
    res.json({
      success: result.success,
      message: result.message,
      executionTime: result.executionTime
    });

  } catch (error) {
    console.error('❌ Error ejecutando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando webhook',
      error: error.message
    });
  }
});

// Eliminar webhook (mover a papelera)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Moviendo webhook ${id} a papelera...`);
    
    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    if (webhook.deleted_at) {
      return res.status(400).json({
        success: false,
        message: 'El webhook ya está eliminado'
      });
    }

    await dbRun(`
      UPDATE webhooks 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [id]);

    // Crear log
    await dbRun(`
      INSERT INTO webhook_logs (webhook_id, status, message, created_at)
      VALUES (?, 'deleted', 'Webhook movido a papelera', CURRENT_TIMESTAMP)
    `, [id]);

    console.log(`✅ Webhook ${id} movido a papelera`);

    res.json({
      success: true,
      message: 'Webhook movido a papelera exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando webhook',
      error: error.message
    });
  }
});

// Restaurar webhook desde papelera
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`♻️ Restaurando webhook ${id}...`);
    
    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    if (!webhook.deleted_at) {
      return res.status(400).json({
        success: false,
        message: 'El webhook no está eliminado'
      });
    }

    await dbRun(`
      UPDATE webhooks 
      SET deleted_at = NULL 
      WHERE id = ?
    `, [id]);

    // Crear log
    await dbRun(`
      INSERT INTO webhook_logs (webhook_id, status, message, created_at)
      VALUES (?, 'restored', 'Webhook restaurado desde papelera', CURRENT_TIMESTAMP)
    `, [id]);

    console.log(`✅ Webhook ${id} restaurado exitosamente`);

    res.json({
      success: true,
      message: 'Webhook restaurado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error restaurando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error restaurando webhook',
      error: error.message
    });
  }
});

// Eliminar webhook permanentemente
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`💀 Eliminando webhook ${id} permanentemente...`);
    
    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    // Eliminar logs relacionados
    await dbRun('DELETE FROM webhook_logs WHERE webhook_id = ?', [id]);
    
    // Eliminar webhook
    await dbRun('DELETE FROM webhooks WHERE id = ?', [id]);

    console.log(`✅ Webhook ${id} eliminado permanentemente`);

    res.json({
      success: true,
      message: 'Webhook eliminado permanentemente'
    });

  } catch (error) {
    console.error('❌ Error eliminando webhook permanentemente:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando webhook permanentemente',
      error: error.message
    });
  }
});

// Eliminar todos los webhooks
router.delete('/bulk/all', async (req, res) => {
  try {
    const { confirmation } = req.query;
    
    if (confirmation !== 'DELETE_ALL_WEBHOOKS') {
      return res.status(400).json({
        success: false,
        message: 'Confirmación requerida'
      });
    }

    console.log('💀 Eliminando todos los webhooks...');
    
    // Mover todos los webhooks activos a papelera
    const result = await dbRun(`
      UPDATE webhooks 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE deleted_at IS NULL
    `);

    console.log(`✅ ${result.changes} webhooks movidos a papelera`);

    res.json({
      success: true,
      message: `${result.changes} webhooks movidos a papelera`,
      deletedCount: result.changes
    });

  } catch (error) {
    console.error('❌ Error eliminando todos los webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando todos los webhooks',
      error: error.message
    });
  }
});

// Vaciar papelera
router.delete('/trash/empty', async (req, res) => {
  try {
    const { confirmation } = req.query;
    
    if (confirmation !== 'EMPTY_TRASH') {
      return res.status(400).json({
        success: false,
        message: 'Confirmación requerida'
      });
    }

    console.log('🗑️ Vaciando papelera...');
    
    // Obtener IDs de webhooks eliminados
    const trashedWebhooks = await dbAll(`
      SELECT id FROM webhooks WHERE deleted_at IS NOT NULL
    `);

    // Eliminar logs de webhooks eliminados
    for (const webhook of trashedWebhooks) {
      await dbRun('DELETE FROM webhook_logs WHERE webhook_id = ?', [webhook.id]);
    }
    
    // Eliminar webhooks permanentemente
    const result = await dbRun(`
      DELETE FROM webhooks WHERE deleted_at IS NOT NULL
    `);

    console.log(`✅ ${result.changes} webhooks eliminados permanentemente`);

    res.json({
      success: true,
      message: `${result.changes} webhooks eliminados permanentemente`,
      deletedCount: result.changes
    });

  } catch (error) {
    console.error('❌ Error vaciando papelera:', error);
    res.status(500).json({
      success: false,
      message: 'Error vaciando papelera',
      error: error.message
    });
  }
});

export default router;