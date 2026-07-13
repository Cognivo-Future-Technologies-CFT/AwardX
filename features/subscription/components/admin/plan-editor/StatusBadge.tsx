import React from 'react';
import { PlanStatus } from '../../../../types';

interface StatusBadgeProps {
  status: PlanStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-rose-100 text-rose-700',
    HIDDEN: 'bg-slate-100 text-slate-700'
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${styles[status]}`}>
      {status}
    </span>
  );
};
