import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Send, 
  Settings, 
  Zap,
  Activity,
  Moon,
  Sun,
  Trash
} from 'lucide-react';
import { useWebhooks } from '../hooks/useWebhooks';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, darkMode, onToggleDarkMode }) => {
  const { getStats } = useWebhooks();
  const stats = getStats();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'webhooks', 
      label: 'Webhooks', 
      icon: Send,
      badge: stats.total > 0 ? stats.total : undefined
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64 min-h-screen p-6"
    >
      {/* Logo */}
      <div className="flex items-center space-x-2 mb-8">
        <div className="p-2 bg-primary-500 rounded-lg">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">WebhookSync</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">N8N Scheduler</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 mb-8">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              activeTab === item.id
                ? 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </div>
            {item.badge && (
              <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Stats Summary */}
      {stats.total > 0 && (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Quick Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Pending</span>
              <span className="font-medium text-yellow-600">{stats.pending}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Sent</span>
              <span className="font-medium text-success-600">{stats.sent}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Failed</span>
              <span className="font-medium text-error-600">{stats.failed}</span>
            </div>
            {stats.deleted > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">In Trash</span>
                <span className="font-medium text-gray-600">{stats.deleted}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 p-3 bg-success-50 dark:bg-success-900 rounded-lg">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-success-800 dark:text-success-200">System Active</span>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="mt-auto">
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {darkMode ? (
            <>
              <Sun className="w-5 h-5" />
              <span className="font-medium">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5" />
              <span className="font-medium">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          WebhookSync v1.0.0
        </p>
      </div>
    </motion.div>
  );
};

export default Sidebar;