import React from 'react';
import { Lightbulb, ArrowUpRight, AlertTriangle } from 'lucide-react';

export const InsightsPanel: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-md text-white relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Lightbulb className="w-32 h-32" />
      </div>
      
      <h3 className="text-sm font-bold mb-6 flex items-center gap-2 relative z-10">
        <Lightbulb className="w-4 h-4 text-indigo-200" />
        AI Automated Insights
      </h3>

      <div className="space-y-4 relative z-10 flex-1">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-400/20 text-emerald-300 rounded-full p-1.5 shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">High Growth Detected</p>
              <p className="text-[11px] text-indigo-100 mt-1 leading-relaxed">
                User registrations are up 42% this week compared to last week. The "Global Tech Awards" program is driving the most traffic.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-start gap-3">
            <div className="bg-amber-400/20 text-amber-300 rounded-full p-1.5 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Low Completion Rate</p>
              <p className="text-[11px] text-indigo-100 mt-1 leading-relaxed">
                3 active programs have a submission drop-off rate of over 60%. Consider reviewing the length of their application forms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
