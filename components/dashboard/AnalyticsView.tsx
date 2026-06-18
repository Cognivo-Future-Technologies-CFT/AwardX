
import React, { useEffect, useState } from 'react';
import { 
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
   PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { db as databaseService } from '../../services/database';
import { Program } from '../../services/models';

interface AnalyticsViewProps {
  activeEvent?: Program | null;
}

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ activeEvent }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalSubmissions: number;
    activePrograms: number;
    pendingReview: number;
    revenue: number;
    activeJudges: number;
    submissionTrend: { name: string; entries: number }[];
    categorySplit: { name: string; value: number }[];
    statusSplit: { name: string; value: number }[];
  }>({
    totalSubmissions: 0,
    activePrograms: 0,
    pendingReview: 0,
    revenue: 0,
    activeJudges: 0,
    submissionTrend: [],
    categorySplit: [],
    statusSplit: [],
  });

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async (showSpinner: boolean) => {
      if (showSpinner) setIsLoading(true);
      try {
        const baseStats = await databaseService.getStats(activeEvent?.id) as any;

        const submissions = await databaseService.getSubmissions(activeEvent?.id);
        const statusCounts: Record<string, number> = {};
        submissions.forEach((s: any) => {
          const status = s.status || 'Unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        const statusSplit = Object.entries(statusCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        if (!cancelled) {
          setStats({ ...baseStats, statusSplit });
        }
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        if (!cancelled && showSpinner) {
          setIsLoading(false);
        }
      }
    };

    void loadAnalytics(true);
    const interval = setInterval(() => { void loadAnalytics(false); }, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeEvent?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-slate-500">
            {activeEvent 
              ? `Live data for "${activeEvent.title}"`
              : 'Deep dive into your program performance.'}
          </p>
       </div>

       {/* Stat Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
         {[
           { label: 'Total Submissions', value: stats.totalSubmissions, color: 'text-indigo-600 bg-indigo-50' },
           { label: 'Pending Review', value: stats.pendingReview, color: 'text-orange-600 bg-orange-50' },
           { label: 'Active Judges', value: stats.activeJudges, color: 'text-purple-600 bg-purple-50' },
           { label: 'Est. Revenue', value: `$${stats.revenue}`, color: 'text-emerald-600 bg-emerald-50' },
         ].map((stat, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <div className="text-sm font-medium text-slate-500 mb-2">{stat.label}</div>
             <div className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{stat.value}</div>
           </div>
         ))}
       </div>

       {/* Submission Trends */}
       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Submission Trends (Last 7 Days)</h3>
          {stats.submissionTrend.length > 0 && stats.submissionTrend.some(d => d.entries > 0) ? (
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.submissionTrend}>
                     <defs>
                       <linearGradient id="colorAnalytics" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                         <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                     <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                     <Area type="monotone" dataKey="entries" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAnalytics)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              <p>No submission data available for the selected period.</p>
            </div>
          )}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Category Breakdown</h3>
             {stats.categorySplit.length > 0 ? (
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={stats.categorySplit} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} background={{fill: '#f8fafc'}} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
             ) : (
               <div className="h-[300px] flex items-center justify-center text-slate-400">
                 <p>No category data available.</p>
               </div>
             )}
          </div>

          {/* Status Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Status Distribution</h3>
             {stats.statusSplit.length > 0 ? (
               <>
                 <div className="h-[250px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={stats.statusSplit}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={95}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stats.statusSplit.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {stats.statusSplit.map((entry, index) => (
                       <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="text-sm text-slate-600">{entry.name} ({entry.value})</span>
                       </div>
                    ))}
                 </div>
               </>
             ) : (
               <div className="h-[300px] flex items-center justify-center text-slate-400">
                 <p>No status data available.</p>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};
