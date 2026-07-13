import React, { useState, useEffect, useCallback } from 'react';
import { Drawer } from '../../../../../components/Drawer';
import { FullPlanConfig } from '../../../types/settings';
import { PlanTabs, TABS } from './PlanTabs';
import { Button } from '../../../../../components/Button';
import { PlanBadge } from '../../PlanBadge';
import { StatusBadge } from './StatusBadge';
import {
  GeneralTab, ResourcesTab, FeaturesTab, IntegrationsTab,
  BrandingTab, SecurityTab, BillingTab, AITab,
  PreviewTab, AdvancedTab, HistoryTab
} from './tabs';

interface PlanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan: FullPlanConfig | null;
  onSave: (plan: FullPlanConfig) => void;
}

export const PlanDrawer: React.FC<PlanDrawerProps> = ({ isOpen, onClose, initialPlan, onSave }) => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [plan, setPlan] = useState<FullPlanConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && initialPlan) {
      setPlan(JSON.parse(JSON.stringify(initialPlan))); // Deep copy
      setHasChanges(false);
      setActiveTab(TABS[0].id);
    }
  }, [isOpen, initialPlan]);

  const handleUpdate = useCallback((updates: Partial<FullPlanConfig>) => {
    setPlan(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
    setHasChanges(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && plan) {
          onSave(plan);
          setHasChanges(false);
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, plan, onSave]);

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!plan) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={`Configure ${plan.name} Plan`}
      width="max-w-[1200px]" // Use a massive drawer (approx 6xl)
    >
      <div className="flex flex-col h-full bg-slate-50">
        {/* Sticky Header Additions */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <PlanBadge tier={plan.tier} />
            <StatusBadge status={plan.status} />
            <span className="text-sm font-semibold text-slate-700 ml-4">${plan.billing.monthlyPrice}/mo</span>
            {hasChanges && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Unsaved Changes</span>}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { onSave(plan); setHasChanges(false); }}
              disabled={!hasChanges}
            >
              Save Configuration
            </Button>
          </div>
        </div>

        <PlanTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto">
            {activeTab === 'general' && <GeneralTab plan={plan} onChange={handleUpdate} />}
            {activeTab === 'resources' && <ResourcesTab plan={plan} onChange={handleUpdate} />}
            {activeTab === 'features' && <FeaturesTab plan={plan} onChange={handleUpdate} />}
            {activeTab === 'integrations' && <IntegrationsTab plan={plan} onChange={handleUpdate} />}
            {activeTab === 'branding' && <BrandingTab plan={plan} onChange={handleUpdate} />}
            {activeTab === 'security' && <SecurityTab plan={plan} onChange={handleUpdate} />}
            {activeTab === 'billing' && <BillingTab plan={plan} onChange={handleUpdate} />}
            {activeTab === 'ai' && <AITab plan={plan} onChange={handleUpdate} />}
            {activeTab === 'preview' && <PreviewTab plan={plan} />}
            {activeTab === 'advanced' && <AdvancedTab plan={plan} onChange={handleUpdate} />}
            {activeTab === 'history' && <HistoryTab plan={plan} />}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
