import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';
import { format } from 'date-fns';

interface HistoryTabProps {
  plan: FullPlanConfig;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ plan }) => {
  if (plan.history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">⏳</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">No History Yet</h3>
        <p className="text-sm text-slate-500 max-w-sm">Changes to this plan will appear here once saved.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <SectionHeader 
        title="Activity History" 
        description="Audit log of changes made to this plan." 
      />
      
      <div className="space-y-6">
        {plan.history.map(event => (
          <div key={event.id} className="relative pl-6 border-l-2 border-slate-200">
            <div className="absolute top-0 left-[-5px] w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white" />
            <div className="mb-1 flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">{event.changedBy}</span>
              <span className="text-slate-400 text-xs">{format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}</span>
            </div>
            <p className="text-sm text-slate-600">Updated <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-indigo-600">{event.updated}</span></p>
            <div className="mt-2 text-xs font-mono text-slate-500">
              <span className="line-through opacity-70">{event.oldValue}</span>
              <span className="mx-2">→</span>
              <span className="text-emerald-600 font-semibold">{event.newValue}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
