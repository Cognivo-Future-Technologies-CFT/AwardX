// @vitest-environment node
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensureCanManageProgram: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('../../../server/src/middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'user-1';
    next();
  },
}));

vi.mock('../../../server/src/middleware/programManagement.js', () => ({
  ensureCanManageProgram: mocks.ensureCanManageProgram,
}));

vi.mock('../../../server/src/supabase.js', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

import programCategoriesRouter from '../../../server/src/routes/programCategories.ts';

describe('program categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureCanManageProgram.mockResolvedValue({
      ok: true,
      program: { id: 'program-1', organization_id: 'org-1' },
    });
  });

  it('creates a category for an authorized program manager', async () => {
    const insert = vi.fn(() => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 'cat-1',
            program_id: 'program-1',
            parent_id: null,
            title: 'Best Design',
            entries_count: 0,
          },
          error: null,
        }),
      }),
    }));

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const ilikeMock = vi.fn().mockReturnThis();
    const isMock = vi.fn().mockReturnThis();
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });

    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'categories') {
          return {
            select: selectMock,
            eq: eqMock,
            ilike: ilikeMock,
            is: isMock,
            maybeSingle: maybeSingleMock,
            insert,
          };
        }
        if (table === 'programs') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { organization_id: 'org-1' }, error: null }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    });

    const app = express();
    app.use(express.json());
    app.use('/programs', programCategoriesRouter);

    const res = await request(app)
      .post('/programs/program-1/categories')
      .send({ title: 'Best Design' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Best Design');
    expect(insert).toHaveBeenCalled();
  });

  it('returns 403 when user cannot manage the program', async () => {
    mocks.ensureCanManageProgram.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Insufficient permissions',
    });

    const app = express();
    app.use(express.json());
    app.use('/programs', programCategoriesRouter);

    const res = await request(app)
      .post('/programs/program-1/categories')
      .send({ title: 'Blocked' });

    expect(res.status).toBe(403);
  });

  it('deletes all categories for an authorized program manager', async () => {
    const deleteMock = vi.fn().mockResolvedValue({ error: null });

    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'categories') {
          return {
            delete: () => ({
              eq: deleteMock,
            }),
          };
        }
        if (table === 'programs') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { organization_id: 'org-1' }, error: null }),
              }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    });

    const app = express();
    app.use(express.json());
    app.use('/programs', programCategoriesRouter);

    const res = await request(app)
      .delete('/programs/program-1/categories');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith('program_id', 'program-1');
  });
});
