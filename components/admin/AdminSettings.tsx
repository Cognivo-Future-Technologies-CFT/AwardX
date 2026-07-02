import React, { useState } from 'react';
import { Settings, Shield, Key, Bell } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { ApiKeysManagement } from './ApiKeysManagement';
import { AuditLogsView } from './AuditLogsView';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'api' | 'audit'>('users');

  const tabs = [
    { id: 'users', label: 'Super Admin Access', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
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

          {activeTab === 'api' && (
            <motion.div
              key="api"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ApiKeysManagement />
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AuditLogsView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
