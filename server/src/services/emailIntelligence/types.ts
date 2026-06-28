/** Shared types for email OSINT / account discovery. */

export type EmailIntelligenceStatus = 'found' | 'not_found' | 'unavailable';

export interface RegisteredAccount {
  platform: string;
  domain: string;
  profileUrl: string | null;
  recoveryEmail: string | null;
  recoveryPhone: string | null;
  fullName: string | null;
  rateLimited: boolean;
  metadata: Record<string, unknown>;
}

export interface RecoveryHint {
  value: string;
  source: string;
  platform: string;
  kind: 'email' | 'phone' | 'name';
}

export interface EmailIntelligenceDossier {
  provider: string;
  status: EmailIntelligenceStatus;
  searchedAt: string;
  registeredAccounts: RegisteredAccount[];
  recoveryHints: RecoveryHint[];
  stats: {
    totalChecked: number;
    totalFound: number;
    rateLimited: number;
    errors: number;
  };
  unavailableReason?: string;
}

export interface FootprintCandidate {
  url: string;
  title: string;
  snippet: string;
  sourceType: 'email_lookup';
  sourceName: string;
  confidence: number;
  data: Record<string, unknown>;
}

export interface EmailIntelligenceResult {
  footprints: FootprintCandidate[];
  dossier: EmailIntelligenceDossier | null;
}
