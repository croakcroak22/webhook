import { useState, useEffect, useCallback } from 'react';
import { WebhookData, WebhookLog, N8NWebhookPayload } from '../types/webhook';
import { format, isAfter, parseISO } from 'date-fns';

const API_BASE = '/api/webhooks';

export const useWebhooks = () => {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
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
      // Set empty array on error to prevent UI issues
      setWebhooks([]);
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
      // Set empty array on error to prevent UI issues
      setLogs([]);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadWebhooks(), loadLogs()]);
      setIsLoading(false);
    };
    
    loadData();
  }, [loadWebhooks, loadLogs]);

  // Crear webhook (ahora solo para uso local, n8n usa el endpoint directo)
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
        await loadWebhooks(); // Recargar webhooks
        await loadLogs(); // Recargar logs
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
        await loadWebhooks(); // Recargar webhooks
        await loadLogs(); // Recargar logs
      }
      
      return data.success;
    } catch (error) {
      console.error('Error ejecutando webhook:', error);
      return false;
    }
  }, [loadWebhooks, loadLogs]);

  // Eliminar webhook
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
        await loadWebhooks(); // Recargar webhooks
        await loadLogs(); // Recargar logs
      }
      
      return data.success;
    } catch (error) {
      console.error('Error eliminando webhook:', error);
      return false;
    }
  }, []);

  // Actualizar webhook (placeholder para compatibilidad)
  const updateWebhook = useCallback((id: string, updates: Partial<WebhookData>) => {
    // Esta función se mantiene para compatibilidad con el código existente
    // En el backend real, implementarías un endpoint PUT
    console.log('updateWebhook llamado:', id, updates);
  }, []);

  // Obtener estadísticas
  const getStats = useCallback(() => {
    const total = webhooks.length;
    const pending = webhooks.filter(w => w.status === 'pending').length;
    const sent = webhooks.filter(w => w.status === 'sent').length;
    const failed = webhooks.filter(w => w.status === 'failed').length;
    const cancelled = webhooks.filter(w => w.status === 'cancelled').length;

    return { total, pending, sent, failed, cancelled };
  }, [webhooks]);

  // Verificar webhooks programados (ahora manejado por el backend)
  const checkScheduledWebhooks = useCallback(() => {
    // Esta función ahora es manejada por el scheduler del backend
    // Se mantiene para compatibilidad
  }, []);

  return {
    webhooks,
    logs,
    isLoading,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    executeWebhook,
    getStats,
    checkScheduledWebhooks,
    loadWebhooks,
    loadLogs,
  };
};