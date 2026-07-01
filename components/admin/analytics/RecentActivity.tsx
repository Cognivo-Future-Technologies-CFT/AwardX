import React from 'react';
import { Clock, Building2, UserPlus, FileText, Settings } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export interface ActivityItem {
  id: string;
  type: string;
  text: string;
  time: number;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities = [] }) => {
  const getIconData = (type: string) => {
    switch(type) {
      case 'org': return { icon: Building2, color: 'text-indigo-500', bg: 'bg-indigo-50' };
      case 'user': return { icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'program': return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' };
      default: return { icon: Settings, color: 'text-slate-500', bg: 'bg-slate-100' };
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full max-h-[400px] flex flex-col">
      <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        Recent Activity
      </h3>
      <div className="space-y-6 flex-1 overflow-y-auto pr-2 -mr-2">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No recent activity found</p>
          </div>
        ) : (
          activities.map((activity, idx) => {
            const { icon: Icon, color, bg } = getIconData(activity.type);
            return (
          <div key={activity.id} className="flex gap-4 relative">
            {idx !== activities.length - 1 && (
              <div className="absolute top-8 bottom-[-24px] left-[15px] w-px bg-slate-100" />
            )}
            <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0 z-10`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="pt-1.5">
              <p className="text-sm font-medium text-slate-700 leading-tight">{activity.text}</p>
              <p className="text-[10px] text-slate-400 mt-1">{dayjs(activity.time).fromNow()}</p>
            </div>
          </div>
          );
          })
        )}
      </div>
    </div>
  );
};
