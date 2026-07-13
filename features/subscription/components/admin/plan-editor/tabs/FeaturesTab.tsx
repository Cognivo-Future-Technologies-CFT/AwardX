import React, { useState } from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';
import { FeatureToggle } from '../FeatureToggle';
import { FeatureCategory } from '../FeatureCategory';
import { Search } from 'lucide-react';

interface FeaturesTabProps {
  plan: FullPlanConfig;
  onChange: (updates: Partial<FullPlanConfig>) => void;
}

export const FeaturesTab: React.FC<FeaturesTabProps> = ({ plan, onChange }) => {
  const [search, setSearch] = useState('');

  const handleFeatureChange = (id: string, enabled: boolean) => {
    const updatedFeatures = plan.features.map(f => 
      f.id === id ? { ...f, enabled } : f
    );
    onChange({ features: updatedFeatures });
  };

  const filteredFeatures = plan.features.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.description?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(filteredFeatures.map(f => f.category)));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <SectionHeader 
          title="Feature Toggles" 
          description="Enable or disable specific features for this plan." 
          className="mb-0"
        />
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search features..." 
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No features found matching "{search}"</div>
        ) : (
          categories.map(category => (
            <FeatureCategory key={category} title={category} defaultExpanded={search.length > 0 || category === 'Core'}>
              {filteredFeatures.filter(f => f.category === category).map(feature => (
                <FeatureToggle
                  key={feature.id}
                  name={feature.name}
                  description={feature.description}
                  enabled={feature.enabled}
                  onChange={(enabled) => handleFeatureChange(feature.id, enabled)}
                />
              ))}
            </FeatureCategory>
          ))
        )}
      </div>
    </div>
  );
};
