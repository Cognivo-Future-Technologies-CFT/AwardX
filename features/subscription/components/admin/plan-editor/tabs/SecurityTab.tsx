import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';

interface SecurityTabProps {
  plan: FullPlanConfig;
  onChange: (updates: Partial<FullPlanConfig>) => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ plan, onChange }) => {
  const handleChange = (key: keyof FullPlanConfig['security'], value: boolean) => {
    onChange({ security: { ...plan.security, [key]: value } });
  };

  const options = [
    { key: 'mfa', label: 'Multi-Factor Authentication (MFA)', desc: 'Enforce MFA for all team members.' },
    { key: 'sso', label: 'Single Sign-On (SSO)', desc: 'SAML/OIDC enterprise sign-on support.' },
    { key: 'auditTrail', label: 'Audit Trails', desc: 'Detailed compliance logs for organizational changes.' },
    { key: 'ipRestrictions', label: 'IP Restrictions', desc: 'Restrict access to specific IP ranges.' },
    { key: 'apiTokens', label: 'API Tokens', desc: 'Allow generation of long-lived API access tokens.' },
    { key: 'sessionPolicies', label: 'Advanced Session Policies', desc: 'Custom session timeouts and concurrent login limits.' },
    { key: 'advancedPermissions', label: 'Advanced Role Permissions', desc: 'Granular access control mapping.' },
    { key: 'organizationLogs', label: 'Organization Logs Export', desc: 'Ability to export security logs.' },
  ];

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <SectionHeader 
        title="Enterprise Security" 
        description="Configure advanced security and compliance features." 
      />
      
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
        {options.map(opt => (
          <label key={opt.key} className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="mt-0.5">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                checked={plan.security[opt.key as keyof FullPlanConfig['security']]}
                onChange={(e) => handleChange(opt.key as keyof FullPlanConfig['security'], e.target.checked)}
              />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">{opt.label}</h4>
              <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
