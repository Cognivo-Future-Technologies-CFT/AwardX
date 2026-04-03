const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();
const normalizedBackendUrl = envBackendUrl.replace(/\/$/, '');

type TeamInvitePayload = {
  email: string;
  roleName?: string;
  programTitle: string;
  inviteUrl?: string;
};

type JudgeInvitePayload = {
  email: string;
  name: string;
  programTitle: string;
  inviteUrl?: string;
};

async function postJson(path: string, payload: Record<string, any>) {
  const candidateUrls = normalizedBackendUrl
    ? [`${normalizedBackendUrl}${path}`, path]
    : [path];

  let lastError: Error | null = null;

  for (const url of candidateUrls) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `Email API returned ${resp.status}`);
      }

      return resp.json();
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Email API request failed');
}

export async function sendTeamInviteEmail(payload: TeamInvitePayload) {
  if (!payload.email) return;
  await postJson('/api/invites/team', payload);
}

export async function sendJudgeInviteEmail(payload: JudgeInvitePayload) {
  if (!payload.email) return;
  await postJson('/api/invites/judge', payload);
}
