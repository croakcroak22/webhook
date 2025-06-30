import { dbAll } from '../database/init.js';
import { executeWebhook } from './webhookExecutor.js';

export const checkScheduledWebhooks = async () => {
  try {
    console.log('⏰ Verificando webhooks programados...');
    
    // Obtener todos los webhooks activos
    const activeWebhooks = await dbAll(
      'SELECT * FROM webhooks WHERE is_active = 1'
    );

    if (activeWebhooks.length === 0) {
      console.log('📭 No hay webhooks activos para verificar');
      return;
    }

    console.log(`🔍 Verificando ${activeWebhooks.length} webhooks activos`);

    const now = new Date();
    
    for (const webhook of activeWebhooks) {
      try {
        const shouldExecute = await shouldExecuteWebhook(webhook, now);
        
        if (shouldExecute) {
          console.log(`🚀 Ejecutando webhook programado: ${webhook.name}`);
          await executeWebhook(webhook);
        }
      } catch (error) {
        console.error(`❌ Error procesando webhook ${webhook.name}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error en verificación de webhooks programados:', error);
    throw error;
  }
};

const shouldExecuteWebhook = async (webhook, currentTime) => {
  const { schedule_type, schedule_value, updated_at } = webhook;
  
  switch (schedule_type) {
    case 'interval':
      return shouldExecuteInterval(webhook, currentTime);
    
    case 'cron':
      return shouldExecuteCron(webhook, currentTime);
    
    case 'once':
      return shouldExecuteOnce(webhook, currentTime);
    
    default:
      console.warn(`⚠️ Tipo de programación desconocido: ${schedule_type}`);
      return false;
  }
};

const shouldExecuteInterval = async (webhook, currentTime) => {
  const intervalMinutes = parseInt(webhook.schedule_value);
  
  if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
    console.warn(`⚠️ Intervalo inválido para webhook ${webhook.name}: ${webhook.schedule_value}`);
    return false;
  }

  // Obtener la última ejecución exitosa
  const { dbGet } = await import('../database/init.js');
  const lastExecution = await dbGet(`
    SELECT executed_at FROM webhook_logs 
    WHERE webhook_id = ? AND status = 'success'
    ORDER BY executed_at DESC 
    LIMIT 1
  `, [webhook.id]);

  const lastExecutionTime = lastExecution 
    ? new Date(lastExecution.executed_at)
    : new Date(webhook.updated_at || webhook.created_at);

  const timeDiff = currentTime - lastExecutionTime;
  const minutesDiff = timeDiff / (1000 * 60);

  return minutesDiff >= intervalMinutes;
};

const shouldExecuteCron = (webhook, currentTime) => {
  // Implementación básica de cron
  // En una implementación real, usarías una librería como node-cron
  const cronValue = webhook.schedule_value;
  
  // Por simplicidad, solo manejamos algunos casos básicos
  if (cronValue === '* * * * *') {
    return true; // Cada minuto
  }
  
  // Aquí podrías agregar más lógica de cron según necesites
  console.warn(`⚠️ Expresión cron no soportada: ${cronValue}`);
  return false;
};

const shouldExecuteOnce = async (webhook, currentTime) => {
  const scheduledTime = new Date(webhook.schedule_value);
  
  if (isNaN(scheduledTime.getTime())) {
    console.warn(`⚠️ Fecha inválida para webhook ${webhook.name}: ${webhook.schedule_value}`);
    return false;
  }

  // Solo ejecutar si la fecha programada ya pasó y no se ha ejecutado antes
  if (currentTime >= scheduledTime) {
    const { dbGet } = await import('../database/init.js');
    const hasBeenExecuted = await dbGet(`
      SELECT id FROM webhook_logs 
      WHERE webhook_id = ? 
      LIMIT 1
    `, [webhook.id]);

    return !hasBeenExecuted;
  }

  return false;
};