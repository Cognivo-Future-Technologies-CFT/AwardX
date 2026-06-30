import React, { useState } from 'react';
import { Settings, Shield, Webhook, Key, Mail, Bell } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'flags' | 'api' | 'email' | 'audit'>('users');

  const tabs = [
    { id: 'users', label: 'System Users', icon: Shield },
    { id: 'flags', label: 'Feature Flags', icon: Webhook },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'email', label: 'Email Config', icon: Mail },
    { id: 'audit', label: 'Audit Logs', icon: Bell },
  ] as const;

  return (
    <div className="flex flex-col font-sans h-full max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-600" />
          System Settings
        </h1>
        <p className="mt-2 text-slate-500 max-w-3xl leading-relaxed">
          Manage platform-wide configuration, access control, and integrations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 mb-8">
        <div className="flex space-x-6 px-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 py-4 px-1 text-sm font-semibold transition-colors whitespace-nowrap ${
                  isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabSettings"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <UserManagement />
            </motion.div>
          )}

          {activeTab !== 'users' && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="py-20 text-center bg-white rounded-2xl border border-slate-200 border-dashed"
            >
              <Settings className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Module Not Configured</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                This settings module is reserved for future expansion and is currently inactive.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
