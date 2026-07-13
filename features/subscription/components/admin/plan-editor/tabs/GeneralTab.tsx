import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';

interface GeneralTabProps {
  plan: FullPlanConfig;
  onChange: (updates: Partial<FullPlanConfig>) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ plan, onChange }) => {
  return (
    <div className="max-w-3xl space-y-8">
      <SectionHeader 
        title="General Information" 
        description="Basic details and identity for this plan." 
      />
      
      <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Name</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={plan.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Internal Identifier</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              value={plan.advanced.internalIdentifier}
              disabled
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
          <textarea 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none h-24"
            value={plan.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={plan.status}
              onChange={(e) => onChange({ status: e.target.value as any })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="HIDDEN">Hidden</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Badge Color</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={plan.color}
              onChange={(e) => onChange({ color: e.target.value })}
            >
              <option value="slate">Slate (Default)</option>
              <option value="indigo">Indigo (Pro)</option>
              <option value="purple">Purple (Business)</option>
              <option value="emerald">Emerald</option>
              <option value="rose">Rose</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Display Order</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={plan.displayOrder}
              onChange={(e) => onChange({ displayOrder: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 space-y-4">
          <label className="flex items-center gap-3">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              checked={plan.isPopular}
              onChange={(e) => onChange({ isPopular: e.target.checked })}
            />
            <span className="text-sm font-medium text-slate-700">Mark as Popular Plan</span>
          </label>
          <label className="flex items-center gap-3">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              checked={plan.isRecommended}
              onChange={(e) => onChange({ isRecommended: e.target.checked })}
            />
            <span className="text-sm font-medium text-slate-700">Mark as Recommended Plan</span>
          </label>
        </div>
      </div>
    </div>
  );
};
