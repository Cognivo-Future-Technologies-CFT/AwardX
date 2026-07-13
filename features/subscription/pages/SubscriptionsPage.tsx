import React, { useState } from 'react';
import { MOCK_ALL_ORGANIZATIONS_SUBSCRIPTIONS } from '../mock/data';
import { PlanBadge, SubscriptionStatusBadge } from '../components';
import { Button } from '../../../components/Button';
import { Search, Filter, MoreVertical, CreditCard, Building2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export const SubscriptionsPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const stats = [
    { label: 'Active Subscriptions', value: '342', icon: Building2, trend: '+12%' },
    { label: 'Monthly Recurring Revenue', value: '$12,450', icon: TrendingUp, trend: '+5.4%' },
    { label: 'Total Enterprise', value: '18', icon: CreditCard, trend: '+2' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-slate-500 mt-1">Monitor organization plans and platform revenue.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search organizations..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 shrink-0">
            <Filter className="w-4 h-4" /> Filter
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Organization</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Status</th>
                <th className="p-4">Submissions Usage</th>
                <th className="p-4">Renewal Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_ALL_ORGANIZATIONS_SUBSCRIPTIONS.map((item) => (
                <tr key={item.organization.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <span className="font-semibold text-slate-900">{item.organization.name}</span>
                  </td>
                  <td className="p-4">
                    <PlanBadge tier={item.subscription.tier} />
                  </td>
                  <td className="p-4">
                    <SubscriptionStatusBadge status={item.subscription.status} />
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500" 
                          style={{ width: item.subscription.tier === 'ENTERPRISE' ? '0%' : `${Math.min(100, (item.usage.submissionsUsed / 1000) * 100)}%` }} 
                        />
                      </div>
                      <span className="text-slate-600">{item.usage.submissionsUsed}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {format(new Date(item.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
          <span>Showing 1 to {MOCK_ALL_ORGANIZATIONS_SUBSCRIPTIONS.length} of 342 organizations</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
