import React from 'react';
import { Check } from 'lucide-react';

interface IntegrationToggleProps {
  name: string;
  enabled: boolean;
  premium: boolean;
  onChange: (enabled: boolean) => void;
}

export const IntegrationToggle: React.FC<IntegrationToggleProps> = ({ name, enabled, premium, onChange }) => {
  return (
    <div 
      className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
        enabled 
          ? 'bg-indigo-50/50 border-indigo-200' 
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
      onClick={() => onChange(!enabled)}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
          enabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
        }`}>
          {name.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">{name}</h4>
          {premium && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider mt-1">
              Premium
            </span>
          )}
        </div>
      </div>
      
      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
        enabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 border border-slate-300'
      }`}>
        {enabled && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </div>
    </div>
  );
};
