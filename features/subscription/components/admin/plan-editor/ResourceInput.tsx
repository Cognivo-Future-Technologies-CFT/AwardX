import React from 'react';
import { Infinity } from 'lucide-react';
import { UnlimitedToggle } from './UnlimitedToggle';

interface ResourceInputProps {
  label: string;
  description: string;
  limit: number;
  unlimited: boolean;
  onChange: (limit: number, unlimited: boolean) => void;
}

export const ResourceInput: React.FC<ResourceInputProps> = ({ label, description, limit, unlimited, onChange }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 text-sm truncate">{label}</h4>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative w-32">
          {unlimited ? (
            <div className="w-full h-10 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-2 text-slate-500 font-semibold cursor-not-allowed">
              <Infinity className="w-4 h-4" />
              <span>Unlimited</span>
            </div>
          ) : (
            <input 
              type="number"
              className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-slate-900 font-medium"
              value={limit}
              onChange={(e) => onChange(parseInt(e.target.value) || 0, false)}
              min={0}
            />
          )}
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Unlimited</span>
          <UnlimitedToggle 
            isUnlimited={unlimited} 
            onChange={(val) => onChange(limit, val)}
          />
        </div>
      </div>
    </div>
  );
};
