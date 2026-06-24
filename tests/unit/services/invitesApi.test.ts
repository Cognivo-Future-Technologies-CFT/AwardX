import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptJudgeInvite,
  acceptTeamInvite,
  verifyJudgeInvite,
  verifyTeamInvite,
} from '../../../services/invitesApi';

const getAuthToken = vi.fn();
const getBackendCandidateUrls = vi.fn();
const fetchMock = vi.fn();

vi.mock('../../../services/backendApi', () => ({
  getAuthToken: () => getAuthToken(),
  getBackendCandidateUrls: (path: string) => getBackendCandidateUrls(path),
}));

describe('invitesApi', () => {
  beforeEach(() => {
    getAuthToken.mockReset();
    getBackendCandidateUrls.mockReset();
    fetchMock.mockReset();
    getBackendCandidateUrls.mockImplementation((path: string) => [path]);
    vi.stubGlobal('fetch', fetchMock);
  });

  it('verifyTeamInvite encodes token and attaches auth when available', async () => {
    getAuthToken.mockResolvedValue('token-123');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ invite: { email: 'a@b.com' } }),
    });

    const result = await verifyTeamInvite('team token/with space');

    expect(fetchMock).toHaveBeenCalledWith('/api/invites/verify-team?token=team%20token%2Fwith%20space', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      body: { invite: { email: 'a@b.com' } },
    });
  });

  it('verifyTeamInvite returns client errors without retrying', async () => {
    getAuthToken.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ requiresAuth: true }),
    });

    const result = await verifyTeamInvite('invite-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(401);
    expect(result.body.requiresAuth).toBe(true);
  });

  it('acceptTeamInvite posts JSON body to verify-team endpoint', async () => {
    getAuthToken.mockResolvedValue('token-123');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await acceptTeamInvite({ token: 'invite-1', action: 'accept' });

    expect(fetchMock).toHaveBeenCalledWith('/api/invites/verify-team', {
      method: 'POST',
      body: JSON.stringify({ token: 'invite-1', action: 'accept' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
    });
  });

  it('verifyJudgeInvite uses judge verify endpoint', async () => {
    getAuthToken.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ judge: { id: 'j1' } }),
    });

    const result = await verifyJudgeInvite('judge-token');

    expect(fetchMock).toHaveBeenCalledWith('/api/invites/verify-judge?token=judge-token', expect.any(Object));
    expect(result.body.judge).toEqual({ id: 'j1' });
  });

  it('acceptJudgeInvite posts JSON body to verify-judge endpoint', async () => {
    getAuthToken.mockResolvedValue('token-123');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ assignments: [] }),
    });

    await acceptJudgeInvite({ token: 'judge-token', action: 'decline' });

    expect(fetchMock).toHaveBeenCalledWith('/api/invites/verify-judge', {
      method: 'POST',
      body: JSON.stringify({ token: 'judge-token', action: 'decline' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
    });
  });

  it('retries on server errors when fallback URL is available', async () => {
    getAuthToken.mockResolvedValue(undefined);
    getBackendCandidateUrls.mockReturnValue(['https://api.test/verify-team', '/api/invites/verify-team']);
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'down' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invite: { email: 'ok@example.com' } }),
      });

    const result = await verifyTeamInvite('invite-1');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    expect(result.body.invite.email).toBe('ok@example.com');
  });
});
