import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { preRegistrationService } from '../../services/preRegistration';

export const AdminAnalytics: React.FC = () => {
  const preRegStatsQuery = useQuery({
    queryKey: ['pre-reg-stats'],
    queryFn: () => preRegistrationService.getStats(),
    staleTime: 60_000,
  });
  const preRegStats = preRegStatsQuery.data;
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Platform Analytics</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Total System Users</h3>
          <p className="text-3xl font-bold text-slate-900">--</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Active Organizations</h3>
          <p className="text-3xl font-bold text-slate-900">--</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Platform Revenue</h3>
          <p className="text-3xl font-bold text-slate-900">--</p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <h2 className="text-xl font-bold text-slate-900 font-display tracking-tight">Pre-Registrations</h2>
      </div>

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

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">More detailed platform charts coming soon.</p>
        </div>
      </div>
    </div>
  );
};
