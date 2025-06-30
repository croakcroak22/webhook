import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Calendar, 
  Clock,
  Search,
  Filter
} from 'lucide-react';
import { useWebhooks } from '../hooks/useWebhooks';
import { WebhookData } from '../types/webhook';

interface TrashModalProps {
  onClose: () => void;
}

const TrashModal: React.FC<TrashModalProps> = ({ onClose }) => {
  const { 
    trashedWebhooks, 
    restoreWebhook, 
    deletePermanently, 
    emptyTrash,
    loadTrashedWebhooks 
  } = useWebhooks();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [emptyConfirmation, setEmptyConfirmation] = useState('');
  const [isEmptying, setIsEmptying] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const filteredWebhooks = trashedWebhooks.filter(webhook =>
    webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    webhook.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    webhook.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRestore = async (id: string) => {
    setRestoringIds(prev => new Set([...prev, id]));
    try {
      await restoreWebhook(id);
    } finally {
      setRestoringIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDeletePermanently = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this webhook? This action cannot be undone.')) {
      setDeletingIds(prev => new Set([...prev, id]));
      try {
        await deletePermanently(id);
      } finally {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }
  };

  const handleEmptyTrash = async () => {
    if (emptyConfirmation === 'EMPTY TRASH') {
      setIsEmptying(true);
      try {
        await emptyTrash(emptyConfirmation);
        setShowEmptyConfirm(false);
        setEmptyConfirmation('');
      } finally {
        setIsEmptying(false);
      }
    }
  };

  const TrashCard: React.FC<{ webhook: WebhookData }> = ({ webhook }) => {
    const isRestoring = restoringIds.has(webhook.id);
    const isDeleting = deletingIds.has(webhook.id);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gray-50 dark:bg-gray-700 rounded-lg border p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {webhook.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {webhook.message}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            {webhook.scheduledDate}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            {webhook.scheduledTime}
          </div>
        </div>

        {webhook.deletedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Deleted: {new Date(webhook.deletedAt).toLocaleString()}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {webhook.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
            {webhook.tags.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400">
                +{webhook.tags.length - 2}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleRestore(webhook.id)}
              disabled={isRestoring || isDeleting}
              className="flex items-center px-3 py-1 text-sm bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors disabled:opacity-50"
            >
              {isRestoring ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1" />
              )}
              Restore
            </button>
            <button
              onClick={() => handleDeletePermanently(webhook.id)}
              disabled={isRestoring || isDeleting}
              className="flex items-center px-3 py-1 text-sm bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Trash2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Trash ({trashedWebhooks.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Deleted webhooks can be restored or permanently deleted
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {trashedWebhooks.length > 0 && (
                <button
                  onClick={() => setShowEmptyConfirm(true)}
                  className="flex items-center px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Empty Trash
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        {trashedWebhooks.length > 0 && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search deleted webhooks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {trashedWebhooks.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Trash is empty
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Deleted webhooks will appear here
              </p>
            </div>
          ) : filteredWebhooks.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No webhooks found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your search term
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredWebhooks.map((webhook) => (
                  <TrashCard key={webhook.id} webhook={webhook} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Empty Trash Confirmation */}
        <AnimatePresence>
          {showEmptyConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-error-100 dark:bg-error-900 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-error-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Empty Trash
                  </h3>
                </div>

                <div className="mb-6">
                  <div className="bg-error-50 dark:bg-error-900 border border-error-200 dark:border-error-800 rounded-lg p-4 mb-4">
                    <p className="text-error-800 dark:text-error-200 text-sm">
                      <strong>⚠️ Warning:</strong> This will permanently delete all {trashedWebhooks.length} webhooks in the trash. 
                      This action cannot be undone.
                    </p>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    To confirm, please type <strong>"EMPTY TRASH"</strong>:
                  </p>

                  <input
                    type="text"
                    value={emptyConfirmation}
                    onChange={(e) => setEmptyConfirmation(e.target.value)}
                    placeholder="EMPTY TRASH"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-error-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowEmptyConfirm(false);
                      setEmptyConfirmation('');
                    }}
                    disabled={isEmptying}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEmptyTrash}
                    disabled={emptyConfirmation !== 'EMPTY TRASH' || isEmptying}
                    className="flex items-center px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEmptying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Emptying...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Empty Trash
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default TrashModal;