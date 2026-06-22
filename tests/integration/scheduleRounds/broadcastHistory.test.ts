// @vitest-environment node
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  canSendMassEmail: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getOrgResendMailer: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock('../../../server/src/middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'user-1';
    next();
  },
}));

vi.mock('../../../server/src/supabase.js', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('../../../server/src/services/orgResend.js', () => ({
  getOrgResendMailer: mocks.getOrgResendMailer,
  formatOrgFromAddress: (config: any, name?: string) => name ? `${name} <${config.fromEmail}>` : config.from,
  RESEND_NOT_CONFIGURED_MESSAGE: 'Resend not configured mock message',
}));

vi.mock('../../../server/src/cache/redisCache.js', () => ({
  cacheKeys: {
    programRounds: (pId: string) => `program-rounds:${pId}`,
  },
  cacheTtls: { short: 30 },
  deleteCache: vi.fn(async () => {}),
  wrapWithCache: vi.fn(async (_key: string, _ttl: number, fn: () => Promise<any>) => fn()),
}));

import massEmailRouter from '../../../server/src/routes/massEmail.ts';

describe('Broadcasts Integration Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getOrgResendMailer.mockResolvedValue({
      resend: {
        emails: {
          send: mocks.resendSend,
        },
      },
      from: 'Test Organizer <no-reply@test.com>',
      config: {
        from: 'Test Organizer <no-reply@test.com>',
        fromEmail: 'no-reply@test.com',
        fromName: 'Test Organizer',
      },
    });

    mocks.resendSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });

    // Mock program permission select chain and logs select chain
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
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => ({
                    data: [
                      {
                        status: 'active',
                        roles: {
                          name: 'admin',
                          permissions: ['manage_programs'],
                        },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'email_logs') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      {
                        id: 'log-1',
                        recipient_email: 'recipient@test.com',
                        template_key: 'custom_broadcast',
                        status: 'sent',
                        error_message: null,
                        resend_message_id: 'msg-1',
                        created_at: '2026-06-22T14:00:00Z',
                        context_json: {
                          subject: 'Hello test',
                          body: 'Hello body text',
                        },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'log-2' }, error: null }),
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
  });

  describe('GET /:programId/history', () => {
    it('returns history list of email logs', async () => {
      const app = express();
      app.use(express.json());
      app.use(massEmailRouter);

      const response = await request(app).get('/program-1/history').send();

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.logs).toHaveLength(1);
      expect(response.body.logs[0].recipient_email).toBe('recipient@test.com');
      expect(response.body.logs[0].context_json.subject).toBe('Hello test');
    });
  });

  describe('POST /:programId/send-custom', () => {
    it('sends custom broadcast to multiple manual recipients', async () => {
      const app = RouterApp();

      const response = await request(app)
        .post('/program-1/send-custom')
        .send({
          recipients: [
            { email: 'user1@test.com', name: 'User 1', submissionTitle: 'Sub 1' },
            { email: 'user2@test.com', name: 'User 2', submissionTitle: 'Sub 2' },
          ],
          subject: 'Custom Broadcast: {{program_title}}',
          template: 'Hello {{name}} for {{submission_title}}',
          fromName: 'Custom Organizer',
          headerGradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.sent).toBe(2);
      expect(response.body.failed).toBe(0);

      expect(mocks.resendSend).toHaveBeenCalledTimes(2);
      expect(mocks.resendSend).toHaveBeenNthCalledWith(1, expect.objectContaining({
        from: 'Custom Organizer <no-reply@test.com>',
        to: 'user1@test.com',
        subject: 'Custom Broadcast: Test Program',
      }));
    });

    it('returns bad request for empty recipients array', async () => {
      const app = RouterApp();

      const response = await request(app)
        .post('/program-1/send-custom')
        .send({
          recipients: [],
          subject: 'Hello',
          template: 'Body',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('recipients must be a non-empty array');
    });

    it('returns bad request for missing subject or template', async () => {
      const app = RouterApp();

      const response = await request(app)
        .post('/program-1/send-custom')
        .send({
          recipients: [{ email: 'user1@test.com' }],
          subject: '',
          template: 'Body',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('subject is required');
    });
  });
});

function RouterApp() {
  const app = express();
  app.use(express.json());
  app.use(massEmailRouter);
  return app;
}
