import React from 'react';
import { Check } from 'lucide-react';

interface FeatureToggleProps {
  name: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const FeatureToggle: React.FC<FeatureToggleProps> = ({ name, description, enabled, onChange }) => {
  return (
    <div 
      className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
        enabled 
          ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
      onClick={() => onChange(!enabled)}
    >
      <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
        enabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 border border-slate-300'
      }`}>
        {enabled && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </div>
      <div>
        <h4 className={`text-sm font-semibold mb-0.5 ${enabled ? 'text-indigo-900' : 'text-slate-900'}`}>
          {name}
        </h4>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
};
