import { fetchBackendJson } from './backendApi';

export type VotingAccessMode = 'open' | 'org_only' | 'authenticated';

export interface VotingConfigPayload {
  votes_per_user: number;
  votes_per_submission: number;
  require_auth: boolean;
  allow_anonymous: boolean;
  show_results_publicly: boolean;
  show_leaderboard: boolean;
  access_mode?: VotingAccessMode;
  public_voting_slug?: string;
}

export interface VotingRoundPayload {
  id: string;
  title: string;
  description?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  public_voting_slug?: string;
}

export interface VotingSubmissionPayload {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  applicant_name: string;
  votes_count: number;
  category?: string;
}

export interface VotingProgramPayload {
  id?: string;
  title?: string;
  kyc_enabled?: boolean;
}

export interface VotingPageData {
  round: VotingRoundPayload | null;
  config: VotingConfigPayload | null;
  program: VotingProgramPayload | null;
  submissions: VotingSubmissionPayload[];
}

export interface VotingLeaderboardEntry {
  rank: number;
  submission_id: string;
  title: string;
  applicant_name: string;
  vote_count: number;
  judge_score?: number | null;
}

export interface MyVoteEntry {
  id: string;
  submission_id: string;
  title: string;
  applicant_name: string;
  cover_image_url?: string;
  created_at: string;
}

export function votingPublicUrl(slug?: string, roundId?: string): string {
  if (slug) return `${window.location.origin}/vote/${slug}`;
  if (roundId) return `${window.location.origin}/voting/${roundId}`;
  return '';
}

export async function getVotingConfig(roundId: string): Promise<VotingConfigPayload | null> {
  try {
    const response = await fetchBackendJson<{ data?: VotingConfigPayload | null }>(
      `/api/voting/${encodeURIComponent(roundId)}/config`,
      {
        requireAuth: true,
        errorPrefix: 'Voting config API',
      },
    );
    return response.data ?? null;
  } catch {
    return null;
  }
}

export async function updateVotingConfig(
  roundId: string,
  config: Partial<VotingConfigPayload>,
): Promise<unknown> {
  return fetchBackendJson(`/api/voting/${encodeURIComponent(roundId)}/config`, {
    method: 'PUT',
    requireAuth: true,
    errorPrefix: 'Voting config API',
    body: {
      votes_per_user: config.votes_per_user ?? 5,
      votes_per_submission: config.votes_per_submission ?? 1,
      require_auth: config.require_auth ?? false,
      allow_anonymous: config.allow_anonymous ?? true,
      show_results_publicly: config.show_results_publicly ?? false,
      show_leaderboard: config.show_leaderboard ?? true,
      access_mode: config.access_mode ?? 'open',
      public_voting_slug: config.public_voting_slug,
    },
  });
}

export async function getVotingPageBySlug(slug: string): Promise<VotingPageData> {
  const response = await fetchBackendJson<{ data?: VotingPageData }>(
    `/api/voting/s/${encodeURIComponent(slug)}`,
    { errorPrefix: 'Voting API' },
  );
  return response.data ?? (response as unknown as VotingPageData);
}

export async function getVotingPageByRoundId(roundId: string): Promise<VotingPageData> {
  const response = await fetchBackendJson<{ data?: VotingPageData }>(
    `/api/voting/${encodeURIComponent(roundId)}`,
    { errorPrefix: 'Voting API' },
  );
  return response.data ?? (response as unknown as VotingPageData);
}

export async function getKycStatus(programId: string): Promise<{ status: string }> {
  try {
    const response = await fetchBackendJson<{ data?: { status: string } }>(
      `/api/kyc/status/${encodeURIComponent(programId)}`,
      {
        requireAuth: true,
        errorPrefix: 'KYC API',
      },
    );
    return response.data || { status: 'none' };
  } catch {
    return { status: 'none' };
  }
}

export async function startKycDidit(programId: string, returnUrl: string): Promise<string> {
  const response = await fetchBackendJson<{ data?: { verification_url?: string } }>(
    '/api/kyc/didit/start',
    {
      method: 'POST',
      requireAuth: true,
      errorPrefix: 'KYC API',
      body: { program_id: programId, return_url: returnUrl },
    },
  );
  const url = response.data?.verification_url;
  if (!url) throw new Error('Could not start verification');
  return url;
}

export async function getMyVotes(roundId: string): Promise<{ votes: MyVoteEntry[]; total: number }> {
  try {
    const response = await fetchBackendJson<{ data?: { votes: MyVoteEntry[]; total: number } }>(
      `/api/voting/${encodeURIComponent(roundId)}/my-votes`,
      {
        requireAuth: true,
        errorPrefix: 'Voting API',
      },
    );
    return response.data || { votes: [], total: 0 };
  } catch {
    return { votes: [], total: 0 };
  }
}

export async function getVotingLeaderboard(
  roundId: string,
): Promise<{ data?: { submissions?: VotingLeaderboardEntry[] } } | null> {
  try {
    return await fetchBackendJson<{ data?: { submissions?: VotingLeaderboardEntry[] } }>(
      `/api/voting/${encodeURIComponent(roundId)}/leaderboard`,
      { errorPrefix: 'Voting leaderboard API' },
    );
  } catch {
    return null;
  }
}

export async function castVote(
  roundId: string,
  payload: { submission_id: string; email?: string; name?: string },
): Promise<unknown> {
  return fetchBackendJson(`/api/voting/${encodeURIComponent(roundId)}/vote`, {
    method: 'POST',
    requireAuth: true,
    errorPrefix: 'Voting API',
    body: payload,
  });
}
