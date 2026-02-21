const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

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
  try {
    await fetch(`${backendUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Email delivery failures should not block UI flows.
  }
}

export async function sendTeamInviteEmail(payload: TeamInvitePayload) {
  if (!payload.email) return;
  await postJson('/api/invites/team', payload);
}

export async function sendJudgeInviteEmail(payload: JudgeInvitePayload) {
  if (!payload.email) return;
  await postJson('/api/invites/judge', payload);
}
