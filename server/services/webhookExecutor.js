import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { dbRun } from '../database/init.js';

export const executeWebhook = async (webhook) => {
  const logId = uuidv4();
  const executedAt = new Date().toISOString();
  
  try {
    console.log(`🚀 Ejecutando webhook: ${webhook.name} (${webhook.url})`);
    
    // Preparar headers
    let headers = {};
    try {
      headers = typeof webhook.headers === 'string' 
        ? JSON.parse(webhook.headers) 
        : webhook.headers || {};
    } catch (error) {
      console.warn(`⚠️ Headers inválidos para webhook ${webhook.name}, usando headers vacíos`);
      headers = {};
    }

    // Preparar body
    let data = null;
    if (webhook.method !== 'GET' && webhook.body) {
      try {
        data = typeof webhook.body === 'string' 
          ? JSON.parse(webhook.body) 
          : webhook.body;
      } catch (error) {
        console.warn(`⚠️ Body inválido para webhook ${webhook.name}, usando body vacío`);
        data = {};
      }
    }

    // Configurar request
    const config = {
      method: webhook.method || 'POST',
      url: webhook.url,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'N8N-Webhook-Scheduler/1.0',
        ...headers
      },
      timeout: 30000, // 30 segundos
      validateStatus: () => true // No lanzar error por códigos de estado HTTP
    };

    if (data && webhook.method !== 'GET') {
      config.data = data;
    }

    // Ejecutar request
    const response = await axios(config);
    
    // Log exitoso
    await dbRun(`
      INSERT INTO webhook_logs (
        id, webhook_id, status, response_code, response_body, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      logId,
      webhook.id,
      'success',
      response.status,
      JSON.stringify({
        data: response.data,
        headers: response.headers
      }),
      executedAt
    ]);

    console.log(`✅ Webhook ejecutado exitosamente: ${webhook.name} - Status: ${response.status}`);
    
    return {
      success: true,
      status: response.status,
      data: response.data,
      executedAt
    };

  } catch (error) {
    console.error(`❌ Error ejecutando webhook ${webhook.name}:`, error.message);
    
    // Log de error
    await dbRun(`
      INSERT INTO webhook_logs (
        id, webhook_id, status, response_code, error_message, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      logId,
      webhook.id,
      'error',
      error.response?.status || null,
      error.message,
      executedAt
    ]);

    return {
      success: false,
      error: error.message,
      status: error.response?.status || null,
      executedAt
    };
  }
};