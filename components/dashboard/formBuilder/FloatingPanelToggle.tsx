import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FloatingPanelToggleProps {
  side: 'left' | 'right';
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export const FloatingPanelToggle: React.FC<FloatingPanelToggleProps> = ({
  side,
  label,
  icon,
  onClick,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    title={`Open ${label}`}
    aria-label={`Open ${label}`}
    data-side={side}
    className={`pointer-events-auto absolute z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-lg shadow-slate-200/60 transition-all hover:border-indigo-300 hover:text-indigo-600 hover:shadow-indigo-500/10 ${side === 'left' ? 'left-3' : 'right-3'} ${className}`}
  >
    {side === 'left' ? (
      <ChevronRight className="h-4 w-4 shrink-0 text-indigo-600" />
    ) : (
      <ChevronLeft className="h-4 w-4 shrink-0 text-indigo-600" />
    )}
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
      {icon}
    </span>
    <span className="hidden sm:inline">{label}</span>
  </button>
);
