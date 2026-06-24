import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resendJudgeInvite,
  resendTeamInvite,
  sendJudgeInviteEmail,
  sendMassEmail,
  sendTeamInviteEmail,
} from '../../../services/email';

const fetchBackendJson = vi.fn();
const getBackendCandidateUrls = vi.fn();
const getAccessToken = vi.fn();

vi.mock('../../../services/backendApi', () => ({
  fetchBackendJson: (...args: unknown[]) => fetchBackendJson(...args),
  getBackendCandidateUrls: (path: string) => getBackendCandidateUrls(path),
}));

vi.mock('../../../services/userContext', () => ({
  getAccessToken: () => getAccessToken(),
}));

describe('email service', () => {
  beforeEach(() => {
    fetchBackendJson.mockReset();
    getBackendCandidateUrls.mockReset();
    getAccessToken.mockReset();
    getBackendCandidateUrls.mockImplementation((path: string) => [path]);
    getAccessToken.mockResolvedValue('auth-token');
  });

  it('sendTeamInviteEmail skips requests when email is empty', async () => {
    await sendTeamInviteEmail({ email: '', programTitle: 'Awards' });

    expect(fetchBackendJson).not.toHaveBeenCalled();
  });

  it('sendTeamInviteEmail posts invite payload through fetchBackendJson', async () => {
    fetchBackendJson.mockResolvedValue({ ok: true });
    const payload = {
      email: 'judge@example.com',
      programTitle: 'Awards 2026',
      organizationId: 'org-1',
    };

    await sendTeamInviteEmail(payload);

    expect(fetchBackendJson).toHaveBeenCalledWith('/api/invites/team', {
      method: 'POST',
      body: payload,
      requireAuth: true,
      errorPrefix: 'Email API',
    });
  });

  it('sendJudgeInviteEmail posts judge invite payload', async () => {
    fetchBackendJson.mockResolvedValue({ ok: true });

    await sendJudgeInviteEmail({
      email: 'judge@example.com',
      name: 'Judge',
      programTitle: 'Awards',
    });

    expect(fetchBackendJson).toHaveBeenCalledWith('/api/invites/judge', expect.objectContaining({
      method: 'POST',
      requireAuth: true,
    }));
  });

  it('resendTeamInvite uses default program title fallback', async () => {
    fetchBackendJson.mockResolvedValue({ ok: true });

    await resendTeamInvite('invite-1');

    expect(fetchBackendJson).toHaveBeenCalledWith('/api/invites/resend', {
      method: 'POST',
      body: {
        inviteType: 'team',
        recordId: 'invite-1',
        programTitleFallback: 'your workspace',
      },
      requireAuth: true,
      errorPrefix: 'Email API',
    });
  });

  it('resendJudgeInvite sends judge resend payload', async () => {
    fetchBackendJson.mockResolvedValue({ ok: true });

    await resendJudgeInvite('judge-1', 'Program X');

    expect(fetchBackendJson).toHaveBeenCalledWith('/api/invites/resend', {
      method: 'POST',
      body: {
        inviteType: 'judge',
        recordId: 'judge-1',
        programTitleFallback: 'Program X',
      },
      requireAuth: true,
      errorPrefix: 'Email API',
    });
  });

  it('sendMassEmail posts segment send payload to mass-email endpoint', async () => {
    fetchBackendJson.mockResolvedValue({ sent: 2 });

    await sendMassEmail({
      programId: 'prog-1',
      roundId: 'round-1',
      segment: 'winners',
      subject: 'Congrats',
      template: 'Hello {{name}}',
      fromName: 'Organizer',
    });

    expect(fetchBackendJson).toHaveBeenCalledWith('/api/mass-email/prog-1/rounds/round-1/send', {
      method: 'POST',
      body: {
        segment: 'winners',
        subject: 'Congrats',
        template: 'Hello {{name}}',
        fromName: 'Organizer',
      },
      requireAuth: true,
      errorPrefix: 'Email API',
    });
  });

  it('emits trace callback on success', async () => {
    fetchBackendJson.mockResolvedValue({ ok: true });
    const onTrace = vi.fn();

    await sendTeamInviteEmail(
      { email: 'team@example.com', programTitle: 'Awards' },
      { onTrace },
    );

    expect(onTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/invites/team',
        method: 'POST',
        ok: true,
        status: 200,
        error: null,
      }),
    );
  });

  it('emits trace callback and rethrows on failure', async () => {
    fetchBackendJson.mockRejectedValue(new Error('Email API returned 500'));
    const onTrace = vi.fn();

    await expect(
      sendTeamInviteEmail(
        { email: 'team@example.com', programTitle: 'Awards' },
        { onTrace },
      ),
    ).rejects.toThrow('Email API returned 500');

    expect(onTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        status: null,
        error: 'Email API returned 500',
      }),
    );
  });

  it('does not require auth when access token is unavailable', async () => {
    getAccessToken.mockResolvedValue(undefined);
    fetchBackendJson.mockResolvedValue({ ok: true });

    await sendTeamInviteEmail({ email: 'team@example.com', programTitle: 'Awards' });

    expect(fetchBackendJson).toHaveBeenCalledWith('/api/invites/team', expect.objectContaining({
      requireAuth: false,
    }));
  });
});
