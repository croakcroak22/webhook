// Simulación de endpoint para recibir webhooks de n8n
// En producción, esto sería un endpoint real del backend

export interface N8NIncomingWebhook {
  name: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  webhookUrl: string;
  message: string;
  leads: Array<{
    name: string;
    email: string;
    phone?: string;
    company?: string;
  }>;
  tags: string[];
  maxRetries?: number;
}

// Función para procesar webhooks entrantes de n8n
export const processIncomingWebhook = (data: N8NIncomingWebhook) => {
  try {
    // Validar datos requeridos
    if (!data.name || !data.scheduledDate || !data.scheduledTime || !data.webhookUrl || !data.message) {
      throw new Error('Faltan campos requeridos');
    }

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.scheduledDate)) {
      throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    // Validar formato de hora
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(data.scheduledTime)) {
      throw new Error('Formato de hora inválido. Use HH:MM');
    }

    // Validar URL
    try {
      new URL(data.webhookUrl);
    } catch {
      throw new Error('URL de webhook inválida');
    }

    // Validar leads
    if (!data.leads || data.leads.length === 0) {
      throw new Error('Debe incluir al menos un lead');
    }

    for (const lead of data.leads) {
      if (!lead.name || !lead.email) {
        throw new Error('Todos los leads deben tener nombre y email');
      }
      
      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(lead.email)) {
        throw new Error(`Email inválido: ${lead.email}`);
      }
    }

    // Transformar datos al formato interno
    const webhookPayload = {
      name: data.name,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      webhookUrl: data.webhookUrl,
      message: data.message,
      leads: data.leads.map(lead => ({
        id: crypto.randomUUID(),
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company
      })),
      tags: data.tags || [],
      maxRetries: data.maxRetries || 3
    };

    // Disparar evento para crear el webhook
    const event = new CustomEvent('createWebhookFromN8N', { 
      detail: webhookPayload 
    });
    window.dispatchEvent(event);

    return {
      success: true,
      message: 'Webhook programado exitosamente',
      webhookId: crypto.randomUUID()
    };

  } catch (error) {
    console.error('Error procesando webhook de n8n:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};