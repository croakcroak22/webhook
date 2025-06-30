import { useState, useEffect, useCallback } from 'react';
import { WebhookData, WebhookLog, N8NWebhookPayload } from '../types/webhook';

const API_BASE = '/api/webhooks';

export const useWebhooks = () => {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [trashedWebhooks, setTrashedWebhooks] = useState<WebhookData[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar webhooks desde el backend
  const loadWebhooks = useCallback(async () => {
    try {
      const response = await fetch(API_BASE);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const transformedWebhooks = data.webhooks.map((webhook: any) => ({
          id: webhook.id,
          name: webhook.name,
          scheduledDate: webhook.scheduled_date,
          scheduledTime: webhook.scheduled_time,
          webhookUrl: webhook.webhook_url,
          message: webhook.message,
          leads: webhook.leads,
          tags: webhook.tags,
          status: webhook.status,
          createdAt: webhook.created_at,
          executedAt: webhook.executed_at,
          error: webhook.error_message,
          retryCount: webhook.retry_count || 0,
          maxRetries: webhook.max_retries || 3,
        }));
        setWebhooks(transformedWebhooks);
      }
    } catch (error) {
      console.error('Error cargando webhooks:', error);
      setWebhooks([]);
    }
  }, []);

  // Cargar webhooks eliminados (papelera)
  const loadTrashedWebhooks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/trash`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const transformedWebhooks = data.webhooks.map((webhook: any) => ({
          id: webhook.id,
          name: webhook.name,
          scheduledDate: webhook.scheduled_date,
          scheduledTime: webhook.scheduled_time,
          webhookUrl: webhook.webhook_url,
          message: webhook.message,
          leads: webhook.leads,
          tags: webhook.tags,
          status: webhook.status,
          createdAt: webhook.created_at,
          executedAt: webhook.executed_at,
          deletedAt: webhook.deleted_at,
          error: webhook.error_message,
          retryCount: webhook.retry_count || 0,
          maxRetries: webhook.max_retries || 3,
        }));
        setTrashedWebhooks(transformedWebhooks);
      }
    } catch (error) {
      console.error('Error cargando webhooks eliminados:', error);
      setTrashedWebhooks([]);
    }
  }, []);

  // Cargar logs desde el backend
  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/logs/all`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error cargando logs:', error);
      setLogs([]);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadWebhooks(), loadTrashedWebhooks(), loadLogs()]);
      setIsLoading(false);
    };
    
    loadData();
  }, [loadWebhooks, loadTrashedWebhooks, loadLogs]);

  // Crear webhook
  const createWebhook = useCallback(async (payload: N8NWebhookPayload) => {
    try {
      const response = await fetch(`${API_BASE}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await loadWebhooks();
        await loadLogs();
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error creando webhook:', error);
      throw error;
    }
  }, [loadWebhooks, loadLogs]);

  // Ejecutar webhook manualmente
  const executeWebhook = useCallback(async (webhook: WebhookData, isManual = false) => {
    try {
      const response = await fetch(`${API_BASE}/${webhook.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await loadWebhooks();
        await loadLogs();
      }
      
      return data.success;
    } catch (error) {
      console.error('Error ejecutando webhook:', error);
      return false;
    }
  }, [loadWebhooks, loadLogs]);

  // Eliminar webhook (mover a papelera)
  const deleteWebhook = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await loadWebhooks();
        await loadTrashedWebhooks();
        await loadLogs();
      }
      
      return data.success;
    } catch (error) {
      console.error('Error eliminando webhook:', error);
      return false;
    }
  }, [loadWebhooks, loadTrashedWebhooks, loadLogs]);

  // Eliminar todos los webhooks
  const deleteAllWebhooks = useCallback(async (confirmation: string) => {
    try {
      const params = new URLSearchParams({ confirmation });
      const response = await fetch(`${API_BASE}/bulk/all?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await loadWebhooks();
        await loadTrashedWebhooks();
        await loadLogs();
      }
      
      return data;
    } catch (error) {
      console.error('Error eliminando todos los webhooks:', error);
      throw error;
    }
  }, [loadWebhooks, loadTrashedWebhooks, loadLogs]);

  // Restaurar webhook desde papelera
  const restoreWebhook = useCallback(async (id: string) => {
    try {
      console.log('Restaurando webhook:', id);
      
      const response = await fetch(`${API_BASE}/${id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Restore response:', data);
      
      if (data.success) {
        console.log('Webhook restaurado exitosamente, recargando datos...');
        await Promise.all([loadWebhooks(), loadTrashedWebhooks(), loadLogs()]);
        console.log('Datos recargados');
        return true;
      } else {
        console.error('Error en respuesta:', data.message);
        throw new Error(data.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error restaurando webhook:', error);
      throw error;
    }
  }, [loadWebhooks, loadTrashedWebhooks, loadLogs]);

  // Eliminar permanentemente webhook
  const deletePermanently = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/${id}/permanent`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await loadTrashedWebhooks();
        await loadLogs();
      }
      
      return data.success;
    } catch (error) {
      console.error('Error eliminando permanentemente webhook:', error);
      return false;
    }
  }, [loadTrashedWebhooks, loadLogs]);

  // Vaciar papelera
  const emptyTrash = useCallback(async (confirmation: string) => {
    try {
      const params = new URLSearchParams({ confirmation });
      const response = await fetch(`${API_BASE}/trash/empty?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await loadTrashedWebhooks();
        await loadLogs();
      }
      
      return data;
    } catch (error) {
      console.error('Error vaciando papelera:', error);
      throw error;
    }
  }, [loadTrashedWebhooks, loadLogs]);

  // Actualizar webhook (placeholder para compatibilidad)
  const updateWebhook = useCallback((id: string, updates: Partial<WebhookData>) => {
    console.log('updateWebhook llamado:', id, updates);
  }, []);

  // Obtener estadísticas
  const getStats = useCallback(() => {
    const total = webhooks.length;
    const pending = webhooks.filter(w => w.status === 'pending').length;
    const sent = webhooks.filter(w => w.status === 'sent').length;
    const failed = webhooks.filter(w => w.status === 'failed').length;
    const cancelled = webhooks.filter(w => w.status === 'cancelled').length;
    const deleted = trashedWebhooks.length;

    return { total, pending, sent, failed, cancelled, deleted };
  }, [webhooks, trashedWebhooks]);

  // Verificar webhooks programados (ahora manejado por el backend)
  const checkScheduledWebhooks = useCallback(() => {
    // Esta función ahora es manejada por el scheduler del backend
  }, []);

  return {
    webhooks,
    trashedWebhooks,
    logs,
    isLoading,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    deleteAllWebhooks,
    restoreWebhook,
    deletePermanently,
    emptyTrash,
    executeWebhook,
    getStats,
    checkScheduledWebhooks,
    loadWebhooks,
    loadTrashedWebhooks,
    loadLogs,
  };
};