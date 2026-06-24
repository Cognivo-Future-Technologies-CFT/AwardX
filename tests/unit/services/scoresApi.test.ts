import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitJudgeScores } from '../../../services/scoresApi';

const fetchBackendJson = vi.fn();

vi.mock('../../../services/backendApi', () => ({
  fetchBackendJson: (...args: unknown[]) => fetchBackendJson(...args),
}));

describe('scoresApi', () => {
  beforeEach(() => {
    fetchBackendJson.mockReset();
  });

  it('posts judge score payload to judge-submit endpoint', async () => {
    const body = {
      token: 'invite-token',
      submissionJudgeId: 'sj-1',
      criteriaScores: [{ criterionId: 'c1', score: 8 }],
      overallComment: 'Strong entry',
    };
    fetchBackendJson.mockResolvedValue({ ok: true });

    await expect(submitJudgeScores(body)).resolves.toEqual({ ok: true });
    expect(fetchBackendJson).toHaveBeenCalledWith('/api/scores/judge-submit', {
      method: 'POST',
      body,
      errorPrefix: 'Scores API',
    });
  });
});
