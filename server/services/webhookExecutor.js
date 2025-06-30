import axios from 'axios';
import { dbRun, dbGet } from '../database/init.js';

export const executeWebhook = async (webhook, isManual = false) => {
  const startTime = Date.now();
  let success = false;
  let message = '';
  let responseData = null;
  let errorMessage = null;

  try {
    console.log(`🚀 Ejecutando webhook ${webhook.id}: ${webhook.name}`);
    
    // Preparar payload
    const payload = {
      name: webhook.name,
      scheduledDate: webhook.scheduled_date,
      scheduledTime: webhook.scheduled_time,
      message: webhook.message,
      leads: webhook.leads ? JSON.parse(webhook.leads) : [],
      tags: webhook.tags ? JSON.parse(webhook.tags) : [],
      executedAt: new Date().toISOString(),
      isManual
    };

    console.log('📤 Enviando payload:', payload);

    // Realizar petición HTTP
    const response = await axios.post(webhook.webhook_url, payload, {
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'N8N-Webhook-Scheduler/1.0'
      }
    });

    success = true;
    message = `Webhook ejecutado exitosamente (${response.status})`;
    responseData = JSON.stringify(response.data);
    
    console.log(`✅ Webhook ${webhook.id} ejecutado exitosamente`);

    // Actualizar estado del webhook
    await dbRun(`
      UPDATE webhooks 
      SET status = 'sent', executed_at = CURRENT_TIMESTAMP, error_message = NULL
      WHERE id = ?
    `, [webhook.id]);

  } catch (error) {
    success = false;
    errorMessage = error.message;
    
    if (error.response) {
      message = `Error HTTP ${error.response.status}: ${error.response.statusText}`;
      responseData = JSON.stringify(error.response.data);
    } else if (error.request) {
      message = 'Error de conexión: No se pudo conectar al webhook';
    } else {
      message = `Error: ${error.message}`;
    }

    console.error(`❌ Error ejecutando webhook ${webhook.id}:`, error.message);

    // Incrementar contador de reintentos
    const newRetryCount = (webhook.retry_count || 0) + 1;
    const maxRetries = webhook.max_retries || 3;
    
    if (newRetryCount >= maxRetries) {
      // Marcar como fallido si se alcanzó el máximo de reintentos
      await dbRun(`
        UPDATE webhooks 
        SET status = 'failed', retry_count = ?, error_message = ?
        WHERE id = ?
      `, [newRetryCount, errorMessage, webhook.id]);
    } else {
      // Incrementar contador de reintentos
      await dbRun(`
        UPDATE webhooks 
        SET retry_count = ?, error_message = ?
        WHERE id = ?
      `, [newRetryCount, errorMessage, webhook.id]);
    }
  }

  const executionTime = Date.now() - startTime;

  // Crear log de ejecución
  await dbRun(`
    INSERT INTO webhook_logs (
      webhook_id, status, message, response_data, error_message, execution_time, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    webhook.id,
    success ? 'sent' : 'failed',
    message,
    responseData,
    errorMessage,
    executionTime
  ]);

  return {
    success,
    message,
    executionTime,
    responseData,
    errorMessage
  };
};