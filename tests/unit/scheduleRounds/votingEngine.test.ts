import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALREADY_VOTED_IN_ROUND_MESSAGE,
  castVote,
} from '../../../server/src/services/votingEngine.ts';

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

  it('returns insert error when public_votes insert fails', async () => {
    mocks.getSupabaseAdmin.mockReturnValue({
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
                single: async () => ({ data: null, error: { message: 'insert failed' } }),
              }),
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const result = await castVote('round-1', 'submission-1', { userId: 'user-1' });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('insert failed');
  });

  it('succeeds when public_votes insert succeeds (DB triggers update votes_count)', async () => {
    mocks.getSupabaseAdmin.mockReturnValue({
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
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const result = await castVote('round-1', 'submission-1', { userId: 'user-2' });

    expect(result.ok).toBe(true);
  });

  it('returns a friendly message when insert hits a duplicate vote constraint', async () => {
    mocks.getSupabaseAdmin.mockReturnValue({
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
                    votes_per_user: 5,
                    votes_per_submission: 1,
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
                single: async () => ({
                  data: null,
                  error: {
                    code: '23505',
                    message: 'duplicate key value violates unique constraint "public_votes_submission_id_ip_address_key"',
                  },
                }),
              }),
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const result = await castVote('round-1', 'submission-1', {
      userId: 'user-3',
      ipAddress: '127.0.0.1',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe(ALREADY_VOTED_IN_ROUND_MESSAGE);
  });
});
