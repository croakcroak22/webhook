import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../database/init.js';
import { validateWebhook } from '../utils/validation.js';

const router = express.Router();

// Obtener todos los webhooks
router.get('/', async (req, res) => {
  try {
    console.log('📡 GET /api/webhooks - Obteniendo todos los webhooks');
    const webhooks = await dbAll('SELECT * FROM webhooks ORDER BY created_at DESC');
    console.log(`✅ Encontrados ${webhooks.length} webhooks`);
    res.json({
      success: true,
      data: webhooks
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

// Obtener un webhook por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 GET /api/webhooks/${id} - Obteniendo webhook`);
    
    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    console.log(`✅ Webhook encontrado: ${webhook.name}`);
    res.json({
      success: true,
      data: webhook
    });
  } catch (error) {
    console.error('❌ Error obteniendo webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo webhook',
      error: error.message
    });
  }
});

// Crear nuevo webhook
router.post('/', async (req, res) => {
  try {
    console.log('📡 POST /api/webhooks - Creando nuevo webhook');
    console.log('Datos recibidos:', req.body);

    const validation = validateWebhook(req.body);
    if (!validation.isValid) {
      console.log('❌ Validación fallida:', validation.errors);
      return res.status(400).json({
        success: false,
        message: 'Datos de webhook inválidos',
        errors: validation.errors
      });
    }

    const {
      name,
      url,
      method = 'POST',
      headers = '{}',
      body = '{}',
      schedule_type,
      schedule_value,
      is_active = true
    } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString();

    await dbRun(`
      INSERT INTO webhooks (
        id, name, url, method, headers, body, 
        schedule_type, schedule_value, is_active, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, name, url, method, 
      typeof headers === 'string' ? headers : JSON.stringify(headers),
      typeof body === 'string' ? body : JSON.stringify(body),
      schedule_type, schedule_value, is_active ? 1 : 0, now, now
    ]);

    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    
    console.log(`✅ Webhook creado exitosamente: ${name} (${id})`);
    res.status(201).json({
      success: true,
      message: 'Webhook creado exitosamente',
      data: webhook
    });
  } catch (error) {
    console.error('❌ Error creando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando webhook',
      error: error.message
    });
  }
});

// Actualizar webhook
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 PUT /api/webhooks/${id} - Actualizando webhook`);

    const existingWebhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    if (!existingWebhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    const validation = validateWebhook(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Datos de webhook inválidos',
        errors: validation.errors
      });
    }

    const {
      name,
      url,
      method = 'POST',
      headers = '{}',
      body = '{}',
      schedule_type,
      schedule_value,
      is_active = true
    } = req.body;

    const now = new Date().toISOString();

    await dbRun(`
      UPDATE webhooks SET 
        name = ?, url = ?, method = ?, headers = ?, body = ?,
        schedule_type = ?, schedule_value = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `, [
      name, url, method,
      typeof headers === 'string' ? headers : JSON.stringify(headers),
      typeof body === 'string' ? body : JSON.stringify(body),
      schedule_type, schedule_value, is_active ? 1 : 0, now, id
    ]);

    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    
    console.log(`✅ Webhook actualizado exitosamente: ${name}`);
    res.json({
      success: true,
      message: 'Webhook actualizado exitosamente',
      data: webhook
    });
  } catch (error) {
    console.error('❌ Error actualizando webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando webhook',
      error: error.message
    });
  }
});

// Eliminar webhook
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 DELETE /api/webhooks/${id} - Eliminando webhook`);

    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    // Eliminar logs relacionados primero
    await dbRun('DELETE FROM webhook_logs WHERE webhook_id = ?', [id]);
    
    // Eliminar webhook
    await dbRun('DELETE FROM webhooks WHERE id = ?', [id]);
    
    console.log(`✅ Webhook eliminado exitosamente: ${webhook.name}`);
    res.json({
      success: true,
      message: 'Webhook eliminado exitosamente'
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

// Alternar estado activo/inactivo
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 PATCH /api/webhooks/${id}/toggle - Alternando estado`);

    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    const newStatus = webhook.is_active ? 0 : 1;
    const now = new Date().toISOString();

    await dbRun(
      'UPDATE webhooks SET is_active = ?, updated_at = ? WHERE id = ?',
      [newStatus, now, id]
    );

    const updatedWebhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    
    console.log(`✅ Estado del webhook alternado: ${updatedWebhook.name} -> ${newStatus ? 'activo' : 'inactivo'}`);
    res.json({
      success: true,
      message: `Webhook ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      data: updatedWebhook
    });
  } catch (error) {
    console.error('❌ Error alternando estado del webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error alternando estado del webhook',
      error: error.message
    });
  }
});

// Obtener logs de un webhook específico
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log(`📡 GET /api/webhooks/${id}/logs - Obteniendo logs`);

    const logs = await dbAll(`
      SELECT * FROM webhook_logs 
      WHERE webhook_id = ? 
      ORDER BY executed_at DESC 
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), parseInt(offset)]);

    const total = await dbGet(
      'SELECT COUNT(*) as count FROM webhook_logs WHERE webhook_id = ?',
      [id]
    );

    console.log(`✅ Encontrados ${logs.length} logs para webhook ${id}`);
    res.json({
      success: true,
      data: logs,
      pagination: {
        total: total.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
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

// Obtener todos los logs
router.get('/logs/all', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    console.log(`📡 GET /api/webhooks/logs/all - Obteniendo todos los logs`);

    const logs = await dbAll(`
      SELECT 
        wl.*,
        w.name as webhook_name,
        w.url as webhook_url
      FROM webhook_logs wl
      LEFT JOIN webhooks w ON wl.webhook_id = w.id
      ORDER BY wl.executed_at DESC 
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    const total = await dbGet('SELECT COUNT(*) as count FROM webhook_logs');

    console.log(`✅ Encontrados ${logs.length} logs totales`);
    res.json({
      success: true,
      data: logs,
      pagination: {
        total: total.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo todos los logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo logs',
      error: error.message
    });
  }
});

// Ejecutar webhook manualmente
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 POST /api/webhooks/${id}/execute - Ejecutando webhook manualmente`);

    const webhook = await dbGet('SELECT * FROM webhooks WHERE id = ?', [id]);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook no encontrado'
      });
    }

    // Importar y ejecutar el webhook
    const { executeWebhook } = await import('../services/webhookExecutor.js');
    const result = await executeWebhook(webhook);

    console.log(`✅ Webhook ejecutado manualmente: ${webhook.name}`);
    res.json({
      success: true,
      message: 'Webhook ejecutado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('❌ Error ejecutando webhook manualmente:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando webhook',
      error: error.message
    });
  }
});

export default router;