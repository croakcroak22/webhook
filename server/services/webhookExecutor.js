import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { dbRun } from '../database/init.js';

export const executeWebhook = async (webhook, isManual = false) => {
  const startTime = Date.now();
  
  try {
    console.log(`📤 Ejecutando webhook ${webhook.id}: ${webhook.name}`);
    
    // Actualizar status a 'executing'
    await dbRun(`
      UPDATE webhooks 
      SET status = 'executing' 
      WHERE id = ?
    `, [webhook.id]);

    // Preparar payload
    const payload = {
      webhookId: webhook.id,
      name: webhook.name,
      message: webhook.message,
      leads: webhook.leads,
      tags: webhook.tags,
      scheduledDate: webhook.scheduled_date,
      scheduledTime: webhook.scheduled_time,
      executedAt: new Date().toISOString(),
      isManualExecution: isManual
    };

    // Ejecutar webhook con timeout
    const response = await axios.post(webhook.webhook_url, payload, {
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'N8N-Webhook-Scheduler/1.0'
      }
    });

    const duration = Date.now() - startTime;
    const executedAt = new Date().toISOString();

    // Actualizar webhook como exitoso
    await dbRun(`
      UPDATE webhooks 
      SET status = 'sent', executed_at = ? 
      WHERE id = ?
    `, [executedAt, webhook.id]);

    // Log de éxito
    await dbRun(`
      INSERT INTO webhook_logs (id, webhook_id, status, message, response, duration)
      VALUES (?, ?, 'success', ?, ?, ?)
    `, [
      uuidv4(),
      webhook.id,
      `Webhook ejecutado exitosamente${isManual ? ' (manual)' : ''}`,
      JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: response.data
      }),
      duration
    ]);

    console.log(`✅ Webhook ${webhook.id} ejecutado exitosamente en ${duration}ms`);

    return {
      success: true,
      message: 'Webhook ejecutado exitosamente',
      duration,
      response: response.data
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
    
    console.error(`❌ Error ejecutando webhook ${webhook.id}:`, errorMessage);

    // Incrementar contador de reintentos
    const newRetryCount = (webhook.retry_count || 0) + 1;
    const maxRetries = webhook.max_retries || 3;
    
    let newStatus = 'failed';
    if (newRetryCount < maxRetries) {
      newStatus = 'pending'; // Permitir reintento
      console.log(`🔄 Webhook ${webhook.id} será reintentado (${newRetryCount}/${maxRetries})`);
    }

    // Actualizar webhook con error
    await dbRun(`
      UPDATE webhooks 
      SET status = ?, error_message = ?, retry_count = ?
      WHERE id = ?
    `, [newStatus, errorMessage, newRetryCount, webhook.id]);

    // Log de error
    await dbRun(`
      INSERT INTO webhook_logs (id, webhook_id, status, message, duration)
      VALUES (?, ?, 'error', ?, ?)
    `, [
      uuidv4(),
      webhook.id,
      `Error ejecutando webhook: ${errorMessage}${isManual ? ' (manual)' : ''}`,
      duration
    ]);

    return {
      success: false,
      message: errorMessage,
      duration,
      retryCount: newRetryCount,
      maxRetries
    };
  }
};