import React from 'react';
import { UsageStatus } from '../types';
import { AlertTriangle, AlertCircle, CheckCircle2, Infinity } from 'lucide-react';

interface UsageBannerProps {
  status: UsageStatus;
  className?: string;
}

export const UsageBanner: React.FC<UsageBannerProps> = ({ status, className = '' }) => {
  const config = {
    HEALTHY: {
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconColor: 'text-emerald-500',
      title: 'Healthy Usage',
      description: 'Your workspace is well within its limits. You have plenty of resources available.'
    },
    WARNING: {
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      iconColor: 'text-amber-500',
      title: 'Approaching Limits',
      description: 'You have consumed over 80% of some resources. Consider upgrading soon to avoid interruption.'
    },
    CRITICAL: {
      icon: AlertCircle,
      color: 'bg-rose-50 text-rose-800 border-rose-200',
      iconColor: 'text-rose-500',
      title: 'Limit Reached',
      description: 'You have reached or exceeded your plan limits. Action may be restricted until you upgrade.'
    },
    UNLIMITED: {
      icon: Infinity,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      iconColor: 'text-indigo-500',
      title: 'Unlimited Resources',
      description: 'Enjoy unlimited resources on your Enterprise plan.'
    }
  };

  const { icon: Icon, color, iconColor, title, description } = config[status];

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${color} ${className}`}>
      <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${iconColor}`} />
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm opacity-90">{description}</p>
      </div>
    </div>
  );
};
