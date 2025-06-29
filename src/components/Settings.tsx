import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Download, 
  Upload, 
  Trash2,
  Save,
  RefreshCw,
  Bell,
  Globe,
  Shield,
  Webhook
} from 'lucide-react';
import { useWebhooks } from '../hooks/useWebhooks';
import WebhookReceiver from './WebhookReceiver';

const Settings: React.FC = () => {
  const { webhooks, logs } = useWebhooks();
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('darkMode') === 'true' || 
    (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  const [notifications, setNotifications] = useState(
    localStorage.getItem('notifications') !== 'false'
  );
  const [autoRetry, setAutoRetry] = useState(
    localStorage.getItem('autoRetry') !== 'false'
  );
  const [checkInterval, setCheckInterval] = useState(
    parseInt(localStorage.getItem('checkInterval') || '60')
  );
  const [activeTab, setActiveTab] = useState('general');

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleNotifications = () => {
    const newNotifications = !notifications;
    setNotifications(newNotifications);
    localStorage.setItem('notifications', newNotifications.toString());
  };

  const toggleAutoRetry = () => {
    const newAutoRetry = !autoRetry;
    setAutoRetry(newAutoRetry);
    localStorage.setItem('autoRetry', newAutoRetry.toString());
  };

  const updateCheckInterval = (interval: number) => {
    setCheckInterval(interval);
    localStorage.setItem('checkInterval', interval.toString());
  };

  const exportData = () => {
    const data = {
      webhooks,
      logs,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhook-scheduler-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.webhooks && Array.isArray(data.webhooks)) {
          localStorage.setItem('n8n-webhook-scheduler', JSON.stringify(data.webhooks));
        }
        
        if (data.logs && Array.isArray(data.logs)) {
          localStorage.setItem('n8n-webhook-logs', JSON.stringify(data.logs));
        }
        
        alert('Data imported successfully! Please refresh the page to see the changes.');
      } catch (error) {
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.removeItem('n8n-webhook-scheduler');
      localStorage.removeItem('n8n-webhook-logs');
      alert('All data has been cleared. Please refresh the page.');
    }
  };

  const SettingSection: React.FC<{ 
    title: string; 
    description: string; 
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ title, description, icon, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl border p-6"
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );

  const Toggle: React.FC<{ 
    checked: boolean; 
    onChange: () => void; 
    label: string;
    description?: string;
  }> = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-medium text-gray-900 dark:text-white">{label}</label>
        {description && (
          <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'webhooks', label: 'Webhooks n8n', icon: Webhook },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appearance */}
          <SettingSection
            title="Appearance"
            description="Customize the look and feel of your dashboard"
            icon={<Sun className="w-5 h-5 text-primary-600" />}
          >
            <Toggle
              checked={darkMode}
              onChange={toggleDarkMode}
              label="Dark Mode"
              description="Switch between light and dark themes"
            />
          </SettingSection>

          {/* Notifications */}
          <SettingSection
            title="Notifications"
            description="Manage how you receive updates about your webhooks"
            icon={<Bell className="w-5 h-5 text-primary-600" />}
          >
            <div className="space-y-4">
              <Toggle
                checked={notifications}
                onChange={toggleNotifications}
                label="Browser Notifications"
                description="Get notified when webhooks are executed"
              />
            </div>
          </SettingSection>

          {/* Automation */}
          <SettingSection
            title="Automation"
            description="Configure automatic retry and scheduling behavior"
            icon={<RefreshCw className="w-5 h-5 text-primary-600" />}
          >
            <div className="space-y-4">
              <Toggle
                checked={autoRetry}
                onChange={toggleAutoRetry}
                label="Auto Retry Failed Webhooks"
                description="Automatically retry failed webhooks based on retry settings"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Check Interval (seconds)
                </label>
                <select
                  value={checkInterval}
                  onChange={(e) => updateCheckInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  How often to check for scheduled webhooks
                </p>
              </div>
            </div>
          </SettingSection>

          {/* Data Management */}
          <SettingSection
            title="Data Management"
            description="Backup, restore, or clear your webhook data"
            icon={<Shield className="w-5 h-5 text-primary-600" />}
          >
            <div className="space-y-4">
              <button
                onClick={exportData}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
              
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                  id="import-file"
                />
                <label
                  htmlFor="import-file"
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </label>
              </div>
              
              <button
                onClick={clearAllData}
                className="w-full flex items-center justify-center px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </button>
            </div>
          </SettingSection>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <WebhookReceiver />
      )}

      {/* Statistics */}
      {activeTab === 'general' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl border p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{webhooks.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Webhooks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600">
                {webhooks.filter(w => w.status === 'sent').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {webhooks.filter(w => w.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-error-600">
                {webhooks.filter(w => w.status === 'failed').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Settings;