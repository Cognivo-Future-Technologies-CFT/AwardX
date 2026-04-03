import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-slate-400" />
    </div>
    <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6">{description}</p>
    {(action || secondaryAction) && (
      <div className="flex flex-wrap gap-3 justify-center">
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    )}
  </div>
);
