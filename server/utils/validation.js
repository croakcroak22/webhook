export const validateWebhookPayload = (payload) => {
  const errors = [];
  
  // Validar campos requeridos
  if (!payload.name || typeof payload.name !== 'string') {
    errors.push('El campo "name" es requerido y debe ser una cadena');
  }
  
  if (!payload.scheduledDate || typeof payload.scheduledDate !== 'string') {
    errors.push('El campo "scheduledDate" es requerido y debe ser una cadena');
  }
  
  if (!payload.scheduledTime || typeof payload.scheduledTime !== 'string') {
    errors.push('El campo "scheduledTime" es requerido y debe ser una cadena');
  }
  
  if (!payload.webhookUrl || typeof payload.webhookUrl !== 'string') {
    errors.push('El campo "webhookUrl" es requerido y debe ser una cadena');
  }
  
  // Validar formato de URL
  if (payload.webhookUrl) {
    try {
      new URL(payload.webhookUrl);
    } catch (error) {
      errors.push('El campo "webhookUrl" debe ser una URL válida');
    }
  }
  
  // Validar formato de fecha
  if (payload.scheduledDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payload.scheduledDate)) {
      errors.push('El campo "scheduledDate" debe tener formato YYYY-MM-DD');
    }
  }
  
  // Validar formato de hora
  if (payload.scheduledTime) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(payload.scheduledTime)) {
      errors.push('El campo "scheduledTime" debe tener formato HH:MM');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      name: payload.name,
      scheduledDate: payload.scheduledDate,
      scheduledTime: payload.scheduledTime,
      webhookUrl: payload.webhookUrl,
      message: payload.message || null,
      leads: payload.leads || [],
      tags: payload.tags || []
    } : null
  };
};