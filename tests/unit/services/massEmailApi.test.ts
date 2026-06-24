import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEmailSegments, getRoundsForEmail } from '../../../services/massEmailApi';

const fetchBackendJson = vi.fn();

vi.mock('../../../services/backendApi', () => ({
  fetchBackendJson: (...args: unknown[]) => fetchBackendJson(...args),
}));

describe('massEmailApi', () => {
  beforeEach(() => {
    fetchBackendJson.mockReset();
  });

  describe('getRoundsForEmail', () => {
    it('requests the /rounds endpoint with auth and encoded program id', async () => {
      fetchBackendJson.mockResolvedValue({
        data: [{ id: 'round-1', title: 'Finals', status: 'active' }],
      });

      const rounds = await getRoundsForEmail('prog id/with space');

      expect(fetchBackendJson).toHaveBeenCalledWith(
        '/api/schedule-rounds/prog%20id%2Fwith%20space/rounds',
        {
          requireAuth: true,
          errorPrefix: 'Rounds API',
        },
      );
      expect(rounds).toEqual([{ id: 'round-1', title: 'Finals', status: 'active' }]);
    });

    it('falls back to rounds property when data is absent', async () => {
      fetchBackendJson.mockResolvedValue({
        rounds: [{ id: 'round-2', title: 'Semi', status: 'completed' }],
      });

      const rounds = await getRoundsForEmail('prog-1');

      expect(rounds).toEqual([{ id: 'round-2', title: 'Semi', status: 'completed' }]);
    });

    it('returns an empty array when neither data nor rounds is present', async () => {
      fetchBackendJson.mockResolvedValue({});

      await expect(getRoundsForEmail('prog-1')).resolves.toEqual([]);
    });
  });

  describe('getEmailSegments', () => {
    it('requests segment data for the given program and round', async () => {
      const segmentData = {
        round: { id: 'round-1', title: 'Finals', type: 'judging', status: 'active' },
        segments: { winners: [], eliminated: [], active: [] },
        counts: { winners: 0, eliminated: 0, active: 0, total: 0 },
      };
      fetchBackendJson.mockResolvedValue({ data: segmentData });

      const result = await getEmailSegments('prog-1', 'round/1');

      expect(fetchBackendJson).toHaveBeenCalledWith(
        '/api/mass-email/prog-1/rounds/round%2F1/segments',
        {
          requireAuth: true,
          errorPrefix: 'Segments API',
        },
      );
      expect(result).toEqual(segmentData);
    });
  });
});
