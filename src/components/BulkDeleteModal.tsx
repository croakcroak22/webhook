import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface BulkDeleteModalProps {
  onConfirm: (confirmation: string) => void;
  onCancel: () => void;
  webhookCount: number;
}

const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({ onConfirm, onCancel, webhookCount }) => {
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const requiredText = 'DELETE ALL WEBHOOKS';

  const handleConfirm = async () => {
    if (confirmation === requiredText) {
      setIsDeleting(true);
      try {
        await onConfirm(confirmation);
      } finally {
        setIsDeleting(false);
      }
    }
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
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-error-100 dark:bg-error-900 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-error-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Delete All Webhooks
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-error-50 dark:bg-error-900 border border-error-200 dark:border-error-800 rounded-lg p-4 mb-4">
              <p className="text-error-800 dark:text-error-200 text-sm">
                <strong>⚠️ Warning:</strong> This action will move all {webhookCount} webhooks to the trash. 
                This action can be undone by restoring webhooks from the trash.
              </p>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              To confirm this action, please type <strong>"{requiredText}"</strong> in the field below:
            </p>

            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={requiredText}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-error-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmation !== requiredText || isDeleting}
              className="flex items-center px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Webhooks
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BulkDeleteModal;