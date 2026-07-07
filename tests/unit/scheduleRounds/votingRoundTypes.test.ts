import { describe, expect, it } from 'vitest';
import { isPublicVotingRoundRecord } from '../../../server/src/lib/votingRoundTypes.ts';

describe('isPublicVotingRoundRecord', () => {
  it('accepts canonical column types case-insensitively', () => {
    expect(isPublicVotingRoundRecord({ type: 'Public Voting' })).toBe(true);
    expect(isPublicVotingRoundRecord({ type: 'public rating' })).toBe(true);
    expect(isPublicVotingRoundRecord({ type: 'public' })).toBe(true);
    expect(isPublicVotingRoundRecord({ type: 'Voting' })).toBe(true);
  });

  it('accepts voting type stored only in settings', () => {
    expect(
      isPublicVotingRoundRecord({
        type: 'jury',
        settings: { type: 'Public Voting', evaluationLogic: 'scoring' },
      }),
    ).toBe(true);
  });

  it('accepts evaluationLogic voting when column type is legacy', () => {
    expect(
      isPublicVotingRoundRecord({
        type: 'custom',
        settings: { evaluationLogic: 'voting' },
      }),
    ).toBe(true);
  });

  it('rejects non-voting rounds', () => {
    expect(isPublicVotingRoundRecord({ type: 'Shortlisting' })).toBe(false);
    expect(isPublicVotingRoundRecord({ type: 'Nomination' })).toBe(false);
    expect(isPublicVotingRoundRecord(null)).toBe(false);
  });
});
