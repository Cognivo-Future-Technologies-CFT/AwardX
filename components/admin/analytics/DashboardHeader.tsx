import React from 'react';
import { Calendar, Download, RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  timeframe: string;
  onChangeTimeframe: (tf: string) => void;
  onExport: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ timeframe, onChangeTimeframe, onExport }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Super Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform overview, growth, and system health.</p>
      </div>
      <div className="flex items-center gap-3">
        <select 
          value={timeframe}
          onChange={(e) => onChangeTimeframe(e.target.value)}
          className="bg-white border border-slate-200 text-sm rounded-xl px-4 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">This Year</option>
          <option value="all">All Time</option>
        </select>
        <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm" title="Refresh Data">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button 
          onClick={onExport}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );
};
