export const validateWebhookData = (data) => {
  const errors = [];

  // Validar campos requeridos
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('El campo "name" es requerido y debe ser una cadena no vacía');
  }

  if (!data.scheduledDate || typeof data.scheduledDate !== 'string') {
    errors.push('El campo "scheduledDate" es requerido');
  } else {
    // Validar formato de fecha YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.scheduledDate)) {
      errors.push('El campo "scheduledDate" debe tener formato YYYY-MM-DD');
    } else {
      // Validar que sea una fecha válida
      const date = new Date(data.scheduledDate);
      if (isNaN(date.getTime())) {
        errors.push('El campo "scheduledDate" debe ser una fecha válida');
      }
    }
  }

  if (!data.scheduledTime || typeof data.scheduledTime !== 'string') {
    errors.push('El campo "scheduledTime" es requerido');
  } else {
    // Validar formato de hora HH:MM
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.scheduledTime)) {
      errors.push('El campo "scheduledTime" debe tener formato HH:MM');
    }
  }

  if (!data.webhookUrl || typeof data.webhookUrl !== 'string') {
    errors.push('El campo "webhookUrl" es requerido');
  } else {
    // Validar URL
    try {
      new URL(data.webhookUrl);
    } catch {
      errors.push('El campo "webhookUrl" debe ser una URL válida');
    }
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    errors.push('El campo "message" es requerido y debe ser una cadena no vacía');
  }

  // Validar leads
  if (!data.leads || !Array.isArray(data.leads) || data.leads.length === 0) {
    errors.push('El campo "leads" es requerido y debe ser un array con al menos un elemento');
  } else {
    data.leads.forEach((lead, index) => {
      if (!lead.name || typeof lead.name !== 'string' || lead.name.trim().length === 0) {
        errors.push(`Lead ${index + 1}: el campo "name" es requerido`);
      }
      
      if (!lead.email || typeof lead.email !== 'string') {
        errors.push(`Lead ${index + 1}: el campo "email" es requerido`);
      } else {
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(lead.email)) {
          errors.push(`Lead ${index + 1}: formato de email inválido`);
        }
      }
    });
  }

  // Validar campos opcionales
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('El campo "tags" debe ser un array');
  }

  if (data.maxRetries && (typeof data.maxRetries !== 'number' || data.maxRetries < 0 || data.maxRetries > 10)) {
    errors.push('El campo "maxRetries" debe ser un número entre 0 y 10');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};