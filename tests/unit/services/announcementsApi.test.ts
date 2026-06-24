import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublicAnnouncements } from '../../../services/announcementsApi';

const fetchBackendJson = vi.fn();

vi.mock('../../../services/backendApi', () => ({
  fetchBackendJson: (...args: unknown[]) => fetchBackendJson(...args),
}));

describe('announcementsApi', () => {
  beforeEach(() => {
    fetchBackendJson.mockReset();
  });

  it('requests public announcements for encoded program id', async () => {
    const payload = { data: { program: { id: 'prog-1' }, winners: [] } };
    fetchBackendJson.mockResolvedValue(payload);

    await expect(getPublicAnnouncements('prog/with space')).resolves.toEqual(payload);
    expect(fetchBackendJson).toHaveBeenCalledWith(
      '/api/announcements/programs/prog%2Fwith%20space/public',
      { errorPrefix: 'Announcements API' },
    );
  });
});
