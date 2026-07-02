import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Loader2, Clock, User, ShieldAlert, FileEdit, Database, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { adminService, AuditLog } from '../../services/adminService';
import { motion } from 'framer-motion';

const ACTION_TYPES = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'SUPER_ADMIN', label: 'Super Admin Changes' },
  { value: 'API_KEY', label: 'API Key Updates' },
  { value: 'ORGANIZATION', label: 'Organization Changes' },
  { value: 'PROGRAM', label: 'Program Updates' },
  { value: 'SETTINGS', label: 'Settings Changes' },
];

export const AuditLogsView: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionType, setActionType] = useState('ALL');
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, actionType, debouncedSearch],
    queryFn: () => adminService.getAuditLogs(
      page, 
      20, 
      actionType === 'ALL' ? undefined : actionType,
      debouncedSearch || undefined
    ),
  });

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'SUPER_ADMIN': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'API_KEY': return <Database className="w-4 h-4 text-emerald-500" />;
      case 'ORGANIZATION': return <User className="w-4 h-4 text-blue-500" />;
      default: return <FileEdit className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'SUPER_ADMIN': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'API_KEY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ORGANIZATION': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const totalPages = logsData?.metadata.total ? Math.ceil(logsData.metadata.total / 20) : 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by action or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="relative min-w-[200px]">
          <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm appearance-none"
          >
            {ACTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : !logsData?.data?.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Search className="w-12 h-12 text-slate-300 mb-4" />
            <p className="font-medium text-slate-900">No audit logs found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logsData.data.map((log: AuditLog) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={log.id} 
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {log.user_avatar ? (
                          <img src={log.user_avatar} alt="" className="w-8 h-8 rounded-full bg-slate-200 object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {log.user_name?.charAt(0) || 'S'}
                          </div>
                        )}
                        <span className="text-sm font-medium text-slate-900">
                          {log.user_name || 'System User'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-800 font-medium">{log.action}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getActionColor(log.action_type)}`}>
                        {getActionIcon(log.action_type)}
                        {log.action_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500 max-w-xs truncate" title={log.details || ''}>
                        {log.details || '-'}
                      </p>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <p className="text-sm text-slate-500">
              Showing page <span className="font-semibold text-slate-900">{page}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
