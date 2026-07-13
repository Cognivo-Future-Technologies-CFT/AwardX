import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MOCK_CURRENT_SUBSCRIPTION, 
  MOCK_PLANS, 
  MOCK_RESOURCE_USAGE, 
  MOCK_USAGE_HISTORY,
  MOCK_INVOICES
} from '../mock/data';
import { 
  PlanBadge, 
  SubscriptionStatusBadge, 
  ResourceCard, 
  UsageBanner, 
  FeatureList, 
  UsageChart, 
  PlanCard,
  InvoiceTable 
} from '../components';
import { Button } from '../../../components/Button';
import { FileText, Database, Bot, Users, CreditCard, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export const SubscriptionPage: React.FC = () => {
  const currentPlan = MOCK_PLANS.find(p => p.id === MOCK_CURRENT_SUBSCRIPTION.planId);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices'>('overview');

  if (!currentPlan) return null;

  const getUsageStatus = () => {
    if (currentPlan.tier === 'ENTERPRISE') return 'UNLIMITED';
    const subResource = currentPlan.resources.find(r => r.key === 'submissions');
    if (subResource?.unlimited) return 'UNLIMITED';
    
    const limit = subResource?.limit ?? 0;
    if (limit === 0) return 'HEALTHY';
    
    const percentSubmissions = (MOCK_RESOURCE_USAGE.submissionsUsed / limit) * 100;
    if (percentSubmissions >= 100) return 'CRITICAL';
    if (percentSubmissions >= 80) return 'WARNING';
    return 'HEALTHY';
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Subscription</h1>
          <p className="text-slate-500 mt-1">Manage your workspace plan, usage, and billing.</p>
        </div>
      </div>

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-8 mb-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-4xl font-extrabold">{currentPlan.name} Plan</h2>
              <PlanBadge tier={currentPlan.tier} className="scale-110 origin-left" />
            </div>
            <div className="flex items-center gap-4 text-slate-300 mt-4">
              <span className="flex items-center gap-2">
                Status: <SubscriptionStatusBadge status={MOCK_CURRENT_SUBSCRIPTION.status} />
              </span>
              <span>•</span>
              <span>Renews on {format(new Date(MOCK_CURRENT_SUBSCRIPTION.currentPeriodEnd), 'MMMM d, yyyy')}</span>
            </div>
          </div>
          <div className="mt-6 md:mt-0">
            <Button variant="primary" className="bg-white text-indigo-900 hover:bg-slate-50 shadow-lg px-6 py-2.5">
              Upgrade Plan
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Usage Banner */}
      <UsageBanner status={getUsageStatus()} className="mb-8" />

      {/* Resource Usage */}
      <div className="mb-12">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Resource Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResourceCard 
            title="Submissions" 
            icon={FileText} 
            used={MOCK_RESOURCE_USAGE.submissionsUsed} 
            total={currentPlan.resources.find(r => r.key === 'submissions')?.unlimited ? 'UNLIMITED' : (currentPlan.resources.find(r => r.key === 'submissions')?.limit ?? 0)} 
          />
          <ResourceCard 
            title="Storage" 
            icon={Database} 
            used={MOCK_RESOURCE_USAGE.storageMbUsed} 
            total={currentPlan.resources.find(r => r.key === 'storage')?.unlimited ? 'UNLIMITED' : (currentPlan.resources.find(r => r.key === 'storage')?.limit ?? 0)} 
          />
          <ResourceCard 
            title="AI Credits" 
            icon={Bot} 
            used={MOCK_RESOURCE_USAGE.aiCreditsUsed} 
            total={currentPlan.ai.unlimitedAiCredits ? 'UNLIMITED' : currentPlan.ai.aiCredits} 
          />
          <ResourceCard 
            title="Team Members" 
            icon={Users} 
            used={MOCK_RESOURCE_USAGE.teamMembersUsed} 
            total={currentPlan.resources.find(r => r.key === 'team')?.unlimited ? 'UNLIMITED' : (currentPlan.resources.find(r => r.key === 'team')?.limit ?? 0)} 
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-8">
        <nav className="flex gap-6">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            Overview & Usage
          </button>
          <button 
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            Billing & Invoices
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-12">
          {/* Usage Chart & Feature Access */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Submissions History</h3>
              <UsageChart data={MOCK_USAGE_HISTORY} />
            </div>
            
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Plan Features</h3>
              <FeatureList features={currentPlan.features} />
            </div>
          </div>

          {/* Plan Comparison */}
          <div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-slate-900">Compare Plans</h3>
              <p className="text-slate-500 mt-2">Find the right plan for your next awards program.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {MOCK_PLANS.map(plan => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan} 
                  isCurrentPlan={plan.id === currentPlan.id} 
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Payment Method</h3>
              <div className="flex items-center gap-3 text-sm text-slate-600 mt-2">
                <CreditCard className="w-5 h-5 text-slate-400" />
                <span>{MOCK_CURRENT_SUBSCRIPTION.paymentMethod?.brand} ending in {MOCK_CURRENT_SUBSCRIPTION.paymentMethod?.last4}</span>
                <span className="text-slate-300">|</span>
                <span>Expires {MOCK_CURRENT_SUBSCRIPTION.paymentMethod?.expMonth}/{MOCK_CURRENT_SUBSCRIPTION.paymentMethod?.expYear}</span>
              </div>
            </div>
            <Button variant="outline">Update Payment Method</Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Invoice History</h3>
            <InvoiceTable invoices={MOCK_INVOICES} />
          </div>
        </div>
      )}
    </div>
  );
};
