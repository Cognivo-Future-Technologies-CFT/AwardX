import { auth } from './supabase';

const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();
const normalizedBackendUrl = envBackendUrl.replace(/\/$/, '');

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
  const candidateUrls = normalizedBackendUrl
    ? [`${normalizedBackendUrl}${path}`, path]
    : [path];

  let lastError: Error | null = null;

  const { session } = await auth.getSession();
  const authToken = session?.access_token;

  for (let i = 0; i < candidateUrls.length; i++) {
    const url = candidateUrls[i];
    const startedAt = new Date().toISOString();
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const contentType = resp.headers.get('content-type') || '';
        let parsedBody: any = {};
        let rawBody = '';

        if (contentType.includes('application/json')) {
          parsedBody = await resp.json().catch(() => ({}));
        } else {
          rawBody = await resp.text().catch(() => '');
        }

        const detail =
          parsedBody?.error ||
          parsedBody?.message ||
          (rawBody ? rawBody.replace(/\s+/g, ' ').trim().slice(0, 240) : '');
        const errorMessage = detail
          ? `Email API returned ${resp.status}: ${detail}`
          : `Email API returned ${resp.status}`;

        onTrace?.({
          path,
          url,
          method: 'POST',
          attempt: i + 1,
          startedAt,
          finishedAt: new Date().toISOString(),
          status: resp.status,
          ok: false,
          error: errorMessage,
          requestBody: payload,
        });

        // Try the fallback endpoint only when primary fails with a server-side error.
        const canTryFallback = i < candidateUrls.length - 1;
        if (canTryFallback && resp.status >= 500) {
          lastError = new Error(errorMessage);
          continue;
        }

        throw new Error(errorMessage);
      }

      onTrace?.({
        path,
        url,
        method: 'POST',
        attempt: i + 1,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: resp.status,
        ok: true,
        error: null,
        requestBody: payload,
      });

      return resp.json();
    } catch (err: any) {
      if (!(err instanceof Error && /^Email API returned /.test(err.message))) {
        onTrace?.({
          path,
          url,
          method: 'POST',
          attempt: i + 1,
          startedAt,
          finishedAt: new Date().toISOString(),
          status: null,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          requestBody: payload,
        });
      }
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Email API request failed');
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
