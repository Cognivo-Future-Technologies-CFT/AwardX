import React from 'react';
import { motion } from 'framer-motion';
import { MOCK_CURRENT_SUBSCRIPTION, MOCK_PLANS, MOCK_RESOURCE_USAGE } from '../mock/data';
import { ResourceProgress } from './ResourceProgress';
import { PlanBadge } from './PlanBadge';
import { Button } from '../../../components/Button';
import { CreditCard, ChevronRight } from 'lucide-react';

interface UsageWidgetProps {
  onNavigate?: (view: string) => void;
}

export const UsageWidget: React.FC<UsageWidgetProps> = ({ onNavigate }) => {
  const currentPlan = MOCK_PLANS.find(p => p.id === MOCK_CURRENT_SUBSCRIPTION.planId);
  
  if (!currentPlan) return null;

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm cursor-pointer group"
      onClick={() => onNavigate?.('subscription')}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-slate-900 text-sm">Plan & Usage</h3>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-semibold text-slate-700">Current Plan</span>
        <PlanBadge tier={currentPlan.tier} />
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1 font-medium text-slate-600">
            <span>Submissions</span>
          </div>
          <ResourceProgress 
            used={MOCK_RESOURCE_USAGE.submissionsUsed} 
            total={currentPlan.resources.find(r => r.key === 'submissions')?.unlimited ? 'UNLIMITED' : (currentPlan.resources.find(r => r.key === 'submissions')?.limit ?? 0)} 
          />
        </div>
        
        <div>
          <div className="flex justify-between text-xs mb-1 font-medium text-slate-600">
            <span>Storage</span>
          </div>
          <ResourceProgress 
            used={MOCK_RESOURCE_USAGE.storageMbUsed} 
            total={currentPlan.resources.find(r => r.key === 'storage')?.unlimited ? 'UNLIMITED' : (currentPlan.resources.find(r => r.key === 'storage')?.limit ?? 0)} 
          />
        </div>
      </div>

      <Button 
        variant="primary" 
        className="w-full justify-center text-xs"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate?.('subscription');
        }}
      >
        View Subscription
      </Button>
    </motion.div>
  );
};
