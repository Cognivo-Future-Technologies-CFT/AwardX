import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  castVote,
  getKycStatus,
  getMyVotes,
  getVotingConfig,
  getVotingLeaderboard,
  getVotingPageByRoundId,
  getVotingPageBySlug,
  startKycDidit,
  updateVotingConfig,
  votingPublicUrl,
} from '../../../services/votingApi';

const fetchBackendJson = vi.fn();

vi.mock('../../../services/backendApi', () => ({
  fetchBackendJson: (...args: unknown[]) => fetchBackendJson(...args),
}));

describe('votingApi', () => {
  beforeEach(() => {
    fetchBackendJson.mockReset();
    vi.stubGlobal('location', { origin: 'https://awardx.test' } as Location);
  });

  describe('votingPublicUrl', () => {
    it('prefers slug-based public URLs', () => {
      expect(votingPublicUrl('my-award', 'round-1')).toBe('https://awardx.test/vote/my-award');
    });

    it('falls back to legacy round id URLs', () => {
      expect(votingPublicUrl(undefined, 'round-1')).toBe('https://awardx.test/voting/round-1');
    });

    it('returns empty string when neither slug nor round id is provided', () => {
      expect(votingPublicUrl()).toBe('');
    });
  });

  describe('getVotingConfig', () => {
    it('returns config data from the API response', async () => {
      const config = {
        votes_per_user: 3,
        votes_per_submission: 1,
        require_auth: true,
        allow_anonymous: false,
        show_results_publicly: true,
        show_leaderboard: true,
        access_mode: 'authenticated' as const,
      };
      fetchBackendJson.mockResolvedValue({ data: config });

      await expect(getVotingConfig('round-1')).resolves.toEqual(config);
      expect(fetchBackendJson).toHaveBeenCalledWith('/api/voting/round-1/config', {
        requireAuth: true,
        errorPrefix: 'Voting config API',
      });
    });

    it('returns null when the request fails', async () => {
      fetchBackendJson.mockRejectedValue(new Error('Voting config API returned 404'));

      await expect(getVotingConfig('missing')).resolves.toBeNull();
    });
  });

  describe('updateVotingConfig', () => {
    it('sends defaults for omitted fields', async () => {
      fetchBackendJson.mockResolvedValue({ ok: true });

      await updateVotingConfig('round-1', { votes_per_user: 10 });

      expect(fetchBackendJson).toHaveBeenCalledWith('/api/voting/round-1/config', {
        method: 'PUT',
        requireAuth: true,
        errorPrefix: 'Voting config API',
        body: {
          votes_per_user: 10,
          votes_per_submission: 1,
          require_auth: false,
          allow_anonymous: true,
          show_results_publicly: false,
          show_leaderboard: true,
          access_mode: 'open',
          public_voting_slug: undefined,
        },
      });
    });
  });

  describe('getVotingPageBySlug', () => {
    it('unwraps nested data payloads', async () => {
      const page = {
        round: { id: 'round-1', title: 'Vote', status: 'active' },
        config: null,
        program: null,
        submissions: [],
      };
      fetchBackendJson.mockResolvedValue({ data: page });

      await expect(getVotingPageBySlug('public-slug')).resolves.toEqual(page);
      expect(fetchBackendJson).toHaveBeenCalledWith('/api/voting/s/public-slug', {
        errorPrefix: 'Voting API',
      });
    });
  });

  describe('getVotingPageByRoundId', () => {
    it('unwraps nested data payloads', async () => {
      const page = {
        round: { id: 'round-1', title: 'Vote', status: 'active' },
        config: null,
        program: null,
        submissions: [],
      };
      fetchBackendJson.mockResolvedValue({ data: page });

      await expect(getVotingPageByRoundId('round-1')).resolves.toEqual(page);
    });
  });

  describe('getKycStatus', () => {
    it('returns status from the API', async () => {
      fetchBackendJson.mockResolvedValue({ data: { status: 'verified' } });

      await expect(getKycStatus('prog-1')).resolves.toEqual({ status: 'verified' });
    });

    it('returns none when the request fails', async () => {
      fetchBackendJson.mockRejectedValue(new Error('network'));

      await expect(getKycStatus('prog-1')).resolves.toEqual({ status: 'none' });
    });
  });

  describe('startKycDidit', () => {
    it('returns the verification URL from the API', async () => {
      fetchBackendJson.mockResolvedValue({
        data: { verification_url: 'https://didit.test/session' },
      });

      await expect(startKycDidit('prog-1', 'https://awardx.test/vote')).resolves.toBe(
        'https://didit.test/session',
      );
      expect(fetchBackendJson).toHaveBeenCalledWith('/api/kyc/didit/start', {
        method: 'POST',
        requireAuth: true,
        errorPrefix: 'KYC API',
        body: { program_id: 'prog-1', return_url: 'https://awardx.test/vote' },
      });
    });

    it('throws when verification URL is missing', async () => {
      fetchBackendJson.mockResolvedValue({ data: {} });

      await expect(startKycDidit('prog-1', 'https://awardx.test/vote')).rejects.toThrow(
        'Could not start verification',
      );
    });
  });

  describe('getMyVotes', () => {
    it('returns vote data from the API', async () => {
      fetchBackendJson.mockResolvedValue({
        data: { votes: [{ id: 'v1', submission_id: 's1', title: 'A', applicant_name: 'B', created_at: '' }], total: 1 },
      });

      const result = await getMyVotes('round-1');
      expect(result.total).toBe(1);
      expect(result.votes).toHaveLength(1);
    });

    it('returns empty results when the request fails', async () => {
      fetchBackendJson.mockRejectedValue(new Error('unauthorized'));

      await expect(getMyVotes('round-1')).resolves.toEqual({ votes: [], total: 0 });
    });
  });

  describe('getVotingLeaderboard', () => {
    it('returns leaderboard payload on success', async () => {
      const payload = { data: { submissions: [{ rank: 1, submission_id: 's1', title: 'A', applicant_name: 'B', vote_count: 3 }] } };
      fetchBackendJson.mockResolvedValue(payload);

      await expect(getVotingLeaderboard('round-1')).resolves.toEqual(payload);
    });

    it('returns null when the request fails', async () => {
      fetchBackendJson.mockRejectedValue(new Error('forbidden'));

      await expect(getVotingLeaderboard('round-1')).resolves.toBeNull();
    });
  });

  describe('castVote', () => {
    it('posts vote payload to the voting endpoint', async () => {
      fetchBackendJson.mockResolvedValue({ ok: true });

      await castVote('round-1', { submission_id: 'sub-1', email: 'a@b.com', name: 'A' });

      expect(fetchBackendJson).toHaveBeenCalledWith('/api/voting/round-1/vote', {
        method: 'POST',
        requireAuth: true,
        errorPrefix: 'Voting API',
        body: { submission_id: 'sub-1', email: 'a@b.com', name: 'A' },
      });
    });
  });
});
