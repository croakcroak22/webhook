import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Webhook, CheckCircle2, XCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { processIncomingWebhook, N8NIncomingWebhook } from '../api/webhookReceiver';
import { useWebhooks } from '../hooks/useWebhooks';

const WebhookReceiver: React.FC = () => {
  const { createWebhook } = useWebhooks();
  const [receivedWebhooks, setReceivedWebhooks] = useState<Array<{
    id: string;
    timestamp: string;
    data: N8NIncomingWebhook;
    status: 'success' | 'error';
    message: string;
  }>>([]);
  const [showEndpoint, setShowEndpoint] = useState(false);

  // Endpoint simulado para mostrar al usuario
  const simulatedEndpoint = `${window.location.origin}/api/webhook/receive`;

  useEffect(() => {
    // Escuchar eventos de webhooks desde n8n
    const handleWebhookFromN8N = (event: CustomEvent) => {
      const result = processIncomingWebhook(event.detail);
      
      const logEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: event.detail,
        status: result.success ? 'success' as const : 'error' as const,
        message: result.message
      };

      setReceivedWebhooks(prev => [logEntry, ...prev.slice(0, 9)]); // Mantener solo los últimos 10

      if (result.success) {
        createWebhook(event.detail);
      }
    };

    window.addEventListener('createWebhookFromN8N', handleWebhookFromN8N as EventListener);
    
    return () => {
      window.removeEventListener('createWebhookFromN8N', handleWebhookFromN8N as EventListener);
    };
  }, [createWebhook]);

  const copyEndpoint = () => {
    navigator.clipboard.writeText(simulatedEndpoint);
  };

  const testWebhook = () => {
    const testData: N8NIncomingWebhook = {
      name: "Test desde n8n",
      scheduledDate: "2024-01-20",
      scheduledTime: "15:30",
      webhookUrl: "https://webhook.site/test-endpoint",
      message: "Este es un mensaje de prueba desde n8n",
      leads: [
        {
          name: "Cliente Prueba",
          email: "cliente@prueba.com",
          phone: "+34 600 000 000",
          company: "Empresa Test"
        }
      ],
      tags: ["test", "n8n", "prueba"],
      maxRetries: 2
    };

    const event = new CustomEvent('createWebhookFromN8N', { detail: testData });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg">
            <Webhook className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Endpoint para n8n
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configura este endpoint en tu workflow de n8n
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg font-mono text-sm">
              {showEndpoint ? simulatedEndpoint : '••••••••••••••••••••••••••••••••••••••••'}
            </div>
            <button
              onClick={() => setShowEndpoint(!showEndpoint)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showEndpoint ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={copyEndpoint}
              className="flex items-center px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copiar
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={testWebhook}
              className="px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors"
            >
              Probar Webhook
            </button>
          </div>
        </div>
      </div>

      {/* Log de webhooks recibidos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Webhooks Recibidos
        </h3>
        
        <div className="space-y-3">
          {receivedWebhooks.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No se han recibido webhooks aún
            </p>
          ) : (
            receivedWebhooks.map((webhook) => (
              <motion.div
                key={webhook.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                <div className={`p-1 rounded-full ${
                  webhook.status === 'success' 
                    ? 'bg-success-100 text-success-600' 
                    : 'bg-error-100 text-error-600'
                }`}>
                  {webhook.status === 'success' ? 
                    <CheckCircle2 className="w-4 h-4" /> : 
                    <XCircle className="w-4 h-4" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {webhook.data.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(webhook.timestamp).toLocaleString()} • {webhook.message}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Programado: {webhook.data.scheduledDate} a las {webhook.data.scheduledTime}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WebhookReceiver;