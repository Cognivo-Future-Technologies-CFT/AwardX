import { fetchBackendJson, getBackendCandidateUrls } from './backendApi';
import { getAccessToken } from './userContext';

type TeamInvitePayload = {
  email: string;
  roleId?: string;
  roleName?: string;
  programTitle: string;
  organizationId?: string;
  programId?: string;
  inviteUrl?: string;
};

type JudgeInvitePayload = {
  email: string;
  name: string;
  programTitle: string;
  organizationId?: string;
  programId?: string;
  inviteId?: string;
  inviteUrl?: string;
};

type MassEmailPayload = {
  programId: string;
  roundId: string;
  segment: 'winners' | 'eliminated' | 'active' | 'all';
  subject: string;
  template: string;
  fromName?: string;
};

export interface EmailApiRequestTrace {
  path: string;
  url: string;
  method: 'POST';
  attempt: number;
  startedAt: string;
  finishedAt: string;
  status: number | null;
  ok: boolean;
  error: string | null;
  requestBody: Record<string, any>;
}

type EmailTraceCallback = (trace: EmailApiRequestTrace) => void;

async function postJson(path: string, payload: Record<string, any>, onTrace?: EmailTraceCallback) {
  const candidateUrls = getBackendCandidateUrls(path);
  const url = candidateUrls[0] || path;
  const startedAt = new Date().toISOString();

  try {
    const authToken = await getAccessToken();
    const result = await fetchBackendJson(path, {
      method: 'POST',
      body: payload,
      requireAuth: !!authToken,
      errorPrefix: 'Email API',
    });

    onTrace?.({
      path,
      url,
      method: 'POST',
      attempt: 1,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 200,
      ok: true,
      error: null,
      requestBody: payload,
    });

    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    onTrace?.({
      path,
      url,
      method: 'POST',
      attempt: 1,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: null,
      ok: false,
      error: errorMessage,
      requestBody: payload,
    });
    throw err instanceof Error ? err : new Error(errorMessage);
  }
}

export async function sendTeamInviteEmail(payload: TeamInvitePayload, options?: { onTrace?: EmailTraceCallback }) {
  if (!payload.email) return;
  return postJson('/api/invites/team', payload, options?.onTrace);
}

export async function sendJudgeInviteEmail(payload: JudgeInvitePayload, options?: { onTrace?: EmailTraceCallback }) {
  if (!payload.email) return;
  return postJson('/api/invites/judge', payload, options?.onTrace);
}

export async function resendTeamInvite(
  inviteId: string,
  programTitleFallback?: string,
  options?: { onTrace?: EmailTraceCallback },
) {
  return postJson('/api/invites/resend', {
    inviteType: 'team',
    recordId: inviteId,
    programTitleFallback: programTitleFallback || 'your workspace',
  }, options?.onTrace);
}

export async function resendJudgeInvite(
  judgeId: string,
  programTitleFallback?: string,
  options?: { onTrace?: EmailTraceCallback },
) {
  return postJson('/api/invites/resend', {
    inviteType: 'judge',
    recordId: judgeId,
    programTitleFallback: programTitleFallback || 'your workspace',
  }, options?.onTrace);
}

export async function sendMassEmail(payload: MassEmailPayload, options?: { onTrace?: EmailTraceCallback }) {
  return postJson(`/api/mass-email/${payload.programId}/rounds/${payload.roundId}/send`, {
    segment: payload.segment,
    subject: payload.subject,
    template: payload.template,
    fromName: payload.fromName,
  }, options?.onTrace);
}
