import React from 'react';
import { Activity, Database, Cloud, Zap } from 'lucide-react';

export const SystemHealth: React.FC = () => {
  const healthMetrics = [
    { name: 'API Status', status: 'Operational', ping: '42ms', icon: Activity, color: 'text-emerald-500' },
    { name: 'Database', status: 'Operational', ping: '12ms', icon: Database, color: 'text-emerald-500' },
    { name: 'Storage Cluster', status: 'Operational', ping: '85ms', icon: Cloud, color: 'text-emerald-500' },
    { name: 'Background Jobs', status: 'Active', ping: '0 pending', icon: Zap, color: 'text-emerald-500' },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Activity className="w-4 h-4 text-indigo-500" />
        System Health
      </h3>
      <div className="space-y-4 flex-1">
        {healthMetrics.map((metric, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
              <div>
                <p className="text-xs font-bold text-slate-900">{metric.name}</p>
                <p className={`text-[10px] font-medium mt-0.5 ${metric.status === 'Operational' || metric.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {metric.status}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
              {metric.ping}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
