import React from 'react';
import { FullPlanConfig } from '../../../../types/settings';
import { PlanCard } from '../../PlanCard';

interface PlanPreviewProps {
  plan: FullPlanConfig;
}

export const PlanPreview: React.FC<PlanPreviewProps> = ({ plan }) => {
  return (
    <div className="flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl">
      <div className="w-full max-w-sm">
        <PlanCard plan={plan} isCurrentPlan={false} />
      </div>
    </div>
  );
};
