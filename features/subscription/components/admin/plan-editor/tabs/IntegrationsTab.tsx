import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';
import { IntegrationToggle } from '../IntegrationToggle';

interface IntegrationsTabProps {
  plan: FullPlanConfig;
  onChange: (updates: Partial<FullPlanConfig>) => void;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({ plan, onChange }) => {
  const handleIntegrationChange = (id: string, enabled: boolean) => {
    const updatedIntegrations = plan.integrations.map(i => 
      i.id === id ? { ...i, enabled } : i
    );
    onChange({ integrations: updatedIntegrations });
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      <SectionHeader 
        title="Third-Party Integrations" 
        description="Manage which external tools are available to users on this plan." 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plan.integrations.map(integration => (
          <IntegrationToggle
            key={integration.id}
            name={integration.name}
            enabled={integration.enabled}
            premium={integration.premium}
            onChange={(enabled) => handleIntegrationChange(integration.id, enabled)}
          />
        ))}
      </div>
    </div>
  );
};
