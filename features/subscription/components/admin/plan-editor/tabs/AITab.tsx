import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';
import { ResourceInput } from '../ResourceInput';

interface AITabProps {
  plan: FullPlanConfig;
  onChange: (updates: Partial<FullPlanConfig>) => void;
}

export const AITab: React.FC<AITabProps> = ({ plan, onChange }) => {
  const handleChange = (key: keyof FullPlanConfig['ai'], value: any) => {
    onChange({ ai: { ...plan.ai, [key]: value } });
  };

  const handleResourceChange = (valKey: keyof FullPlanConfig['ai'], unlKey: keyof FullPlanConfig['ai'], limit: number, unlimited: boolean) => {
    onChange({ ai: { ...plan.ai, [valKey]: limit, [unlKey]: unlimited } });
  };

  return (
    <div className="space-y-8 pb-12">
      <SectionHeader 
        title="AI Configuration" 
        description="Manage access to generative AI features and token limits." 
      />
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ResourceInput
          label="Monthly AI Credits"
          description="High-level abstraction for AI usage."
          limit={plan.ai.aiCredits}
          unlimited={plan.ai.unlimitedAiCredits}
          onChange={(limit, unlimited) => handleResourceChange('aiCredits', 'unlimitedAiCredits', limit, unlimited)}
        />
        <ResourceInput
          label="Daily Request Limit"
          description="Rate limiting for AI API calls."
          limit={plan.ai.dailyRequests}
          unlimited={plan.ai.unlimitedDailyRequests}
          onChange={(limit, unlimited) => handleResourceChange('dailyRequests', 'unlimitedDailyRequests', limit, unlimited)}
        />
        <ResourceInput
          label="Prompt Tokens (Input)"
          description="Max input tokens allowed per month."
          limit={plan.ai.promptTokens}
          unlimited={plan.ai.unlimitedPromptTokens}
          onChange={(limit, unlimited) => handleResourceChange('promptTokens', 'unlimitedPromptTokens', limit, unlimited)}
        />
        <ResourceInput
          label="Completion Tokens (Output)"
          description="Max output tokens allowed per month."
          limit={plan.ai.completionTokens}
          unlimited={plan.ai.unlimitedCompletionTokens}
          onChange={(limit, unlimited) => handleResourceChange('completionTokens', 'unlimitedCompletionTokens', limit, unlimited)}
        />
      </div>

      <div className="mt-8 pt-8 border-t border-slate-200">
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">AI Features</h4>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
          <label className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="mt-0.5">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                checked={plan.ai.aiJudging}
                onChange={(e) => handleChange('aiJudging', e.target.checked)}
              />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Automated AI Judging</h4>
              <p className="text-xs text-slate-500 mt-1">Allow AI models to automatically score submissions based on rubrics.</p>
            </div>
          </label>
          <label className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="mt-0.5">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                checked={plan.ai.aiReviews}
                onChange={(e) => handleChange('aiReviews', e.target.checked)}
              />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">AI Application Reviews</h4>
              <p className="text-xs text-slate-500 mt-1">Generate concise summaries of long applicant answers.</p>
            </div>
          </label>
          <label className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="mt-0.5">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                checked={plan.ai.aiAssistant}
                onChange={(e) => handleChange('aiAssistant', e.target.checked)}
              />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Dashboard AI Assistant</h4>
              <p className="text-xs text-slate-500 mt-1">Chatbot assistant for the admin dashboard.</p>
            </div>
          </label>
          <label className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="mt-0.5">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                checked={plan.ai.aiReports}
                onChange={(e) => handleChange('aiReports', e.target.checked)}
              />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">AI Analytics Reports</h4>
              <p className="text-xs text-slate-500 mt-1">Automatically generated insights and trend reports.</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
