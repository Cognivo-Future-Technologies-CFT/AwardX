import React from 'react';
import { ResourceProgress } from './ResourceProgress';
import { LucideIcon } from 'lucide-react';

interface ResourceCardProps {
  title: string;
  icon: LucideIcon;
  used: number;
  total: number | 'UNLIMITED';
  className?: string;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ title, icon: Icon, used, total, className = '' }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <ResourceProgress used={used} total={total} />
    </div>
  );
};
