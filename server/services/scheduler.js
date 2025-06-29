import { dbAll } from '../database/init.js';
import { executeWebhook } from './webhookExecutor.js';

export const checkScheduledWebhooks = async () => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    
    console.log(`⏰ Verificando webhooks programados para ${currentDate} ${currentTime}`);

    // Buscar webhooks que deben ejecutarse
    const webhooksToExecute = await dbAll(`
      SELECT * FROM webhooks 
      WHERE status = 'pending' 
      AND (
        scheduled_date < ? OR 
        (scheduled_date = ? AND scheduled_time <= ?)
      )
    `, [currentDate, currentDate, currentTime]);

    if (webhooksToExecute.length > 0) {
      console.log(`🎯 Encontrados ${webhooksToExecute.length} webhooks para ejecutar`);
      
      for (const webhook of webhooksToExecute) {
        // Parsear JSON fields
        webhook.leads = JSON.parse(webhook.leads);
        webhook.tags = JSON.parse(webhook.tags || '[]');
        
        console.log(`🚀 Ejecutando webhook: ${webhook.name} (${webhook.id})`);
        await executeWebhook(webhook, false);
      }
    }
  } catch (error) {
    console.error('❌ Error en scheduler:', error);
  }
};