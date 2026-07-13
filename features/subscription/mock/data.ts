import { Subscription, UsageRecord, UsageHistoryPoint, Invoice } from '../types';
import { FullPlanConfig } from '../types/settings';

export const MOCK_PLANS: FullPlanConfig[] = [
  {
    id: 'plan_free',
    tier: 'FREE',
    name: 'Free',
    description: 'Perfect for small events and testing.',
    status: 'ACTIVE',
    color: 'slate',
    icon: 'Package',
    isPopular: false,
    isRecommended: false,
    displayOrder: 1,
    resources: [
      { id: 'res_1', key: 'submissions', label: 'Submissions', description: 'Max submissions per program', limit: 50, unlimited: false, category: 'Core' },
      { id: 'res_2', key: 'programs', label: 'Programs', description: 'Active programs', limit: 1, unlimited: false, category: 'Core' },
      { id: 'res_3', key: 'awards', label: 'Awards', description: 'Total awards', limit: 3, unlimited: false, category: 'Core' },
      { id: 'res_4', key: 'storage', label: 'Storage', description: 'File storage (MB)', limit: 500, unlimited: false, category: 'Infrastructure' },
      { id: 'res_5', key: 'team', label: 'Team Members', description: 'Admin users', limit: 2, unlimited: false, category: 'Core' }
    ],
    features: [
      { id: 'feat_1', category: 'Core', name: 'Basic Forms', description: 'Standard form builder', enabled: true },
      { id: 'feat_2', category: 'Core', name: 'Basic Analytics', description: 'Simple dashboard', enabled: true },
      { id: 'feat_3', category: 'Branding', name: 'Custom Branding', description: 'Remove AwardX logo', enabled: false },
      { id: 'feat_4', category: 'Security', name: 'Audit Logs', description: 'System audit trails', enabled: false },
    ],
    integrations: [
      { id: 'int_1', name: 'Stripe', enabled: false, premium: true },
      { id: 'int_2', name: 'Slack', enabled: true, premium: false },
    ],
    branding: {
      removeAwardxBranding: false, uploadLogo: false, customColors: false, customEmailTemplates: false, customCertificateBranding: false, customDomain: false, landingPageBranding: false
    },
    security: {
      mfa: false, sso: false, auditTrail: false, ipRestrictions: false, apiTokens: false, sessionPolicies: false, advancedPermissions: false, organizationLogs: false
    },
    billing: {
      monthlyPrice: 0, annualPrice: 0, trialDays: 0, billingCycle: 'MONTHLY', visible: true, purchasable: true, legacyPlan: false, taxIncluded: true
    },
    ai: {
      aiCredits: 0, unlimitedAiCredits: false, dailyRequests: 0, unlimitedDailyRequests: false, promptTokens: 0, unlimitedPromptTokens: false, completionTokens: 0, unlimitedCompletionTokens: false, aiJudging: false, aiReviews: false, aiAssistant: false, aiReports: false
    },
    advanced: { developerNotes: '', internalIdentifier: 'free-v1', featureFlags: [], experimentalFeatures: false, metadata: {} },
    history: []
  },
  {
    id: 'plan_pro',
    tier: 'PRO',
    name: 'Pro',
    description: 'For growing organizations.',
    status: 'ACTIVE',
    color: 'indigo',
    icon: 'Zap',
    isPopular: false,
    isRecommended: true,
    displayOrder: 2,
    resources: [
      { id: 'res_1', key: 'submissions', label: 'Submissions', description: 'Max submissions per program', limit: 1000, unlimited: false, category: 'Core' },
      { id: 'res_2', key: 'programs', label: 'Programs', description: 'Active programs', limit: 5, unlimited: false, category: 'Core' },
      { id: 'res_3', key: 'awards', label: 'Awards', description: 'Total awards', limit: 20, unlimited: false, category: 'Core' },
      { id: 'res_4', key: 'storage', label: 'Storage', description: 'File storage (MB)', limit: 10240, unlimited: false, category: 'Infrastructure' },
      { id: 'res_5', key: 'team', label: 'Team Members', description: 'Admin users', limit: 10, unlimited: false, category: 'Core' }
    ],
    features: [
      { id: 'feat_1', category: 'Core', name: 'Basic Forms', description: 'Standard form builder', enabled: true },
      { id: 'feat_2', category: 'Core', name: 'Advanced Analytics', description: 'Detailed reports', enabled: true },
      { id: 'feat_3', category: 'Branding', name: 'Custom Branding', description: 'Remove AwardX logo', enabled: true },
      { id: 'feat_4', category: 'Security', name: 'Audit Logs', description: 'System audit trails', enabled: false },
    ],
    integrations: [
      { id: 'int_1', name: 'Stripe', enabled: true, premium: true },
      { id: 'int_2', name: 'Slack', enabled: true, premium: false },
    ],
    branding: {
      removeAwardxBranding: true, uploadLogo: true, customColors: true, customEmailTemplates: false, customCertificateBranding: false, customDomain: false, landingPageBranding: true
    },
    security: {
      mfa: true, sso: false, auditTrail: false, ipRestrictions: false, apiTokens: false, sessionPolicies: false, advancedPermissions: false, organizationLogs: false
    },
    billing: {
      monthlyPrice: 99, annualPrice: 990, trialDays: 14, billingCycle: 'MONTHLY', visible: true, purchasable: true, legacyPlan: false, taxIncluded: true
    },
    ai: {
      aiCredits: 100, unlimitedAiCredits: false, dailyRequests: 50, unlimitedDailyRequests: false, promptTokens: 100000, unlimitedPromptTokens: false, completionTokens: 50000, unlimitedCompletionTokens: false, aiJudging: true, aiReviews: true, aiAssistant: false, aiReports: false
    },
    advanced: { developerNotes: '', internalIdentifier: 'pro-v1', featureFlags: [], experimentalFeatures: false, metadata: {} },
    history: []
  },
  {
    id: 'plan_business',
    tier: 'BUSINESS',
    name: 'Business',
    description: 'Advanced tools for large programs.',
    status: 'ACTIVE',
    color: 'purple',
    icon: 'Briefcase',
    isPopular: true,
    isRecommended: false,
    displayOrder: 3,
    resources: [
      { id: 'res_1', key: 'submissions', label: 'Submissions', description: 'Max submissions per program', limit: 5000, unlimited: false, category: 'Core' },
      { id: 'res_2', key: 'programs', label: 'Programs', description: 'Active programs', limit: 20, unlimited: false, category: 'Core' },
      { id: 'res_3', key: 'awards', label: 'Awards', description: 'Total awards', limit: 100, unlimited: false, category: 'Core' },
      { id: 'res_4', key: 'storage', label: 'Storage', description: 'File storage (MB)', limit: 51200, unlimited: false, category: 'Infrastructure' },
      { id: 'res_5', key: 'team', label: 'Team Members', description: 'Admin users', limit: 50, unlimited: false, category: 'Core' }
    ],
    features: [
      { id: 'feat_1', category: 'Core', name: 'Basic Forms', description: 'Standard form builder', enabled: true },
      { id: 'feat_2', category: 'Core', name: 'Advanced Analytics', description: 'Detailed reports', enabled: true },
      { id: 'feat_3', category: 'Branding', name: 'Custom Branding', description: 'Remove AwardX logo', enabled: true },
      { id: 'feat_4', category: 'Security', name: 'Audit Logs', description: 'System audit trails', enabled: true },
    ],
    integrations: [
      { id: 'int_1', name: 'Stripe', enabled: true, premium: true },
      { id: 'int_2', name: 'Slack', enabled: true, premium: false },
    ],
    branding: {
      removeAwardxBranding: true, uploadLogo: true, customColors: true, customEmailTemplates: true, customCertificateBranding: true, customDomain: true, landingPageBranding: true
    },
    security: {
      mfa: true, sso: false, auditTrail: true, ipRestrictions: false, apiTokens: true, sessionPolicies: true, advancedPermissions: true, organizationLogs: true
    },
    billing: {
      monthlyPrice: 299, annualPrice: 2990, trialDays: 14, billingCycle: 'MONTHLY', visible: true, purchasable: true, legacyPlan: false, taxIncluded: true
    },
    ai: {
      aiCredits: 500, unlimitedAiCredits: false, dailyRequests: 200, unlimitedDailyRequests: false, promptTokens: 500000, unlimitedPromptTokens: false, completionTokens: 250000, unlimitedCompletionTokens: false, aiJudging: true, aiReviews: true, aiAssistant: true, aiReports: true
    },
    advanced: { developerNotes: '', internalIdentifier: 'biz-v1', featureFlags: [], experimentalFeatures: true, metadata: {} },
    history: []
  },
  {
    id: 'plan_enterprise',
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Custom solutions for maximum scale.',
    status: 'ACTIVE',
    color: 'slate',
    icon: 'Shield',
    isPopular: false,
    isRecommended: false,
    displayOrder: 4,
    resources: [
      { id: 'res_1', key: 'submissions', label: 'Submissions', description: 'Max submissions per program', limit: 0, unlimited: true, category: 'Core' },
      { id: 'res_2', key: 'programs', label: 'Programs', description: 'Active programs', limit: 0, unlimited: true, category: 'Core' },
      { id: 'res_3', key: 'awards', label: 'Awards', description: 'Total awards', limit: 0, unlimited: true, category: 'Core' },
      { id: 'res_4', key: 'storage', label: 'Storage', description: 'File storage (MB)', limit: 0, unlimited: true, category: 'Infrastructure' },
      { id: 'res_5', key: 'team', label: 'Team Members', description: 'Admin users', limit: 0, unlimited: true, category: 'Core' }
    ],
    features: [
      { id: 'feat_1', category: 'Core', name: 'Basic Forms', description: 'Standard form builder', enabled: true },
      { id: 'feat_2', category: 'Core', name: 'Advanced Analytics', description: 'Detailed reports', enabled: true },
      { id: 'feat_3', category: 'Branding', name: 'Custom Branding', description: 'Remove AwardX logo', enabled: true },
      { id: 'feat_4', category: 'Security', name: 'Audit Logs', description: 'System audit trails', enabled: true },
    ],
    integrations: [
      { id: 'int_1', name: 'Stripe', enabled: true, premium: true },
      { id: 'int_2', name: 'Slack', enabled: true, premium: false },
    ],
    branding: {
      removeAwardxBranding: true, uploadLogo: true, customColors: true, customEmailTemplates: true, customCertificateBranding: true, customDomain: true, landingPageBranding: true
    },
    security: {
      mfa: true, sso: true, auditTrail: true, ipRestrictions: true, apiTokens: true, sessionPolicies: true, advancedPermissions: true, organizationLogs: true
    },
    billing: {
      monthlyPrice: 0, annualPrice: 0, trialDays: 0, billingCycle: 'CUSTOM', visible: true, purchasable: false, legacyPlan: false, taxIncluded: true
    },
    ai: {
      aiCredits: 0, unlimitedAiCredits: true, dailyRequests: 0, unlimitedDailyRequests: true, promptTokens: 0, unlimitedPromptTokens: true, completionTokens: 0, unlimitedCompletionTokens: true, aiJudging: true, aiReviews: true, aiAssistant: true, aiReports: true
    },
    advanced: { developerNotes: '', internalIdentifier: 'ent-v1', featureFlags: [], experimentalFeatures: true, metadata: {} },
    history: []
  }
];

