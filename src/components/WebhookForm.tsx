import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { N8NWebhookPayload, Lead } from '../types/webhook';

interface WebhookFormProps {
  onSubmit: (payload: N8NWebhookPayload) => void;
  onCancel: () => void;
  initialData?: Partial<N8NWebhookPayload>;
}

const WebhookForm: React.FC<WebhookFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState<N8NWebhookPayload>({
    name: initialData?.name || '',
    scheduledDate: initialData?.scheduledDate || '',
    scheduledTime: initialData?.scheduledTime || '',
    webhookUrl: initialData?.webhookUrl || '',
    message: initialData?.message || '',
    leads: initialData?.leads || [{ id: crypto.randomUUID(), name: '', email: '' }],
    tags: initialData?.tags || [],
    maxRetries: initialData?.maxRetries || 3,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.scheduledDate) newErrors.scheduledDate = 'Date is required';
    if (!formData.scheduledTime) newErrors.scheduledTime = 'Time is required';
    if (!formData.webhookUrl.trim()) newErrors.webhookUrl = 'Webhook URL is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';

    // Validate URL format
    try {
      new URL(formData.webhookUrl);
    } catch {
      newErrors.webhookUrl = 'Invalid URL format';
    }

    // Validate leads
    const invalidLeads = formData.leads.some(lead => !lead.name.trim() || !lead.email.trim());
    if (invalidLeads) newErrors.leads = 'All leads must have name and email';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = formData.leads.some(lead => lead.email && !emailRegex.test(lead.email));
    if (invalidEmails) newErrors.leads = 'Invalid email format in leads';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const addLead = () => {
    setFormData(prev => ({
      ...prev,
      leads: [...prev.leads, { id: crypto.randomUUID(), name: '', email: '' }]
    }));
  };

  const removeLead = (id: string) => {
    setFormData(prev => ({
      ...prev,
      leads: prev.leads.filter(lead => lead.id !== id)
    }));
  };

  const updateLead = (id: string, field: keyof Lead, value: string) => {
    setFormData(prev => ({
      ...prev,
      leads: prev.leads.map(lead =>
        lead.id === id ? { ...lead, [field]: value } : lead
      )
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
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
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {initialData ? 'Edit Webhook' : 'Create New Webhook'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter webhook name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={formData.webhookUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://your-webhook-url.com"
              />
              {errors.webhookUrl && (
                <p className="mt-1 text-sm text-error-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.webhookUrl}
                </p>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scheduled Date
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.scheduledDate && (
                <p className="mt-1 text-sm text-error-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.scheduledDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scheduled Time
              </label>
              <input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.scheduledTime && (
                <p className="mt-1 text-sm text-error-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.scheduledTime}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Retries
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.maxRetries}
                onChange={(e) => setFormData(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your message here..."
            />
            {errors.message && (
              <p className="mt-1 text-sm text-error-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.message}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-primary-600 hover:text-primary-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Leads */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Leads
              </label>
              <button
                type="button"
                onClick={addLead}
                className="flex items-center px-3 py-1 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Lead
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.leads.map((lead, index) => (
                <div key={lead.id} className="flex gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={lead.name}
                      onChange={(e) => updateLead(lead.id, 'name', e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Name"
                    />
                    <input
                      type="email"
                      value={lead.email}
                      onChange={(e) => updateLead(lead.id, 'email', e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={lead.phone || ''}
                      onChange={(e) => updateLead(lead.id, 'phone', e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Phone (optional)"
                    />
                  </div>
                  {formData.leads.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLead(lead.id)}
                      className="p-2 text-error-600 hover:bg-error-50 dark:hover:bg-error-900 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {errors.leads && (
              <p className="mt-1 text-sm text-error-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.leads}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {initialData ? 'Update Webhook' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default WebhookForm;