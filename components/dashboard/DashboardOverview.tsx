import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, FileCheck, Calendar, Download, Plus, ChevronDown, LayoutTemplate, CheckCircle2, AlertCircle, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Program } from '../../services/models';
import { db as databaseService } from '../../services/database';
import { SkeletonLoader } from '../SkeletonLoader';
import { preRegistrationService } from '../../services/preRegistration';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '../../services/queryKeys';

interface DashboardOverviewProps {
  activeEvent?: Program | null;
  onNavigate?: (view: string) => void;
}


// ── Form Selector ─────────────────────────────────────────────────────────────
const FormSelectorSection: React.FC<{ activeEvent: Program | null; onNavigate?: (v: string) => void }> = ({ activeEvent, onNavigate }) => {
  const queryClient = useQueryClient();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['forms-overview', activeEvent?.id ?? ''],
    queryFn: () => databaseService.getForms(activeEvent!.id),
    enabled: !!activeEvent?.id,
    staleTime: 60_000,
  });

  const attachMutation = useMutation({
    mutationFn: async (formId: string) => {
      await databaseService.setActiveFormForProgram(activeEvent!.id, formId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms-overview', activeEvent?.id ?? ''] });
      queryClient.invalidateQueries({ queryKey: queryKeys.programForms.active(activeEvent?.id ?? '') });
      toast.success('Submission form selected for this program.');
    },
    onError: () => toast.error('Failed to select submission form.'),
  });

  const activeFormId = activeEvent?.activeFormId ?? null;
  const activeForm   = forms.find((f: any) => f.id === activeFormId);

  if (!activeEvent) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-slate-900 text-sm">Submission Form</h3>
        </div>
        {forms.length > 0 && (
          <button
            onClick={() => onNavigate?.('templates')}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 transition-colors"
          >
            Manage forms <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
      ) : forms.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-3 py-6 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
          <AlertCircle className="w-8 h-8 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-700">No forms yet</p>
            <p className="text-xs text-slate-500 mt-0.5">Create a form in the Form Builder and attach it here.</p>
          </div>
          <button
            onClick={() => onNavigate?.('templates')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Go to Form Builder
          </button>
        </div>
      ) : (
        /* Form list */
        <div className="space-y-2">
          {forms.map((form: any) => {
            const isSelected = form.id === activeFormId;
            return (
              <button
                key={form.id}
                onClick={() => !isSelected && attachMutation.mutate(form.id)}
                disabled={attachMutation.isPending}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400/40'
                    : 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    <LayoutTemplate className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>{form.title}</p>
                    {form.description && <p className="text-xs text-slate-500 truncate">{form.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${form.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {form.is_active ? 'Published' : 'Draft'}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeForm && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <strong className="text-slate-700">{activeForm.title}</strong> is the active submission form for this program.
        </p>
      )}
    </div>
  );
};

// ── Main Overview ─────────────────────────────────────────────────────────────
export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ activeEvent, onNavigate }) => {
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const quickActionRef = useRef<HTMLDivElement>(null);

  const emptyStats = {
    totalSubmissions: 0,
    activePrograms: 0,
    pendingReview: 0,
    revenue: 0,
    activeJudges: 0,
    submissionTrend: [],
    categorySplit: [],
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickActionRef.current && !quickActionRef.current.contains(e.target as Node)) {
        setQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportReport = async () => {
    try {
      const submissions = await databaseService.getSubmissions(activeEvent?.id);
      if (!submissions || submissions.length === 0) {
        toast.info('No submissions to export yet.');
        return;
      }
      const headers = ['Title', 'Category', 'Status', 'Applicant', 'Date'];
      const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = submissions.map((s: any) => [
        s.title, s.category, s.status, s.applicant, s.date,
      ]);
      const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeEvent?.title || 'submissions'}-report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success(`Exported ${submissions.length} submission${submissions.length === 1 ? '' : 's'}.`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report.');
    }
  };

  const statsQuery = useQuery({
    queryKey: ['dashboard-overview-stats', activeEvent?.id || 'all'],
    queryFn: () => databaseService.getStats(activeEvent?.id),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const isInitialLoading = statsQuery.isLoading && statsQuery.data === undefined;
  const stats = (statsQuery.data as any) || emptyStats;

  const preRegStatsQuery = useQuery({
    queryKey: ['pre-reg-stats'],
    queryFn: () => preRegistrationService.getStats(),
    staleTime: 60_000,
  });
  const preRegStats = preRegStatsQuery.data;

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {activeEvent ? `${activeEvent.type} Overview` : 'Dashboard Overview'}
          </h1>
          <p className="text-slate-500">
            {activeEvent
              ? `Tracking performance for "${activeEvent.title}"`
              : "Here's your demo environment status."}
          </p>
        </div>
        <div className="flex-1 max-w-md">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-universal-search'))}
            aria-label="Open universal search"
            className="relative w-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
            <div className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-400 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
              <span>Search programs, submissions...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-500">&#8984;K</kbd>
            </div>
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Report
          </button>
          <div className="relative" ref={quickActionRef}>
            <button
              onClick={() => setQuickActionOpen(!quickActionOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm shadow-lg shadow-slate-900/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Quick Action
              <ChevronDown className={`w-3 h-3 transition-transform ${quickActionOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {quickActionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 overflow-hidden"
                >
                  <button onClick={() => { setQuickActionOpen(false); onNavigate?.('templates'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                    <FileCheck className="w-4 h-4" /> New Form Link
                  </button>
                  <button onClick={() => { setQuickActionOpen(false); onNavigate?.('awards'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Add Category
                  </button>
                  <button onClick={() => { setQuickActionOpen(false); onNavigate?.('judging'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                    <Users className="w-4 h-4" /> Invite Judge
                  </button>
                  <button onClick={() => { setQuickActionOpen(false); onNavigate?.('program-details'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Edit Program Details
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Pre-Registration Stats ─────────────────────────────────────────── */}
      {preRegStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Leads</span>
            <span className="text-2xl font-bold text-slate-900 mt-2">{preRegStats.totalRegistrations}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Today</span>
            <span className="text-2xl font-bold text-emerald-600 mt-2">+{preRegStats.todayRegistrations}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Qualified</span>
            <span className="text-2xl font-bold text-indigo-600 mt-2">{preRegStats.qualifiedLeads}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Converted</span>
            <span className="text-2xl font-bold text-blue-600 mt-2">{preRegStats.convertedLeads}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Demo Req.</span>
            <span className="text-2xl font-bold text-amber-600 mt-2">{preRegStats.demoRequests}</span>
          </div>
          <button onClick={() => window.location.href='/admin/pre-registrations'} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors text-left group">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Beta Signups</span>
            <div className="flex items-center justify-between mt-2 w-full">
              <span className="text-2xl font-bold text-purple-600">{preRegStats.betaSignups}</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
            </div>
          </button>
        </div>
      )}


      {/* ── Form selector + charts (two-column on large screens) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: form selector */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <FormSelectorSection activeEvent={activeEvent ?? null} onNavigate={onNavigate} />
        </div>

        {/* Right column: charts */}
        <div className="lg:col-span-2 space-y-4">
          {isInitialLoading ? (
            <>
              <SkeletonLoader className="h-[260px]" />
              <SkeletonLoader className="h-[200px]" />
            </>
          ) : (
            <>
              {/* Trend chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 text-lg">
                    {activeEvent?.type === 'Grants & Funding' || activeEvent?.type === 'Grant' ? 'Application Volume' : 'Submission Trends'}
                  </h3>
                  <span className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 text-slate-600">
                    Last 7 Days
                  </span>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.submissionTrend}>
                      <defs>
                        <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="entries" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorEntries)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category bar chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 text-lg mb-6">Category Split</h3>
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.categorySplit} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} background={{ fill: '#f8fafc' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
