import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';
import { JsonPreview } from '../JsonPreview';

interface AdvancedTabProps {
  plan: FullPlanConfig;
  onChange: (updates: Partial<FullPlanConfig>) => void;
}

export const AdvancedTab: React.FC<AdvancedTabProps> = ({ plan, onChange }) => {
  const handleChange = (key: keyof FullPlanConfig['advanced'], value: any) => {
    onChange({ advanced: { ...plan.advanced, [key]: value } });
  };

  return (
    <div className="space-y-12 pb-12">
      <div className="max-w-3xl space-y-8">
        <SectionHeader 
          title="Advanced Configuration" 
          description="Internal metadata and flags." 
        />
        
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Developer Notes</label>
            <textarea 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none h-24"
              value={plan.advanced.developerNotes}
              onChange={(e) => handleChange('developerNotes', e.target.value)}
              placeholder="Internal notes about this plan configuration..."
            />
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                checked={plan.advanced.experimentalFeatures}
                onChange={(e) => handleChange('experimentalFeatures', e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-700">Enable Experimental Features</span>
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader 
          title="Raw Configuration Payload" 
          description="The complete JSON object representing this plan, ready for the backend API." 
        />
        <JsonPreview data={plan} />
      </div>
    </div>
  );
};
