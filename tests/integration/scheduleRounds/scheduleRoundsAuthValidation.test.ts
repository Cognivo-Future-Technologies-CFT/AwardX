// @vitest-environment node
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ensureCanManageProgram = vi.fn();
const getSupabaseAdmin = vi.fn();

vi.mock('../../../server/src/middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'admin-1';
    next();
  },
}));

vi.mock('../../../server/src/middleware/programManagement.js', () => ({
  ensureCanManageProgram,
}));

vi.mock('../../../server/src/supabase.js', () => ({
  getSupabaseAdmin,
}));

vi.mock('../../../server/src/cache/redisCache.js', () => ({
  cacheKeys: {
    programRounds: (programId: string) => `program-rounds:${programId}`,
    programRoundEdges: (programId: string) => `program-round-edges:${programId}`,
    programStats: (programId: string) => `program-stats:${programId}`,
    roundSubmissions: (roundId: string) => `round-submissions:${roundId}`,
  },
  cacheTtls: { medium: 300, short: 30 },
  deleteCache: vi.fn(async () => {}),
  wrapWithCache: vi.fn(async (_key: string, _ttl: number, fn: () => Promise<any>) => fn()),
}));

import scheduleRoundsRouter from '../../../server/src/routes/scheduleRounds.ts';

describe('scheduleRounds mutation authorization and validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureCanManageProgram.mockResolvedValue({ ok: true, program: { id: 'program-1', organization_id: 'org-1' } });

    getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'rounds') {
          return {
            insert: (payload: any) => ({
              select: () => ({
                single: async () => ({ data: { id: 'round-1', ...payload }, error: null }),
              }),
            }),
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'round-1' }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    single: async () => ({ data: { id: 'round-1' }, error: null }),
                  }),
                }),
              }),
            }),
            delete: () => ({
              eq: () => ({
                eq: async () => ({ error: null }),
              }),
            }),
          };
        }

        if (table === 'round_edges') {
          return {
            delete: () => ({
              eq: () => ({ or: async () => ({ error: null }) }),
            }),
          };
        }

        if (table === 'programs') {
          return {
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        }

        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        };
      },
    });
  });

  it('returns 403 for unauthorized round creation', async () => {
    ensureCanManageProgram.mockResolvedValue({ ok: false, status: 403, error: 'Insufficient permissions' });

    const app = express();
    app.use(express.json());
    app.use(scheduleRoundsRouter);

    const response = await request(app).post('/program-1/rounds').send({
      title: 'Round 1',
      type: 'Nomination',
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Insufficient permissions');
  });

  it('returns 400 with field hints for invalid round payload', async () => {
    const app = express();
    app.use(express.json());
    app.use(scheduleRoundsRouter);

    const response = await request(app).post('/program-1/rounds').send({
      title: '',
      type: 'not-valid',
      start_date: 'bad-date',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.fields.title).toBeDefined();
    expect(response.body.fields.type).toBeDefined();
    expect(response.body.fields.start_date).toBeDefined();
  });

  it('rejects non-array edge payloads with structured 400', async () => {
    const app = express();
    app.use(express.json());
    app.use(scheduleRoundsRouter);

    const response = await request(app).put('/program-1/edges').send({ edges: 'bad' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.fields.edges).toContain('array');
  });
});
