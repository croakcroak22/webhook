import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Activity,
  Zap,
  Calendar
} from 'lucide-react';
import { useWebhooks } from '../hooks/useWebhooks';

const Dashboard: React.FC = () => {
  const { getStats, webhooks, logs } = useWebhooks();
  const stats = getStats();

  const recentLogs = logs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const upcomingWebhooks = webhooks
    .filter(w => w.status === 'pending')
    .sort((a, b) => {
      const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
      const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }> = ({ title, value, icon, color, bgColor }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bgColor} rounded-xl p-6 border`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Activity className="w-4 h-4" />
          <span>Live monitoring</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Webhooks"
          value={stats.total}
          icon={<Zap className="w-6 h-6 text-white" />}
          color="bg-primary-500"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-yellow-500"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatCard
          title="Sent"
          value={stats.sent}
          icon={<CheckCircle2 className="w-6 h-6 text-white" />}
          color="bg-success-500"
          bgColor="bg-white dark:bg-gray-800"
        />
        <StatCard
          title="Failed"
          value={stats.failed}
          icon={<XCircle className="w-6 h-6 text-white" />}
          color="bg-error-500"
          bgColor="bg-white dark:bg-gray-800"
        />
      </div>

      {/* Recent Activity & Upcoming Webhooks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl border p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className={`p-1 rounded-full ${
                    log.status === 'success' ? 'bg-success-100 text-success-600' : 'bg-error-100 text-error-600'
                  }`}>
                    {log.status === 'success' ? 
                      <CheckCircle2 className="w-4 h-4" /> : 
                      <AlertCircle className="w-4 h-4" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleString()} • {log.duration}ms
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Upcoming Webhooks */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl border p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upcoming Webhooks</h2>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {upcomingWebhooks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming webhooks</p>
            ) : (
              upcomingWebhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="p-1 rounded-full bg-primary-100 text-primary-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {webhook.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {webhook.scheduledDate} at {webhook.scheduledTime}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;