export const MOCK_CURRENT_SUBSCRIPTION: Subscription = {
  id: 'sub_12345',
  organizationId: 'org_1',
  planId: 'plan_pro',
  status: 'ACTIVE',
  currentPeriodStart: new Date('2026-07-01T00:00:00Z').toISOString(),
  currentPeriodEnd: new Date('2026-08-01T00:00:00Z').toISOString(),
  cancelAtPeriodEnd: false,
  paymentMethod: {
    brand: 'Visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2028
  }
};

export const MOCK_RESOURCE_USAGE: UsageRecord = {
  organizationId: 'org_1',
  submissionsUsed: 423,
  storageMbUsed: 2150,
  aiCreditsUsed: 12,
  teamMembersUsed: 4,
  lastUpdated: new Date().toISOString()
};

export const MOCK_USAGE_HISTORY: UsageHistoryPoint[] = [
  { month: 'Jan', submissions: 120, storageMb: 500, aiCredits: 0 },
  { month: 'Feb', submissions: 150, storageMb: 600, aiCredits: 0 },
  { month: 'Mar', submissions: 180, storageMb: 800, aiCredits: 2 },
  { month: 'Apr', submissions: 250, storageMb: 1200, aiCredits: 5 },
  { month: 'May', submissions: 320, storageMb: 1600, aiCredits: 8 },
  { month: 'Jun', submissions: 400, storageMb: 2000, aiCredits: 10 },
  { month: 'Jul', submissions: 423, storageMb: 2150, aiCredits: 12 },
];

