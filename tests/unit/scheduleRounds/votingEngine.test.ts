import { beforeEach, describe, expect, it, vi } from 'vitest';
import { castVote } from '../../../server/src/services/votingEngine.ts';

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('../../../server/src/supabase.js', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

function promiseQuery<T>(result: T) {
  const query: any = {
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    then: (resolve: (value: T) => void, reject?: (reason?: any) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe('votingEngine vote count consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rolls back inserted vote when atomic increment RPC fails', async () => {
    const deleteEq = vi.fn(async () => ({ error: null }));
    const rpc = vi.fn(async () => ({ error: { message: 'rpc missing' } }));

    mocks.getSupabaseAdmin.mockReturnValue({
      rpc,
      from: (table: string) => {
        if (table === 'rounds') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 'round-1', type: 'Public Voting', status: 'active', programs: null },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'voting_configs') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    votes_per_user: 0,
                    votes_per_submission: 0,
                    require_auth: false,
                    allow_anonymous: true,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'round_submissions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({ data: { id: 'enrollment-1' }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'public_votes') {
          return {
            select: () => promiseQuery({ data: [], count: 0 }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'vote-1' }, error: null }),
              }),
            }),
            delete: () => ({
              eq: deleteEq,
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const result = await castVote('round-1', 'submission-1', { userId: 'user-1' });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('rpc missing');
    expect(deleteEq).toHaveBeenCalledWith('id', 'vote-1');
  });

  it('keeps inserted vote when increment RPC succeeds', async () => {
    const deleteEq = vi.fn(async () => ({ error: null }));
    const rpc = vi.fn(async () => ({ error: null }));

    mocks.getSupabaseAdmin.mockReturnValue({
      rpc,
      from: (table: string) => {
        if (table === 'rounds') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 'round-1', type: 'Public Voting', status: 'active', programs: null },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'voting_configs') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    votes_per_user: 0,
                    votes_per_submission: 0,
                    require_auth: false,
                    allow_anonymous: true,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'round_submissions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    single: async () => ({ data: { id: 'enrollment-1' }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'public_votes') {
          return {
            select: () => promiseQuery({ data: [], count: 0 }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'vote-2' }, error: null }),
              }),
            }),
            delete: () => ({
              eq: deleteEq,
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const result = await castVote('round-1', 'submission-1', { userId: 'user-2' });

    expect(result.ok).toBe(true);
    expect(deleteEq).not.toHaveBeenCalled();
  });
});
