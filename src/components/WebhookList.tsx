import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus,
  Calendar,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  RefreshCw,
  Trash,
  AlertTriangle
} from 'lucide-react';
import { WebhookData } from '../types/webhook';
import { useWebhooks } from '../hooks/useWebhooks';
import WebhookForm from './WebhookForm';
import BulkDeleteModal from './BulkDeleteModal';
import TrashModal from './TrashModal';

const WebhookList: React.FC = () => {
  const { webhooks, deleteWebhook, executeWebhook, createWebhook, deleteAllWebhooks } = useWebhooks();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null);
  const [executingWebhooks, setExecutingWebhooks] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);

  const filteredWebhooks = webhooks.filter(webhook => {
    const matchesSearch = webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         webhook.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         webhook.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || webhook.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleExecuteWebhook = async (webhook: WebhookData) => {
    setExecutingWebhooks(prev => new Set([...prev, webhook.id]));
    try {
      await executeWebhook(webhook, true);
    } finally {
      setExecutingWebhooks(prev => {
        const newSet = new Set(prev);
        newSet.delete(webhook.id);
        return newSet;
      });
    }
  };

  const handleBulkDelete = async (confirmation: string) => {
    try {
      await deleteAllWebhooks(confirmation);
      setShowBulkDeleteModal(false);
    } catch (error) {
      console.error('Error en eliminación masiva:', error);
    }
  };

  const getStatusIcon = (status: WebhookData['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'sent':
        return <CheckCircle2 className="w-4 h-4 text-success-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-error-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: WebhookData['status']) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200`;
      case 'sent':
        return `${baseClasses} bg-success-100 text-success-800 dark:bg-success-800 dark:text-success-200`;
      case 'failed':
        return `${baseClasses} bg-error-100 text-error-800 dark:bg-error-800 dark:text-error-200`;
      case 'cancelled':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const WebhookCard: React.FC<{ webhook: WebhookData }> = ({ webhook }) => {
    const [showActions, setShowActions] = useState(false);
    const isExecuting = executingWebhooks.has(webhook.id);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white dark:bg-gray-800 rounded-xl border p-6 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(webhook.status)}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {webhook.name}
              </h3>
              <span className={getStatusBadge(webhook.status)}>
                {webhook.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
              {webhook.message}
            </p>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-10">
                <button
                  onClick={() => {
                    handleExecuteWebhook(webhook);
                    setShowActions(false);
                  }}
                  disabled={isExecuting || webhook.status === 'sent'}
                  className="w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExecuting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Execute Now
                </button>
                <button
                  onClick={() => {
                    setSelectedWebhook(webhook);
                    setShowForm(true);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    deleteWebhook(webhook.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-left text-error-600 hover:bg-error-50 dark:hover:bg-error-900"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2" />
            {webhook.scheduledDate}
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 mr-2" />
            {webhook.scheduledTime}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {webhook.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-200"
              >
                {tag}
              </span>
            ))}
            {webhook.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                +{webhook.tags.length - 3} more
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {webhook.leads.length} lead{webhook.leads.length !== 1 ? 's' : ''}
          </div>
        </div>

        {webhook.error && (
          <div className="mt-3 p-3 bg-error-50 dark:bg-error-900 rounded-lg">
            <p className="text-sm text-error-800 dark:text-error-200">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {webhook.error}
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTrashModal(true)}
            className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Trash className="w-4 h-4 mr-2" />
            Trash
          </button>
          {webhooks.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Delete All
            </button>
          )}
          <button
            onClick={() => {
              setSelectedWebhook(null);
              setShowForm(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Webhook
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search webhooks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Webhooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWebhooks.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No webhooks found' : 'No webhooks yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first webhook to get started with automated scheduling'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Webhook
              </button>
            )}
          </div>
        ) : (
          filteredWebhooks.map((webhook) => (
            <WebhookCard key={webhook.id} webhook={webhook} />
          ))
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <WebhookForm
            initialData={selectedWebhook || undefined}
            onSubmit={(payload) => {
              createWebhook(payload);
              setShowForm(false);
              setSelectedWebhook(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedWebhook(null);
            }}
          />
        )}

        {showBulkDeleteModal && (
          <BulkDeleteModal
            onConfirm={handleBulkDelete}
            onCancel={() => setShowBulkDeleteModal(false)}
            webhookCount={webhooks.length}
          />
        )}

        {showTrashModal && (
          <TrashModal
            onClose={() => setShowTrashModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default WebhookList;