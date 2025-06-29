export interface WebhookData {
  id: string;
  name: string;
  scheduledDate: string;
  scheduledTime: string;
  webhookUrl: string;
  message: string;
  leads: Lead[];
  tags: string[];
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdAt: string;
  executedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  customFields?: Record<string, any>;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  timestamp: string;
  status: 'success' | 'error';
  message: string;
  response?: any;
  duration: number;
}

export interface N8NWebhookPayload {
  name: string;
  scheduledDate: string;
  scheduledTime: string;
  webhookUrl: string;
  message: string;
  leads: Lead[];
  tags: string[];
  maxRetries?: number;
}