export const validateWebhook = (data) => {
  const errors = [];

  // Validar nombre
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('El nombre es requerido y debe ser una cadena no vacía');
  }

  // Validar URL
  if (!data.url || typeof data.url !== 'string') {
    errors.push('La URL es requerida y debe ser una cadena');
  } else {
    try {
      new URL(data.url);
    } catch {
      errors.push('La URL debe ser válida');
    }
  }

  // Validar método HTTP
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (data.method && !validMethods.includes(data.method.toUpperCase())) {
    errors.push('El método HTTP debe ser uno de: ' + validMethods.join(', '));
  }

  // Validar headers (debe ser JSON válido si se proporciona)
  if (data.headers && typeof data.headers === 'string') {
    try {
      JSON.parse(data.headers);
    } catch {
      errors.push('Los headers deben ser JSON válido');
    }
  }

  // Validar body (debe ser JSON válido si se proporciona)
  if (data.body && typeof data.body === 'string') {
    try {
      JSON.parse(data.body);
    } catch {
      errors.push('El body debe ser JSON válido');
    }
  }

  // Validar tipo de programación
  const validScheduleTypes = ['interval', 'cron', 'once'];
  if (!data.schedule_type || !validScheduleTypes.includes(data.schedule_type)) {
    errors.push('El tipo de programación debe ser uno de: ' + validScheduleTypes.join(', '));
  }

  // Validar valor de programación
  if (!data.schedule_value || typeof data.schedule_value !== 'string' || data.schedule_value.trim().length === 0) {
    errors.push('El valor de programación es requerido');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateScheduleValue = (scheduleType, scheduleValue) => {
  switch (scheduleType) {
    case 'interval':
      const intervalMinutes = parseInt(scheduleValue);
      return !isNaN(intervalMinutes) && intervalMinutes > 0;
    
    case 'cron':
      // Validación básica de cron (5 o 6 campos)
      const cronParts = scheduleValue.trim().split(/\s+/);
      return cronParts.length === 5 || cronParts.length === 6;
    
    case 'once':
      // Validar que sea una fecha válida
      const date = new Date(scheduleValue);
      return !isNaN(date.getTime()) && date > new Date();
    
    default:
      return false;
  }
};