import React from 'react';
import { Modal } from '../../../components/Modal';
import { MOCK_PLANS } from '../mock/data';
import { PlanCard } from './PlanCard';
import { toast } from 'sonner';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, featureName }) => {
  const handleUpgrade = (planId: string) => {
    toast.success(`Mock: Successfully initiated upgrade to ${planId}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" title="Upgrade Your Plan">
      <div className="p-6 md:p-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            {featureName ? `Unlock ${featureName}` : 'Scale your operations'}
          </h2>
          <p className="text-slate-500">
            {featureName 
              ? `You need to upgrade your workspace to access ${featureName}. Choose a plan that fits your needs.`
              : 'Choose a plan that fits your needs. You can always change it later.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_PLANS.filter(p => p.tier !== 'FREE' && p.tier !== 'ENTERPRISE').map(plan => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              isCurrentPlan={false} // In a real app, determine this from context
              onUpgrade={handleUpgrade}
            />
          ))}
          {MOCK_PLANS.filter(p => p.tier === 'ENTERPRISE').map(plan => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              isCurrentPlan={false}
              onUpgrade={() => toast.success('Mock: Opening contact sales form')}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
};
