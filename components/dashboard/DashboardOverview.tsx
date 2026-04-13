import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Users, FileCheck, DollarSign, Clock, Calendar, Download, Plus, ChevronDown, LayoutTemplate, CheckCircle2, AlertCircle, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Program } from '../../services/models';
import { db as databaseService } from '../../services/database';
import { SkeletonLoader } from '../SkeletonLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DashboardOverviewProps {
  activeEvent?: Program | null;
  onNavigate?: (view: string) => void;
}

const StatCard = React.memo(({ title, value, change, isPositive, icon: Icon, color, onClick }: any) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-left w-full ${onClick ? 'hover:border-indigo-200' : ''}`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className={`flex items-center text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'} bg-opacity-10 px-2 py-1 rounded-full ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
        {change}
      </div>
    </div>
    <div className="text-slate-500 text-sm font-medium mb-1">{title}</div>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
  </motion.button>
));
StatCard.displayName = 'StatCard';

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
      await databaseService.updateProgram({ ...activeEvent!, active_form_id: formId } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms-overview', activeEvent?.id ?? ''] });
      toast.success('Form attached to this program.');
    },
    onError: () => toast.error('Failed to attach form.'),
  });

  const activeFormId = (activeEvent as any)?.active_form_id ?? null;
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
        return;
      }
      const headers = ['Title', 'Category', 'Status', 'Applicant', 'Date'];
      const rows = submissions.map((s: any) => [
        s.title || '', s.category || '', s.status || '', s.applicant || '', s.date || ''
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map((v: string) => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeEvent?.title || 'submissions'}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report.');
    }
  };

  const statsQuery = useQuery({
    queryKey: ['dashboard-overview-stats', activeEvent?.id || 'all'],
    queryFn: () => databaseService.getStats(activeEvent?.id),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const isLoading = statsQuery.isLoading;
  const stats = (statsQuery.data as any) || emptyStats;

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
          <div
            className="relative cursor-pointer group"
            onClick={() => {
              // Trigger the universal search palette (Cmd+K)
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
            }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <div className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-400 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between">
              <span>Search programs, submissions...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-500">&#8984;K</kbd>
            </div>
          </div>
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
                  <button onClick={() => { setQuickActionOpen(false); onNavigate?.('builder'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Edit Overview Page
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} className="h-36" />)
        ) : (
          <>
            <StatCard
              title={activeEvent?.type === 'Grant' ? 'Applications' : 'Total Submissions'}
              value={stats.totalSubmissions}
              change="+Demo"
              isPositive={true}
              icon={FileCheck}
              color="text-indigo-600 bg-indigo-600"
              onClick={() => onNavigate?.('submissions')}
            />
            <StatCard
              title="Est. Revenue"
              value={`$${stats.revenue}`}
              change="+Demo"
              isPositive={true}
              icon={DollarSign}
              color="text-emerald-600 bg-emerald-600"
              onClick={() => onNavigate?.('program-details')}
            />
            <StatCard
              title="Active Judges"
              value={stats.activeJudges}
              change="Online"
              isPositive={true}
              icon={Users}
              color="text-purple-600 bg-purple-600"
              onClick={() => onNavigate?.('judging')}
            />
            <StatCard
              title="Pending Review"
              value={stats.pendingReview}
              change="Action Needed"
              isPositive={false}
              icon={Clock}
              color="text-orange-600 bg-orange-600"
              onClick={() => onNavigate?.('judging')}
            />
          </>
        )}
      </div>

      {/* ── Form selector + charts (two-column on large screens) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: form selector */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <FormSelectorSection activeEvent={activeEvent ?? null} onNavigate={onNavigate} />
        </div>

        {/* Right column: charts */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
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
                    {activeEvent?.type === 'Grant' ? 'Application Volume' : 'Submission Trends'}
                  </h3>
                  <select className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 text-slate-600 outline-none">
                    <option>Last 7 Days</option>
                  </select>
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

