export interface BrandingSettings {
  removeAwardxBranding: boolean;
  uploadLogo: boolean;
  customColors: boolean;
  customEmailTemplates: boolean;
  customCertificateBranding: boolean;
  customDomain: boolean;
  landingPageBranding: boolean;
}

export interface SecuritySettings {
  mfa: boolean;
  sso: boolean;
  auditTrail: boolean;
  ipRestrictions: boolean;
  apiTokens: boolean;
  sessionPolicies: boolean;
  advancedPermissions: boolean;
  organizationLogs: boolean;
}

export interface BillingSettings {
  monthlyPrice: number;
  annualPrice: number;
  lifetimePrice?: number;
  trialDays: number;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM';
  visible: boolean;
  purchasable: boolean;
  legacyPlan: boolean;
  upgradeTargetId?: string;
  downgradeTargetId?: string;
  taxIncluded: boolean;
}

export interface AISettings {
  aiCredits: number;
  unlimitedAiCredits: boolean;
  dailyRequests: number;
  unlimitedDailyRequests: boolean;
  promptTokens: number;
  unlimitedPromptTokens: boolean;
  completionTokens: number;
  unlimitedCompletionTokens: boolean;
  aiJudging: boolean;
  aiReviews: boolean;
  aiAssistant: boolean;
  aiReports: boolean;
}

export interface HistoryEvent {
  id: string;
  created: string;
  updated: string;
  changedBy: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface AdvancedSettings {
  developerNotes: string;
  internalIdentifier: string;
  featureFlags: string[];
  experimentalFeatures: boolean;
  metadata: Record<string, any>;
}

export interface FullPlanConfig extends import('./plan').Plan {
  resources: import('./resource').Resource[];
  features: import('./feature').Feature[];
  integrations: import('./integration').Integration[];
  branding: BrandingSettings;
  security: SecuritySettings;
  billing: BillingSettings;
  ai: AISettings;
  advanced: AdvancedSettings;
  history: HistoryEvent[];
}
