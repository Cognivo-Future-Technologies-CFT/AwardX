import React, { useState } from 'react';
import { Trophy, TrendingUp, Building2, ExternalLink, X } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

interface OrgLeaderboardProps {
  orgs: any[];
}

export const OrgLeaderboard: React.FC<OrgLeaderboardProps> = ({ orgs }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!orgs || orgs.length === 0) return null;

  const displayOrgs = isExpanded ? orgs : orgs.slice(0, 8);

  const renderOrgItem = (org: any, i: number) => (
    <div key={org.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 relative overflow-hidden">
          {org.name ? org.name.charAt(0).toUpperCase() : <Building2 className="w-4 h-4" />}
          {i < 3 && (
            <div className={`absolute bottom-0 inset-x-0 h-1 ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-300' : 'bg-amber-600'}`} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate pr-4">{org.name || 'Unnamed Org'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500">{org.plan || 'Free'} Plan</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-[10px] text-slate-500 truncate">Joined {org.created_at ? dayjs(org.created_at).fromNow() : 'recently'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900">Active</p>
          <p className="text-[10px] text-emerald-600 flex items-center justify-end gap-0.5 mt-0.5">
            <TrendingUp className="w-3 h-3" /> +12%
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100" />
      </div>
    </div>
  );

  return (
    <>
      {/* Normal Card View */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm col-span-1 lg:col-span-1 flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Top Organizations
          </h3>
          <button onClick={() => setIsExpanded(true)} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700">View All</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
          {displayOrgs.map(renderOrgItem)}
        </div>
      </div>

      {/* Expanded Modal View */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsExpanded(false)} />
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                All Organizations ({orgs.length})
              </h3>
              <button onClick={() => setIsExpanded(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
              {orgs.map(renderOrgItem)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
