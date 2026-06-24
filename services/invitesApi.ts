import { getAuthToken, getBackendCandidateUrls } from './backendApi';

export type InviteVerifyResult = {
  ok: boolean;
  status: number;
  body: Record<string, any>;
};

async function requestInvite(path: string, init?: RequestInit): Promise<InviteVerifyResult> {
  const candidateUrls = getBackendCandidateUrls(path);
  const authToken = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };

  let last: InviteVerifyResult = { ok: false, status: 0, body: {} };

  for (const url of candidateUrls) {
    try {
      const resp = await fetch(url, { ...init, headers });
      const body = await resp.json().catch(() => ({}));
      last = { ok: resp.ok, status: resp.status, body };
      if (resp.ok) return last;
      if (resp.status < 500) return last;
    } catch {
      continue;
    }
  }

  return last;
}

export async function verifyTeamInvite(token: string): Promise<InviteVerifyResult> {
  return requestInvite(`/api/invites/verify-team?token=${encodeURIComponent(token)}`);
}

export async function acceptTeamInvite(body: Record<string, unknown>): Promise<InviteVerifyResult> {
  return requestInvite('/api/invites/verify-team', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function verifyJudgeInvite(token: string): Promise<InviteVerifyResult> {
  return requestInvite(`/api/invites/verify-judge?token=${encodeURIComponent(token)}`);
}

export async function acceptJudgeInvite(body: Record<string, unknown>): Promise<InviteVerifyResult> {
  return requestInvite('/api/invites/verify-judge', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
