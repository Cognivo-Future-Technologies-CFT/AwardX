import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getRound: vi.fn(),
  getSuccessorRounds: vi.fn(),
  autoRandomAssign: vi.fn(),
  autoSegmentedAssign: vi.fn(),
}));

vi.mock('../../../server/src/supabase.js', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('../../../server/src/services/roundEngine.js', () => ({
  getRound: mocks.getRound,
  getSuccessorRounds: mocks.getSuccessorRounds,
}));

vi.mock('../../../server/src/services/judgeAssignment.js', () => ({
  autoRandomAssign: mocks.autoRandomAssign,
  autoSegmentedAssign: mocks.autoSegmentedAssign,
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

    mocks.getRound.mockResolvedValue({
      id: 'round-1',
      program_id: 'program-1',
      status: 'completed',
      is_finalized: false,
      type: 'public',
      title: 'Public Round',
      advancement_criteria: { type: 'all_pass' },
    });
    mocks.getSuccessorRounds.mockResolvedValue([]);
  });

  it('returns an error when transactional RPC fails', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'rpc failed' } }));

    mocks.getSupabaseAdmin.mockReturnValue({
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
    expect(mocks.autoRandomAssign).not.toHaveBeenCalled();
    expect(mocks.autoSegmentedAssign).not.toHaveBeenCalled();
  });

  it('returns success with event id when transactional RPC succeeds', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ event_id: 'event-1', advanced_count: 1, eliminated_count: 0 }],
      error: null,
    }));

    mocks.getSupabaseAdmin.mockReturnValue({
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
