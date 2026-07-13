import React, { useState } from 'react';
import { MOCK_PLANS } from '../mock/data';
import { PlanCard } from '../components/PlanCard';
import { Button } from '../../../components/Button';
import { Plus } from 'lucide-react';
import { PlanDrawer } from '../components/admin';
import { FullPlanConfig } from '../types/settings';

export const PlansPage: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FullPlanConfig | null>(null);

  const handleEdit = (plan: FullPlanConfig) => {
    setSelectedPlan(plan);
    setIsDrawerOpen(true);
  };

  const handleCreate = () => {
    // Just clone the free plan as a template for creation for mock purposes
    const newPlan = JSON.parse(JSON.stringify(MOCK_PLANS[0]));
    newPlan.id = `plan_${Math.random().toString(36).substr(2, 9)}`;
    newPlan.name = 'New Plan';
    setSelectedPlan(newPlan);
    setIsDrawerOpen(true);
  };

  const handleSave = (plan: FullPlanConfig) => {
    // In a real app, we would save to the backend. Here we just close the drawer.
    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-slate-500 mt-1">Manage pricing tiers, resource limits, and feature availability.</p>
        </div>
        <Button variant="primary" onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {MOCK_PLANS.map((plan) => (
          <div key={plan.id} className="relative group">
            <PlanCard 
              plan={plan} 
              isCurrentPlan={false}
              onUpgrade={() => handleEdit(plan)}
            />
            {/* Overlay Edit Button for Admin context */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="outline" size="sm" onClick={() => handleEdit(plan)} className="bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white">
                Configure Plan
              </Button>
            </div>
          </div>
        ))}
      </div>

      <PlanDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialPlan={selectedPlan}
        onSave={handleSave}
      />
    </div>
  );
};
