import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseAdmin = vi.fn();
const getRound = vi.fn();
const getSuccessorRounds = vi.fn();
const autoRandomAssign = vi.fn();
const autoSegmentedAssign = vi.fn();

vi.mock('../../../server/src/supabase.js', () => ({
  getSupabaseAdmin,
}));

vi.mock('../../../server/src/services/roundEngine.js', () => ({
  getRound,
  getSuccessorRounds,
}));

vi.mock('../../../server/src/services/judgeAssignment.js', () => ({
  autoRandomAssign,
  autoSegmentedAssign,
}));

import { executeAdvancement } from '../../../server/src/services/advancementEngine.ts';

function promiseQuery<T>(result: T) {
  const query: any = {
    eq: vi.fn(() => query),
    then: (resolve: (value: T) => void, reject?: (reason?: any) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe('executeAdvancement transactional path', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getRound.mockResolvedValue({
      id: 'round-1',
      program_id: 'program-1',
      status: 'completed',
      is_finalized: false,
      type: 'public',
      title: 'Public Round',
      advancement_criteria: { type: 'all_pass' },
    });
    getSuccessorRounds.mockResolvedValue([]);
  });

  it('returns an error when transactional RPC fails', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'rpc failed' } }));

    getSupabaseAdmin.mockReturnValue({
      rpc,
      from: (table: string) => {
        if (table === 'round_submissions') {
          return {
            select: () => promiseQuery({ data: [{ submission_id: 'sub-1' }], error: null }),
          };
        }
        if (table === 'public_votes') {
          return {
            select: () => promiseQuery({ data: [{ submission_id: 'sub-1' }], error: null }),
          };
        }
        if (table === 'round_edges') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const result = await executeAdvancement('round-1', [], 'manager-1');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('rpc failed');
    expect(autoRandomAssign).not.toHaveBeenCalled();
    expect(autoSegmentedAssign).not.toHaveBeenCalled();
  });

  it('returns success with event id when transactional RPC succeeds', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ event_id: 'event-1', advanced_count: 1, eliminated_count: 0 }],
      error: null,
    }));

    getSupabaseAdmin.mockReturnValue({
      rpc,
      from: (table: string) => {
        if (table === 'round_submissions') {
          return {
            select: () => promiseQuery({ data: [{ submission_id: 'sub-1' }], error: null }),
          };
        }
        if (table === 'public_votes') {
          return {
            select: () => promiseQuery({ data: [{ submission_id: 'sub-1' }], error: null }),
          };
        }
        if (table === 'round_edges') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const result = await executeAdvancement('round-1', [], 'manager-1');

    expect(result.ok).toBe(true);
    expect(result.eventId).toBe('event-1');
    expect(rpc).toHaveBeenCalledWith('execute_round_advancement_tx', expect.any(Object));
  });
});
