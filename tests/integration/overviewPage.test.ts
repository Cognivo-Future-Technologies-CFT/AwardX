// @vitest-environment node
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('../../server/src/supabase.js', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('../../server/src/cache/redisCache.js', () => ({
  wrapWithCache: async (key: string, ttl: number, cb: () => Promise<any>) => cb(),
  deleteCache: async () => {},
  cacheKeys: {
    programOverview: (id: string) => `programOverview:${id}`,
  },
  cacheTtls: {
    medium: 300,
  },
}));

import overviewRouter from '../../server/src/routes/overviewPage.ts';

describe('overviewPage API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns program overview including active_form_id', async () => {
    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'programs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: async () => ({
              data: {
                id: 'program-123',
                title: 'Test Program',
                slug: 'test-program',
                active_form_id: 'form-active-456',
                visibility: 'public',
              },
              error: null,
            }),
          };
        }
        if (table === 'program_page_configs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: async () => ({
              data: { is_published: true },
              error: null,
            }),
          };
        }
        if (table === 'program_page_sections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: async () => ({
              data: [],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: async () => ({
            data: [],
            error: null,
          }),
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use('/overview', overviewRouter as any);

    const res = await request(app).get('/overview/public/program-123');

    expect(res.status).toBe(200);
    expect(res.body.data.program.id).toBe('program-123');
    expect(res.body.data.program.active_form_id).toBe('form-active-456');
  });
});
