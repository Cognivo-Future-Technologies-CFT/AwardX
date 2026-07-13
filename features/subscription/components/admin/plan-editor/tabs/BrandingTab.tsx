import React from 'react';
import { FullPlanConfig } from '../../../../../types/settings';
import { SectionHeader } from '../SectionHeader';

interface BrandingTabProps {
  plan: FullPlanConfig;
  onChange: (updates: Partial<FullPlanConfig>) => void;
}

export const BrandingTab: React.FC<BrandingTabProps> = ({ plan, onChange }) => {
  const handleChange = (key: keyof FullPlanConfig['branding'], value: boolean) => {
    onChange({ branding: { ...plan.branding, [key]: value } });
  };

  const options = [
    { key: 'removeAwardxBranding', label: 'Remove AwardX Branding', desc: 'Hide "Powered by AwardX" badges across the platform.' },
    { key: 'uploadLogo', label: 'Custom Logo Upload', desc: 'Allow organizations to upload their own logo.' },
    { key: 'customColors', label: 'Custom Colors', desc: 'Enable color theme customization for public pages.' },
    { key: 'customEmailTemplates', label: 'Custom Email Templates', desc: 'Full HTML control over system emails.' },
    { key: 'customCertificateBranding', label: 'Certificate Branding', desc: 'Remove system logos from generated certificates.' },
    { key: 'customDomain', label: 'Custom Domain', desc: 'Allow hosting programs on a custom domain (e.g., awards.company.com).' },
    { key: 'landingPageBranding', label: 'Landing Page Branding', desc: 'Advanced customization of the public program landing page.' },
  ];

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <SectionHeader 
        title="White-label & Branding" 
        description="Control how much organizations can customize the look and feel of the platform." 
      />
      
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
        {options.map(opt => (
          <label key={opt.key} className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="mt-0.5">
              <input 
                type="checkbox" 
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                checked={plan.branding[opt.key as keyof FullPlanConfig['branding']]}
                onChange={(e) => handleChange(opt.key as keyof FullPlanConfig['branding'], e.target.checked)}
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
