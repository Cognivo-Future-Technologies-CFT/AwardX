// @vitest-environment node
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  canManageProgram: vi.fn(),
  getRound: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getOrgResendMailerForProgram: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock('../../../server/src/middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'user-1';
    next();
  },
}));

vi.mock('../../../server/src/middleware/programManagement.js', () => ({
  canManageProgram: mocks.canManageProgram,
}));

vi.mock('../../../server/src/services/roundEngine.js', () => ({
  getRound: mocks.getRound,
}));

vi.mock('../../../server/src/supabase.js', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('../../../server/src/services/orgResend.js', () => ({
  getOrgResendMailerForProgram: mocks.getOrgResendMailerForProgram,
  RESEND_NOT_CONFIGURED_MESSAGE: 'Resend not configured mock message',
}));

vi.mock('../../../server/src/cache/redisCache.js', () => ({
  cacheKeys: {
    programRounds: (pId: string) => `program-rounds:${pId}`,
    pipelineStatus: (pId: string) => `pipeline-status:${pId}`,
    advancementHistory: (pId: string) => `advancement-history:${pId}`,
  },
  cacheTtls: { short: 30 },
  deleteCache: vi.fn(async () => {}),
  wrapWithCache: vi.fn(async (_key: string, _ttl: number, fn: () => Promise<any>) => fn()),
}));

import advancementRouter from '../../../server/src/routes/advancement.ts';

describe('POST /rounds/:roundId/inform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRound.mockResolvedValue({ id: 'round-1', program_id: 'program-1', title: 'Round 1' });
    mocks.canManageProgram.mockResolvedValue(true);
    mocks.getOrgResendMailerForProgram.mockResolvedValue({
      resend: {
        emails: {
          send: mocks.resendSend,
        },
      },
      from: 'Test Organizer <no-reply@test.com>',
      organizationId: 'org-1',
    });

    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === 'programs') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'program-1', title: 'Test Program', organization_id: 'org-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'round_submissions') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  {
                    submission_id: 'sub-1',
                    status: 'advanced',
                    submissions: {
                      id: 'sub-1',
                      title: 'Sub 1',
                      applicant_name: 'Applicant 1',
                      applicant_email: 'app1@test.com',
                      applicant_id: 'app-user-1',
                      profiles: null,
                    },
                  },
                  {
                    submission_id: 'sub-2',
                    status: 'eliminated',
                    submissions: {
                      id: 'sub-2',
                      title: 'Sub 2',
                      applicant_name: 'Applicant 2',
                      applicant_email: 'app2@test.com',
                      applicant_id: 'app-user-2',
                      profiles: null,
                    },
                  },
                  {
                    submission_id: 'sub-3',
                    status: 'active',
                    submissions: {
                      id: 'sub-3',
                      title: 'Sub 3',
                      applicant_name: 'Applicant 3',
                      applicant_email: 'app3@test.com',
                      applicant_id: 'app-user-3',
                      profiles: null,
                    },
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'email_logs') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'log-1' }, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        };
      },
    });

    mocks.resendSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
  });

  it('returns 403 when user cannot manage the program', async () => {
    mocks.canManageProgram.mockResolvedValue(false);

    const app = express();
    app.use(express.json());
    app.use(advancementRouter);

    const response = await request(app).post('/rounds/round-1/inform').send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Insufficient permissions');
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown rounds', async () => {
    mocks.getRound.mockResolvedValue(null);

    const app = express();
    app.use(express.json());
    app.use(advancementRouter);

    const response = await request(app).post('/rounds/missing-round/inform').send({});

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Round not found');
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it('returns 503 when Resend is not configured', async () => {
    mocks.getOrgResendMailerForProgram.mockResolvedValue(null);

    const app = express();
    app.use(express.json());
    app.use(advancementRouter);

    const response = await request(app).post('/rounds/round-1/inform').send({});

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('Resend not configured mock message');
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it('successfully triggers Resend emails and logs to email_logs', async () => {
    const app = express();
    app.use(express.json());
    app.use(advancementRouter);

    const response = await request(app).post('/rounds/round-1/inform').send({});

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.sent).toBe(3);
    expect(response.body.failed).toBe(0);

    expect(mocks.resendSend).toHaveBeenCalledTimes(3);

    // Advanced email checks
    expect(mocks.resendSend).toHaveBeenNthCalledWith(1, expect.objectContaining({
      to: 'app1@test.com',
      subject: "Congratulations! You've advanced in Test Program",
    }));

    // Eliminated email checks
    expect(mocks.resendSend).toHaveBeenNthCalledWith(2, expect.objectContaining({
      to: 'app2@test.com',
      subject: 'Update on your application: Test Program',
    }));

    // Active email checks
    expect(mocks.resendSend).toHaveBeenNthCalledWith(3, expect.objectContaining({
      to: 'app3@test.com',
      subject: 'Application status update: Test Program',
    }));
  });

  it('returns appropriate sent and failed counts if emails fail to send', async () => {
    mocks.resendSend
      .mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null }) // sub-1 ok
      .mockResolvedValueOnce({ data: null, error: { message: 'Mock Resend Error' } }) // sub-2 fail
      .mockRejectedValueOnce(new Error('Network failure')); // sub-3 reject

    const app = express();
    app.use(express.json());
    app.use(advancementRouter);

    const response = await request(app).post('/rounds/round-1/inform').send({});

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.sent).toBe(1);
    expect(response.body.failed).toBe(2);
  });
});