export const MOCK_INVOICES: Invoice[] = [
  { id: 'inv_1', number: 'INV-2026-07', amount: 99, status: 'PAID', date: '2026-07-01T00:00:00Z', downloadUrl: '#' },
  { id: 'inv_2', number: 'INV-2026-06', amount: 99, status: 'PAID', date: '2026-06-01T00:00:00Z', downloadUrl: '#' },
  { id: 'inv_3', number: 'INV-2026-05', amount: 99, status: 'PAID', date: '2026-05-01T00:00:00Z', downloadUrl: '#' },
];

export const MOCK_ALL_ORGANIZATIONS_SUBSCRIPTIONS = [
  {
    organization: { id: 'org_1', name: 'Acme Corp' },
    subscription: { planId: 'plan_pro', tier: 'PRO' as const, status: 'ACTIVE' as const, currentPeriodEnd: '2026-08-01T00:00:00Z' },
    usage: { submissionsUsed: 423 }
  },
  {
    organization: { id: 'org_2', name: 'Global Tech' },
    subscription: { planId: 'plan_enterprise', tier: 'ENTERPRISE' as const, status: 'ACTIVE' as const, currentPeriodEnd: '2027-01-01T00:00:00Z' },
    usage: { submissionsUsed: 12500 }
  },
  {
    organization: { id: 'org_3', name: 'Startup Inc' },
    subscription: { planId: 'plan_free', tier: 'FREE' as const, status: 'ACTIVE' as const, currentPeriodEnd: '2026-08-15T00:00:00Z' },
    usage: { submissionsUsed: 45 }
  },
  {
    organization: { id: 'org_4', name: 'Creative Agency' },
    subscription: { planId: 'plan_business', tier: 'BUSINESS' as const, status: 'PAST_DUE' as const, currentPeriodEnd: '2026-07-01T00:00:00Z' },
    usage: { submissionsUsed: 4100 }
  }
];
