import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { DashboardHeader } from './analytics/DashboardHeader';
import { PlatformOverview } from './analytics/PlatformOverview';
import { GrowthCharts } from './analytics/GrowthCharts';
import { OrgLeaderboard } from './analytics/OrgLeaderboard';
import { SubmissionBreakdown } from './analytics/SubmissionBreakdown';
import { ProgramsByCategory } from './analytics/ProgramsByCategory';
import { SystemHealth } from './analytics/SystemHealth';
import { RecentActivity } from './analytics/RecentActivity';
import { InsightsPanel } from './analytics/InsightsPanel';
import { Loader2 } from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const [timeframe, setTimeframe] = React.useState('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-analytics', timeframe],
    queryFn: () => adminService.getSuperAdminAnalytics(timeframe),
    staleTime: 60_000,
  });

  const handleExport = () => {
    if (!data) return;
    
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', data.kpis.totalUsers],
      ['Active Users (30d)', data.kpis.activeUsers30d],
      ['Total Organizations', data.kpis.totalOrgs],
      ['New Organizations (30d)', data.kpis.newOrgs30d],
      ['Total Programs', data.kpis.totalPrograms],
      ['Active Programs', data.kpis.activePrograms],
      ['Total Submissions', data.kpis.totalSubmissions],
      ['Pending Submissions', data.kpis.pendingSubmissions],
      ['Completed Programs', data.kpis.completedPrograms],
      ['Total Certificates', data.kpis.totalCertificates],
      [],
      ['Recent Organizations', 'Plan', 'Created At'],
      ...data.recentOrgs.map((org: any) => [
        `"${(org.name || 'Unknown').replace(/"/g, '""')}"`,
        org.plan || 'starter',
        org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'
      ])
    ];

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `platform_analytics_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p className="font-medium">Loading comprehensive analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="pb-12 max-w-7xl mx-auto">
      <DashboardHeader 
        timeframe={timeframe}
        onChangeTimeframe={setTimeframe}
        onExport={handleExport}
      />
      
      <PlatformOverview kpis={data.kpis} />

      {/* Main Charts & Leaderboard Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <GrowthCharts data={data.charts.growthData} />
        <OrgLeaderboard orgs={data.recentOrgs} />
      </div>

      {/* Breakdown Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ProgramsByCategory data={data.charts.programsByCategory} />
        <SubmissionBreakdown data={data.charts.submissionsByStatus} />
      </div>

      {/* Operational Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SystemHealth />
        <RecentActivity activities={data.recentActivity} />
        <InsightsPanel />
      </div>
    </div>
  );
};
