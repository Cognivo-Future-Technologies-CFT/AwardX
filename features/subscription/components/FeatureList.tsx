import React from 'react';
import { PlanFeature } from '../types';
import { Check, X } from 'lucide-react';

interface FeatureListProps {
  features: PlanFeature[];
  className?: string;
}

export const FeatureList: React.FC<FeatureListProps> = ({ features, className = '' }) => {
  return (
    <ul className={`space-y-3 ${className}`}>
      {features.map((feature) => (
        <li key={feature.id} className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {feature.included ? (
              <div className="p-0.5 bg-emerald-100 rounded-full text-emerald-600">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
            ) : (
              <div className="p-0.5 bg-slate-100 rounded-full text-slate-400">
                <X className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
            )}
          </div>
          <span className={`text-sm ${feature.included ? 'text-slate-700' : 'text-slate-500 line-through decoration-slate-300'}`}>
            {feature.name}
          </span>
        </li>
      ))}
    </ul>
  );
};
