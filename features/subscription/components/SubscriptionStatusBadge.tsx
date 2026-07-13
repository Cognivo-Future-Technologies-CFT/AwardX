import React from 'react';
import { SubscriptionStatus } from '../types';

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
  className?: string;
}

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyles = () => {
    switch (status) {
      case 'ACTIVE':
      case 'TRIALING':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PAST_DUE':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'CANCELED':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyles()} ${className}`}>
      {status}
    </span>
  );
};
