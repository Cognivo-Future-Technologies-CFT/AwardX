import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';
import { BillingCard } from '../BillingCard';

interface BillingTabProps {
  plan: FullPlanConfig;
  onChange: (updates: Partial<FullPlanConfig>) => void;
}

export const BillingTab: React.FC<BillingTabProps> = ({ plan, onChange }) => {
  const handleChange = (updates: Partial<FullPlanConfig['billing']>) => {
    onChange({ billing: { ...plan.billing, ...updates } });
  };

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <SectionHeader 
        title="Pricing & Billing" 
        description="Manage subscription costs and availability rules." 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <BillingCard 
          title="Monthly Pricing" 
          price={plan.billing.monthlyPrice} 
          cycle="mo" 
          isActive={plan.billing.billingCycle === 'MONTHLY'} 
        />
        <BillingCard 
          title="Annual Pricing" 
          price={plan.billing.annualPrice} 
          cycle="yr" 
          isActive={plan.billing.billingCycle === 'ANNUAL'} 
          description={`Equivalent to $${(plan.billing.annualPrice / 12).toFixed(2)}/mo`}
        />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Monthly Price ($)</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={plan.billing.monthlyPrice}
              onChange={(e) => handleChange({ monthlyPrice: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Annual Price ($)</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={plan.billing.annualPrice}
              onChange={(e) => handleChange({ annualPrice: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Trial Period (Days)</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={plan.billing.trialDays}
              onChange={(e) => handleChange({ trialDays: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Default Billing Cycle</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={plan.billing.billingCycle}
              onChange={(e) => handleChange({ billingCycle: e.target.value as any })}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
              <option value="LIFETIME">Lifetime</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              checked={plan.billing.visible}
              onChange={(e) => handleChange({ visible: e.target.checked })}
            />
            <div>
              <span className="block text-sm font-medium text-slate-900">Visible on Pricing Page</span>
              <span className="block text-xs text-slate-500">Show this plan to unauthenticated users.</span>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              checked={plan.billing.purchasable}
              onChange={(e) => handleChange({ purchasable: e.target.checked })}
            />
            <div>
              <span className="block text-sm font-medium text-slate-900">Purchasable via Checkout</span>
              <span className="block text-xs text-slate-500">Allow users to self-serve upgrade to this plan.</span>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              checked={plan.billing.legacyPlan}
              onChange={(e) => handleChange({ legacyPlan: e.target.checked })}
            />
            <div>
              <span className="block text-sm font-medium text-slate-900">Legacy Plan</span>
              <span className="block text-xs text-slate-500">Grandfathered plan. New users cannot subscribe.</span>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              checked={plan.billing.taxIncluded}
              onChange={(e) => handleChange({ taxIncluded: e.target.checked })}
            />
            <div>
              <span className="block text-sm font-medium text-slate-900">Tax Included</span>
              <span className="block text-xs text-slate-500">Price displayed includes regional taxes.</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
