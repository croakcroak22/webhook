import { dbAll } from '../database/init.js';
import { executeWebhook } from './webhookExecutor.js';

export const checkScheduledWebhooks = async () => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    
    console.log(`⏰ Verificando webhooks programados para ${currentDate} ${currentTime}`);

    // Buscar webhooks que deben ejecutarse ahora
    const webhooksToExecute = await dbAll(`
      SELECT * FROM webhooks 
      WHERE status = 'pending' 
      AND deleted_at IS NULL
      AND scheduled_date = ? 
      AND scheduled_time <= ?
      AND (retry_count IS NULL OR retry_count < max_retries)
    `, [currentDate, currentTime]);

    if (webhooksToExecute.length === 0) {
      console.log('⏰ No hay webhooks programados para ejecutar en este momento');
      return;
    }

    console.log(`⏰ Encontrados ${webhooksToExecute.length} webhooks para ejecutar`);

    // Ejecutar cada webhook
    for (const webhook of webhooksToExecute) {
      try {
        console.log(`⏰ Ejecutando webhook programado: ${webhook.name} (${webhook.id})`);
        await executeWebhook(webhook, false);
      } catch (error) {
        console.error(`❌ Error ejecutando webhook programado ${webhook.id}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Error en verificación de webhooks programados:', error);
  }
};