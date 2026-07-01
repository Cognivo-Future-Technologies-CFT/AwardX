import React from 'react';
import { Users, Building2, LayoutTemplate, Clock, Award, FolderTree, BookOpen } from 'lucide-react';

interface PlatformOverviewProps {
  kpis: any;
}

export const PlatformOverview: React.FC<PlatformOverviewProps> = ({ kpis }) => {
  if (!kpis) return null;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <KpiCard title="Organizations" value={kpis.totalOrgs} sub={`${kpis.newOrgs30d} new (30d)`} icon={Building2} color="text-indigo-600" bg="bg-indigo-50" />
      <KpiCard title="Total Users" value={kpis.totalUsers} sub={`${kpis.activeUsers30d} active (30d)`} icon={Users} color="text-blue-600" bg="bg-blue-50" />
      <KpiCard title="Active Programs" value={kpis.activePrograms} sub={`out of ${kpis.totalPrograms} total`} icon={LayoutTemplate} color="text-purple-600" bg="bg-purple-50" />
      <KpiCard title="Pending Submissions" value={kpis.pendingSubmissions} sub={`out of ${kpis.totalSubmissions} total`} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
      <KpiCard title="Completed Programs" value={kpis.completedPrograms} sub="Finished & closed" icon={BookOpen} color="text-rose-600" bg="bg-rose-50" />
      <KpiCard title="Total Categories" value={kpis.totalCategories} sub="Platform-wide" icon={FolderTree} color="text-fuchsia-600" bg="bg-fuchsia-50" />
      <KpiCard title="Certificates Issued" value={kpis.totalCertificates} sub="Generated automatically" icon={Award} color="text-emerald-600" bg="bg-emerald-50" />
    </div>
  );
};

const KpiCard = ({ title, value, sub, icon: Icon, color, bg }: any) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
    <div className="flex items-start justify-between mb-2">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
    <div>
      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
      <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">{sub}</p>
    </div>
  </div>
);
