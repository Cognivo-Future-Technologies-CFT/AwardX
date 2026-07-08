import { fetchBackendJson } from './backendApi';

// ─── Types ─────────────────────────────────────────────────────────────

export interface TeamMemberProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface SubmissionTeamMember {
  id: string;
  user_id: string;
  role: 'lead' | 'member';
  joined_at: string;
  profile: TeamMemberProfile | null;
}

export interface SubmissionTeam {
  id: string;
  program_id: string;
  name: string;
  team_lead_id: string;
  submission_id: string | null;
  invite_code: string;
  status: 'forming' | 'ready' | 'submitted' | 'disbanded';
  created_at: string;
  updated_at: string;
  members: SubmissionTeamMember[];
  memberCount: number;
  isLead: boolean;
}

export interface TeamChatMessage {
  id: string;
  team_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ─── API Functions ─────────────────────────────────────────────────────

/**
 * Create a new submission team (caller becomes team lead)
 */
export async function createSubmissionTeam(programId: string, name: string): Promise<SubmissionTeam> {
  const result = await fetchBackendJson<{ team: SubmissionTeam }>('/api/submission-teams', {
    method: 'POST',
    body: { programId, name },
    requireAuth: true,
    errorPrefix: 'Create team',
  });
  return result.team;
}

/**
 * Get current user's team for a specific program
 */
export async function getMyTeam(programId: string): Promise<SubmissionTeam | null> {
  const result = await fetchBackendJson<{ team: SubmissionTeam | null }>(
    `/api/submission-teams/my-team?programId=${encodeURIComponent(programId)}`,
    { requireAuth: true, errorPrefix: 'Get my team' },
  );
  return result.team;
}

/**
 * Join a team using team ID and invite code
 */
export async function joinTeam(teamId: string, inviteCode: string): Promise<void> {
  await fetchBackendJson(`/api/submission-teams/${teamId}/join`, {
    method: 'POST',
    body: { inviteCode },
    requireAuth: true,
    errorPrefix: 'Join team',
  });
}

/**
 * Join a team using only the invite code
 */
export async function joinTeamByCode(inviteCode: string, programId?: string): Promise<{ teamId: string }> {
  return fetchBackendJson<{ teamId: string }>('/api/submission-teams/join-by-code', {
    method: 'POST',
    body: { inviteCode, programId },
    requireAuth: true,
    errorPrefix: 'Join team',
  });
}

/**
 * Remove a member from the team
 */
export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  await fetchBackendJson(`/api/submission-teams/${teamId}/members/${memberId}`, {
    method: 'DELETE',
    requireAuth: true,
    errorPrefix: 'Remove member',
  });
}

/**
 * Disband a team (team lead only)
 */
export async function disbandTeam(teamId: string): Promise<void> {
  await fetchBackendJson(`/api/submission-teams/${teamId}/disband`, {
    method: 'POST',
    requireAuth: true,
    errorPrefix: 'Disband team',
  });
}

/**
 * Mark team as ready (team lead only, validates min team size)
 */
export async function markTeamReady(teamId: string): Promise<void> {
  await fetchBackendJson(`/api/submission-teams/${teamId}/mark-ready`, {
    method: 'POST',
    requireAuth: true,
    errorPrefix: 'Mark team ready',
  });
}

/**
 * Link a submission to the team after the team lead submits
 */
export async function linkSubmissionToTeam(teamId: string, submissionId: string): Promise<void> {
  await fetchBackendJson(`/api/submission-teams/${teamId}/link-submission`, {
    method: 'POST',
    body: { submissionId },
    requireAuth: true,
    errorPrefix: 'Link submission',
  });
}

/**
 * Get team chat messages
 */
export async function getTeamChat(
  teamId: string,
  options?: { limit?: number; before?: string },
): Promise<{ messages: TeamChatMessage[]; chatActive: boolean }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', options.before);

  const qs = params.toString();
  return fetchBackendJson<{ messages: TeamChatMessage[]; chatActive: boolean }>(
    `/api/submission-teams/${teamId}/chat${qs ? `?${qs}` : ''}`,
    { requireAuth: true, errorPrefix: 'Get team chat' },
  );
}

/**
 * Send a chat message
 */
export async function sendTeamChatMessage(teamId: string, message: string): Promise<TeamChatMessage> {
  const result = await fetchBackendJson<{ message: TeamChatMessage }>(
    `/api/submission-teams/${teamId}/chat`,
    {
      method: 'POST',
      body: { message },
      requireAuth: true,
      errorPrefix: 'Send message',
    },
  );
  return result.message;
}
