import React from 'react';
import { Plan } from '../types';
import { Button } from '../../../components/Button';
import { FeatureList } from './FeatureList';
import { motion } from 'framer-motion';

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan: boolean;
  onUpgrade?: (planId: string) => void;
  className?: string;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, isCurrentPlan, onUpgrade, className = '' }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col bg-white rounded-2xl p-6 border ${plan.isRecommended ? 'border-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-200 shadow-sm'} ${className}`}
    >
      {plan.isRecommended && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          Recommended
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
        <p className="text-sm text-slate-500 h-10">{plan.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-extrabold text-slate-900">${plan.billing.monthlyPrice}</span>
          <span className="text-slate-500 pb-1">/mo</span>
        </div>
        {plan.billing.monthlyPrice > 0 && (
          <p className="text-xs text-slate-400 mt-1">or ${plan.billing.annualPrice}/yr (Save 20%)</p>
        )}
      </div>

      <div className="mb-8 flex-1">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Core Limits</div>
        <ul className="text-sm text-slate-600 space-y-2 mb-6">
          {plan.resources.slice(0, 4).map(res => (
            <li key={res.id}>• {res.unlimited ? 'Unlimited' : res.limit} {res.label}</li>
          ))}
        </ul>
        
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Features</div>
        <FeatureList features={plan.features.filter(f => f.enabled).slice(0, 5)} />
      </div>

      <Button 
        variant={isCurrentPlan ? 'outline' : (plan.isRecommended ? 'primary' : 'outline')}
        className="w-full justify-center"
        disabled={isCurrentPlan}
        onClick={() => onUpgrade?.(plan.id)}
      >
        {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
      </Button>
    </motion.div>
  );
};
