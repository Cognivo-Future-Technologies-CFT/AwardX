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

import programSubmissionsRouter from '../../../server/src/routes/programSubmissions.ts';

describe('program submissions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureCanManageProgram.mockResolvedValue({
      ok: true,
      program: { id: 'program-1', organization_id: 'org-1' },
    });
  });

  it('creates a submission for an authorized program manager', async () => {
    const insert = vi.fn(() => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 'sub-1',
            program_id: 'program-1',
            category_id: null,
            title: 'Entry A',
            description: '',
            status: 'pending',
            applicant_name: 'Jane Doe',
            submitted_at: new Date().toISOString(),
            average_score: null,
            cover_image_url: null,
            categories: null,
          },
          error: null,
        }),
      }),
    }));

    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'categories') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'programs') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { active_form_id: 'form-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'submissions') {
          return { insert };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    });

    const app = express();
    app.use(express.json());
    app.use('/programs', programSubmissionsRouter as any);

    const res = await request(app)
      .post('/programs/program-1/submissions')
      .send({ title: 'Entry A', applicant: 'Jane Doe' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Entry A');
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
    app.use('/programs', programSubmissionsRouter as any);

    const res = await request(app)
      .post('/programs/program-1/submissions')
      .send({ title: 'Entry A', applicant: 'Jane Doe' });

    expect(res.status).toBe(403);
  });

  it('lists submissions for an authorized program manager', async () => {
    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table !== 'submissions') {
          throw new Error(`Unexpected table ${table}`);
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async () => ({
                  data: [
                    {
                      id: 'sub-1',
                      program_id: 'program-1',
                      title: 'Entry A',
                      status: 'pending',
                      applicant_name: 'Jane Doe',
                      submitted_at: new Date().toISOString(),
                      categories: { title: 'National' },
                      submission_judges: [{ judge_id: 'judge-1' }],
                    },
                  ],
                  count: 1,
                  error: null,
                }),
              }),
            }),
          }),
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use('/programs', programSubmissionsRouter as any);

    const res = await request(app).get('/programs/program-1/submissions?page=1&pageSize=15');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].title).toBe('Entry A');
  });

  it('includes legacy submissions without form_id when formId filter is provided', async () => {
    const or = vi.fn(() => ({
      range: async () => ({
        data: [
          {
            id: 'sub-legacy',
            program_id: 'program-1',
            title: 'Legacy Entry',
            status: 'pending',
            applicant_name: 'Alex',
            submitted_at: new Date().toISOString(),
            submission_data: null,
            categories: null,
            submission_judges: [],
          },
        ],
        count: 1,
        error: null,
      }),
    }));

    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table !== 'submissions') {
          throw new Error(`Unexpected table ${table}`);
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                or,
              }),
            }),
          }),
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use('/programs', programSubmissionsRouter as any);

    const res = await request(app).get(
      '/programs/program-1/submissions?page=1&pageSize=15&formId=form-abc',
    );

    expect(res.status).toBe(200);
    expect(or).toHaveBeenCalledWith(
      'submission_data->>form_id.eq.form-abc,submission_data->>form_id.is.null',
    );
    expect(res.body.data[0].title).toBe('Legacy Entry');
  });
});
