import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Clock, Activity, AlertCircle, CheckCircle2, User, RefreshCw, Trash2, CalendarDays, ToggleLeft, ToggleRight } from 'lucide-react';
import { db } from '../../services/database';
import { Log } from '../../services/models';
import { UserHoverCard } from '../UserHoverCard';
import { TableSkeleton } from '../SkeletonLoader';
import { realtime, supabase } from '../../services/supabase';
import { toast } from 'sonner';

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'create':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'update':
      return <RefreshCw className="w-4 h-4 text-blue-500" />;
    case 'delete':
      return <Trash2 className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    default:
      return <Activity className="w-4 h-4 text-slate-500" />;
  }
};

export const AuditLogsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const pageSize = 20;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const channel = realtime.subscribeToAuditLogs(() => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    });
    return () => realtime.unsubscribe(channel);
  }, [queryClient]);

  // Auto-delete logs older than 7 days
  useEffect(() => {
    if (!autoDeleteEnabled || !supabase) return;
    const deleteOld = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('audit_logs').delete().lt('created_at', sevenDaysAgo);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        toast.success('Old logs (>7 days) cleaned up');
      }
    };
    deleteOld();
  }, [autoDeleteEnabled, queryClient]);

  const logsQuery = useQuery({
    queryKey: ['audit-logs', page, pageSize, debouncedSearch, startDate, endDate],
    queryFn: () => db.getLogsPaginated({ page, pageSize, search: debouncedSearch, startDate: startDate || undefined, endDate: endDate || undefined }),
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('All audit logs deleted');
    },
    onError: () => toast.error('Failed to delete logs'),
  });

  const deleteByDateMutation = useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      if (!supabase) throw new Error('Supabase not configured');
      let query = supabase.from('audit_logs').delete();
      if (from) query = query.gte('created_at', new Date(from).toISOString());
      if (to) query = query.lte('created_at', new Date(to + 'T23:59:59').toISOString());
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('Logs in selected date range deleted');
      setStartDate('');
      setEndDate('');
    },
    onError: () => toast.error('Failed to delete logs by date range'),
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from('audit_logs').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setSelectedLogIds(new Set());
      toast.success('Selected logs deleted');
    },
    onError: () => toast.error('Failed to delete selected logs'),
  });

  const logs: Log[] = logsQuery.data?.items || [];
  const total = logsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isLoading = logsQuery.isLoading;

  const toggleLogSelection = (id: string) => {
    setSelectedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLogIds.size === logs.length) {
      setSelectedLogIds(new Set());
    } else {
      setSelectedLogIds(new Set(logs.map(l => l.id)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500">Track all system activity and security events.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-delete toggle */}
          <button
            onClick={() => setAutoDeleteEnabled(!autoDeleteEnabled)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              autoDeleteEnabled ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {autoDeleteEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Auto-delete (7d)
          </button>
          {/* Delete all */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete ALL audit logs? This cannot be undone.')) {
                deleteAllMutation.mutate();
              }
            }}
            disabled={deleteAllMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Delete All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 bg-slate-50/50 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
              showDateFilter ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Date Range
          </button>
          {selectedLogIds.size > 0 && (
            <button
              onClick={() => deleteSelectedMutation.mutate(Array.from(selectedLogIds))}
              disabled={deleteSelectedMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete {selectedLogIds.size} selected
            </button>
          )}
        </div>

        {/* Date range filter */}
        {showDateFilter && (
          <div className="p-4 border-b border-slate-200 bg-indigo-50/30 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            {(startDate || endDate) && (
              <>
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                  className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    if (!startDate && !endDate) return;
                    if (window.confirm(`Delete all logs${startDate ? ' from ' + startDate : ''}${endDate ? ' to ' + endDate : ''}?`)) {
                      deleteByDateMutation.mutate({ from: startDate, to: endDate });
                    }
                  }}
                  disabled={deleteByDateMutation.isPending}
                  className="px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete in range</span>
                </button>
              </>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6 w-10">
                  <input
                    type="checkbox"
                    checked={logs.length > 0 && selectedLogIds.size === logs.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                </th>
                <th className="p-4 w-1/4">Action</th>
                <th className="p-4 w-1/4">User</th>
                <th className="p-4 w-1/3">Details</th>
                <th className="p-4 text-right w-1/6">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={5}>
                    <TableSkeleton rows={8} columns={5} />
                  </td>
                </tr>
              )}
              {!isLoading && logs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:bg-slate-50 transition-colors group ${selectedLogIds.has(log.id) ? 'bg-indigo-50/50' : ''}`}
                >
                  <td className="p-4 pl-6">
                    <input
                      type="checkbox"
                      checked={selectedLogIds.has(log.id)}
                      onChange={() => toggleLogSelection(log.id)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg bg-opacity-10 border border-opacity-20 ${
                          log.type === 'create'
                            ? 'bg-green-500 border-green-500'
                            : log.type === 'update'
                              ? 'bg-blue-500 border-blue-500'
                              : log.type === 'delete'
                                ? 'bg-red-500 border-red-500'
                                : 'bg-orange-500 border-orange-500'
                        }`}
                      >
                        {getTypeIcon(log.type)}
                      </div>
                      <span className="font-semibold text-slate-900 text-sm">{log.action}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {log.user !== 'Unknown' ? (
                      <UserHoverCard user={{ name: log.user, avatar: log.userAvatar, role: 'Team Member' }}>
                        <div className="flex items-center gap-2 cursor-pointer">
                          {log.userAvatar ? (
                            <img src={log.userAvatar} alt="" className="w-6 h-6 rounded-full border border-slate-200" />
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-slate-200 bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                              {log.user?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <span className="text-sm text-slate-600 font-medium hover:text-indigo-600 hover:underline">{log.user}</span>
                        </div>
                      </UserHoverCard>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 italic text-sm">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">?</div>
                        Unknown
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-sm text-slate-500 font-mono">{log.details}</td>
                  <td className="p-4 text-right text-xs text-slate-500">{log.timestamp}</td>
                </tr>
              ))}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <p className="text-sm text-slate-500">No audit logs found for this filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {logs.length} of {total} logs · Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
