import { describe, expect, it } from 'vitest';
import {
  isPublicVotingRoundRecord,
  isVotingRoundOpen,
} from '../../../server/src/lib/votingRoundTypes.ts';

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

describe('isVotingRoundOpen', () => {
  it('treats active status as open', () => {
    expect(isVotingRoundOpen({ status: 'active' })).toBe(true);
  });

  it('blocks cancelled and draft', () => {
    expect(isVotingRoundOpen({ status: 'cancelled' })).toBe(false);
    expect(isVotingRoundOpen({ status: 'draft' })).toBe(false);
  });

  it('keeps completed rounds open while end_date is still ahead', () => {
    const start = new Date(Date.now() - 86400000).toISOString();
    const end = new Date(Date.now() + 86400000).toISOString();
    expect(isVotingRoundOpen({ status: 'completed', start_date: start, end_date: end })).toBe(true);
  });

  it('closes completed rounds after end_date', () => {
    const start = new Date(Date.now() - 3 * 86400000).toISOString();
    const end = new Date(Date.now() - 86400000).toISOString();
    expect(isVotingRoundOpen({ status: 'completed', start_date: start, end_date: end })).toBe(false);
  });
});
