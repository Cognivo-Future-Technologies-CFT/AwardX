import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';
import { ResourceInput } from '../ResourceInput';

interface ResourcesTabProps {
  plan: FullPlanConfig;
  onChange: (updates: Partial<FullPlanConfig>) => void;
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({ plan, onChange }) => {
  const handleResourceChange = (id: string, limit: number, unlimited: boolean) => {
    const updatedResources = plan.resources.map(r => 
      r.id === id ? { ...r, limit, unlimited } : r
    );
    onChange({ resources: updatedResources });
  };

  const categories = Array.from(new Set(plan.resources.map(r => r.category)));

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader 
        title="Resource Limits" 
        description="Configure hardware and software limits included in this plan." 
      />
      
      {categories.map(category => (
        <div key={category} className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{category}</h4>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {plan.resources.filter(r => r.category === category).map(resource => (
              <ResourceInput
                key={resource.id}
                label={resource.label}
                description={resource.description}
                limit={resource.limit}
                unlimited={resource.unlimited}
                onChange={(limit, unlimited) => handleResourceChange(resource.id, limit, unlimited)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
