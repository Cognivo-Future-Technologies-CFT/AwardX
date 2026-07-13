import React from 'react';
import { PlanTier } from '../types';

interface PlanBadgeProps {
  tier: PlanTier;
  className?: string;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ tier, className = '' }) => {
  const getBadgeStyles = () => {
    switch (tier) {
      case 'FREE':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PRO':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'BUSINESS':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ENTERPRISE':
        return 'bg-slate-900 text-white border-slate-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyles()} ${className}`}>
      {tier}
    </span>
  );
};
