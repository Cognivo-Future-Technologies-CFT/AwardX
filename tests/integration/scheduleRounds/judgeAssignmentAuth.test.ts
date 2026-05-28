// @vitest-environment node
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const canManageProgram = vi.fn();
const getRound = vi.fn();
const autoRandomAssign = vi.fn();

vi.mock('../../../server/src/middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'manager-1';
    next();
  },
}));

vi.mock('../../../server/src/middleware/programManagement.js', () => ({
  canManageProgram,
}));

vi.mock('../../../server/src/services/roundEngine.js', () => ({
  getRound,
}));

vi.mock('../../../server/src/services/judgeAssignment.js', () => ({
  autoRandomAssign,
  autoSegmentedAssign: vi.fn(),
  manualAssign: vi.fn(),
  getAssignmentsByRound: vi.fn(async () => []),
  removeAssignment: vi.fn(),
  clearRoundAssignments: vi.fn(),
}));

vi.mock('../../../server/src/cache/redisCache.js', () => ({
  cacheKeys: {
    roundSubmissions: (roundId: string) => `round-submissions:${roundId}`,
  },
  deleteCache: vi.fn(async () => {}),
}));

vi.mock('../../../server/src/supabase.js', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  })),
}));

import judgeAssignmentRouter from '../../../server/src/routes/judgeAssignment.ts';

describe('judgeAssignment route authorization and validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRound.mockResolvedValue({ id: 'round-1', program_id: 'server-program' });
    canManageProgram.mockResolvedValue(true);
    autoRandomAssign.mockResolvedValue({ ok: true, assigned: 4 });
  });

  it('blocks assignment when caller lacks permissions', async () => {
    canManageProgram.mockResolvedValue(false);

    const app = express();
    app.use(express.json());
    app.use(judgeAssignmentRouter);

    const response = await request(app).post('/rounds/round-1/assign-judges').send({
      strategy: 'random',
      config: { judges_per_submission: 3 },
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Insufficient permissions');
    expect(autoRandomAssign).not.toHaveBeenCalled();
  });

  it('derives program_id from round server-side', async () => {
    const app = express();
    app.use(express.json());
    app.use(judgeAssignmentRouter);

    const response = await request(app).post('/rounds/round-1/assign-judges').send({
      strategy: 'random',
      program_id: 'forged-client-program',
      config: { judges_per_submission: 2 },
    });

    expect(response.status).toBe(200);
    expect(autoRandomAssign).toHaveBeenCalledWith('round-1', 'server-program', 2, 'manager-1');
  });

  it('returns field-level 400 errors for invalid assignment config', async () => {
    const app = express();
    app.use(express.json());
    app.use(judgeAssignmentRouter);

    const response = await request(app).post('/rounds/round-1/assign-judges').send({
      strategy: 'random',
      config: { judges_per_submission: 0 },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.fields.judges_per_submission).toContain('between');
  });
});
