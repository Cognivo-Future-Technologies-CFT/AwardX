import { fetchBackendJson } from './backendApi';

export interface PersonIdentity {
  id: string;
  name: string | null;
  email: string;
  aliases: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface OrganizedClaim {
  id: string;
  text: string;
  subject: string | null;
  type: string;
  verified: boolean;
  confidence: number;
  status: string;
  sources: ClaimSource[];
}

export interface ClaimSource {
  url: string | null;
  title: string | null;
  supportsClaim: boolean | null;
  confidence: number;
}

export interface DigitalPresence {
  totalSources: number;
  topSources: Array<{ name: string; type: string; count: number }>;
  topDomains: Array<{ domain: string; count: number }>;
  lastCollected: string | null;
}

export interface PersonIntelligenceProfile {
  identity: PersonIdentity;
  achievements: OrganizedClaim[];
  education: OrganizedClaim[];
  experience: OrganizedClaim[];
  skills: OrganizedClaim[];
  affiliations: OrganizedClaim[];
  awards: OrganizedClaim[];
  digitalPresence: DigitalPresence;
  overallConfidence: number;
}

export interface DigitalFootprint {
  id: string;
  personProfileId: string;
  sourceType: string;
  sourceName: string;
  sourceUrl: string | null;
  title: string | null;
  snippet: string | null;
  confidence: number;
  collectedAt: string;
  data: Record<string, unknown>;
}

export interface ClaimVerification {
  id: string;
  claimId: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceSnippet: string | null;
  extractedEvidence: string | null;
  supportsClaim: boolean | null;
  verificationMethod: string;
  relevanceScore: number;
  authorityScore: number;
  confidence: number;
  createdAt: string;
}

export interface ClaimWithVerifications {
  id: string;
  submissionId: string;
  claimText: string;
  claimType: string;
  claimSubject: string | null;
  verificationStatus: string;
  verificationConfidence: number | null;
  verificationSummary: string | null;
  claimVerifications: ClaimVerification[];
}

/** Get a person's full intelligence profile */
export async function getPersonProfile(
  personId: string,
): Promise<PersonIntelligenceProfile> {
  const resp = await fetchBackendJson<{ data: PersonIntelligenceProfile }>(
    `/api/person/${encodeURIComponent(personId)}/profile`,
    { requireAuth: true, errorPrefix: 'Person Intelligence' },
  );
  return resp.data;
}

/** Get a person's digital footprints */
export async function getPersonFootprints(
  personId: string,
  options?: { limit?: number; offset?: number; sourceType?: string },
): Promise<{ data: DigitalFootprint[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.sourceType) params.set('sourceType', options.sourceType);
  const qs = params.toString();

  const resp = await fetchBackendJson<{ data: DigitalFootprint[]; total: number }>(
    `/api/person/${encodeURIComponent(personId)}/footprints${qs ? `?${qs}` : ''}`,
    { requireAuth: true, errorPrefix: 'Person Intelligence' },
  );
  return resp;
}

/** Refresh a person's digital footprints */
export async function refreshPersonProfile(
  personId: string,
): Promise<{ collected: number; sources: string[] }> {
  const resp = await fetchBackendJson<{ data: { collected: number; sources: string[] } }>(
    `/api/person/${encodeURIComponent(personId)}/refresh`,
    { method: 'POST', requireAuth: true, errorPrefix: 'Person Intelligence' },
  );
  return resp.data;
}

/** Get all claims made by a person */
export async function getPersonClaims(
  personId: string,
  options?: { claimType?: string; status?: string },
): Promise<ClaimWithVerifications[]> {
  const params = new URLSearchParams();
  if (options?.claimType) params.set('claimType', options.claimType);
  if (options?.status) params.set('status', options.status);
  const qs = params.toString();

  const resp = await fetchBackendJson<{ data: ClaimWithVerifications[] }>(
    `/api/person/${encodeURIComponent(personId)}/claims${qs ? `?${qs}` : ''}`,
    { requireAuth: true, errorPrefix: 'Person Intelligence' },
  );
  return resp.data || [];
}

/** Get claims from a specific submission (supports judge token) */
export async function getSubmissionClaims(
  submissionId: string,
  options?: { judgeToken?: string },
): Promise<ClaimWithVerifications[]> {
  const params = new URLSearchParams();
  if (options?.judgeToken) params.set('judgeToken', options.judgeToken);
  const qs = params.toString();

  const resp = await fetchBackendJson<{ data: ClaimWithVerifications[] }>(
    `/api/submissions/${encodeURIComponent(submissionId)}/claims${qs ? `?${qs}` : ''}`,
    { requireAuth: !options?.judgeToken, errorPrefix: 'Claims' },
  );
  return resp.data || [];
}

export interface SubmissionFootprintsResponse {
  data: DigitalFootprint[];
  total: number;
  personProfileId: string | null;
}

/** Get digital footprints for a submission's applicant */
export async function getSubmissionFootprints(
  submissionId: string,
  options?: { judgeToken?: string },
): Promise<SubmissionFootprintsResponse> {
  const params = new URLSearchParams();
  if (options?.judgeToken) params.set('judgeToken', options.judgeToken);
  const qs = params.toString();

  return fetchBackendJson<SubmissionFootprintsResponse>(
    `/api/submissions/${encodeURIComponent(submissionId)}/footprints${qs ? `?${qs}` : ''}`,
    { requireAuth: !options?.judgeToken, errorPrefix: 'Digital Footprint' },
  );
}

/** Re-collect digital footprints for a submission's applicant */
export async function refreshSubmissionFootprints(
  submissionId: string,
  options?: { judgeToken?: string },
): Promise<SubmissionFootprintsResponse> {
  const params = new URLSearchParams();
  if (options?.judgeToken) params.set('judgeToken', options.judgeToken);
  const qs = params.toString();

  return fetchBackendJson<SubmissionFootprintsResponse>(
    `/api/submissions/${encodeURIComponent(submissionId)}/footprints/refresh${qs ? `?${qs}` : ''}`,
    { method: 'POST', requireAuth: !options?.judgeToken, errorPrefix: 'Digital Footprint' },
  );
}

export interface SubmissionIntelligence {
  personProfileId: string | null;
  applicantEmail: string | null;
  applicantName: string | null;
  processingStatus: string | null;
  profile: PersonIntelligenceProfile | null;
  footprints: DigitalFootprint[];
  footprintsTotal: number;
  claims: ClaimWithVerifications[];
  emailIntelligence?: EmailIntelligenceDossier | null;
  intelligenceEnabled?: boolean;
  holeheEnabled?: boolean;
  holeheAvailable?: boolean;
  emailIntelligenceConfigured?: boolean;
  setupRequired?: boolean;
}

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
  status: 'found' | 'not_found' | 'unavailable';
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

/** Get aggregated intelligence for a submission */
export async function getSubmissionIntelligence(
  submissionId: string,
  options?: { judgeToken?: string },
): Promise<SubmissionIntelligence> {
  const params = new URLSearchParams();
  if (options?.judgeToken) params.set('judgeToken', options.judgeToken);
  const qs = params.toString();

  return fetchBackendJson<SubmissionIntelligence>(
    `/api/submissions/${encodeURIComponent(submissionId)}/intelligence${qs ? `?${qs}` : ''}`,
    { requireAuth: !options?.judgeToken, errorPrefix: 'Person Intelligence' },
  );
}

/** Force re-verify a claim */
export async function verifyClaim(
  claimId: string,
): Promise<{ claimId: string; status: string }> {
  const resp = await fetchBackendJson<{ data: { claimId: string; status: string } }>(
    `/api/claims/${encodeURIComponent(claimId)}/verify`,
    { method: 'POST', requireAuth: true, errorPrefix: 'Claims' },
  );
  return resp.data;
}

/** Delete a person profile (GDPR) */
export async function deletePersonProfile(personId: string): Promise<void> {
  await fetchBackendJson<{ data: { deleted: boolean } }>(
    `/api/person/${encodeURIComponent(personId)}`,
    { method: 'DELETE', requireAuth: true, errorPrefix: 'Person Intelligence' },
  );
}

/** Get verifications for a specific claim */
export async function getClaimVerifications(
  claimId: string,
): Promise<ClaimVerification[]> {
  const resp = await fetchBackendJson<{ data: ClaimVerification[] }>(
    `/api/claims/${encodeURIComponent(claimId)}/verifications`,
    { requireAuth: false, errorPrefix: 'Claims' },
  );
  return resp.data || [];
}
