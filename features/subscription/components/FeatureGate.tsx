import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { PlanBadge } from './PlanBadge';
import { UpgradeModal } from './UpgradeModal';
import { Button } from '../../../components/Button';

interface FeatureGateProps {
  feature: string;
  hasAccess: boolean;
  requiredTier?: 'PRO' | 'BUSINESS' | 'ENTERPRISE';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  hasAccess, 
  requiredTier = 'PRO',
  children,
  fallback 
}) => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10" />
        <div className="relative z-20 flex flex-col items-center max-w-sm mx-auto">
          <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center mb-4 text-slate-400">
            <Lock className="w-5 h-5" />
          </div>
          <h4 className="font-semibold text-slate-900 mb-2">Upgrade to unlock {feature}</h4>
          <p className="text-sm text-slate-500 mb-6">
            This feature requires the {requiredTier} plan or higher. Upgrade your workspace to access advanced capabilities.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => setIsUpgradeModalOpen(true)}>
              Upgrade Plan
            </Button>
            <PlanBadge tier={requiredTier} />
          </div>
        </div>
      </div>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        featureName={feature}
      />
    </>
  );
};
