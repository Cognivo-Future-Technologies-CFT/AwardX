import React from 'react';
import { motion } from 'framer-motion';

interface ResourceProgressProps {
  used: number;
  total: number | 'UNLIMITED';
  className?: string;
}

export const ResourceProgress: React.FC<ResourceProgressProps> = ({ used, total, className = '' }) => {
  const isUnlimited = total === 'UNLIMITED';
  const percentage = isUnlimited ? 0 : Math.min(100, Math.max(0, (used / (total as number)) * 100));
  
  let colorClass = 'bg-indigo-600';
  if (!isUnlimited) {
    if (percentage >= 100) colorClass = 'bg-rose-600';
    else if (percentage >= 80) colorClass = 'bg-amber-500';
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs font-medium mb-1.5">
        <span className="text-slate-700">{used.toLocaleString()} used</span>
        <span className="text-slate-500">
          {isUnlimited ? 'Unlimited' : `${(total as number).toLocaleString()} limit`}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        {isUnlimited ? (
          <div className="h-full w-full bg-emerald-500 rounded-full opacity-50" />
        ) : (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full ${colorClass}`}
          />
        )}
      </div>
    </div>
  );
};
