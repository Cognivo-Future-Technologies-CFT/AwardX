import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { PlanPreview } from '../PlanPreview';

interface PreviewTabProps {
  plan: FullPlanConfig;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({ plan }) => {
  return (
    <div className="space-y-8 pb-12">
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-900">Live Preview</h3>
        <p className="text-sm text-slate-500 mt-1">This is how the plan will appear to customers on the pricing page.</p>
      </div>
      
      <PlanPreview plan={plan} />
    </div>
  );
};
