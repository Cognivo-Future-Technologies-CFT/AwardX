// @vitest-environment node
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const canManageProgram = vi.fn();
const getRound = vi.fn();
const activateRound = vi.fn();

vi.mock('../../../server/src/middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'user-1';
    next();
  },
}));

vi.mock('../../../server/src/middleware/programManagement.js', () => ({
  canManageProgram,
}));

vi.mock('../../../server/src/services/roundEngine.js', () => ({
  activateRound,
  completeRound: vi.fn(),
  finalizeRound: vi.fn(),
  cancelRound: vi.fn(),
  getRound,
  getRoundStatus: vi.fn(),
  getPipelineStatus: vi.fn(async () => ({ rounds: [], edges: [] })),
}));

vi.mock('../../../server/src/cache/redisCache.js', () => ({
  cacheKeys: {
    programRounds: (programId: string) => `program-rounds:${programId}`,
    pipelineStatus: (programId: string) => `pipeline-status:${programId}`,
    programStats: (programId: string) => `program-stats:${programId}`,
  },
  cacheTtls: { short: 30 },
  deleteCache: vi.fn(async () => {}),
  wrapWithCache: vi.fn(async (_key: string, _ttl: number, fn: () => Promise<any>) => fn()),
}));

import roundExecutionRouter from '../../../server/src/routes/roundExecution.ts';

describe('roundExecution route authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRound.mockResolvedValue({ id: 'round-1', program_id: 'program-1' });
    canManageProgram.mockResolvedValue(true);
    activateRound.mockResolvedValue({ ok: true });
  });

  it('returns 403 when user cannot manage the round program', async () => {
    canManageProgram.mockResolvedValue(false);

    const app = express();
    app.use(express.json());
    app.use(roundExecutionRouter);

    const response = await request(app).post('/rounds/round-1/activate').send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Insufficient permissions');
    expect(activateRound).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown rounds before mutating', async () => {
    getRound.mockResolvedValue(null);

    const app = express();
    app.use(express.json());
    app.use(roundExecutionRouter);

    const response = await request(app).post('/rounds/missing-round/activate').send({});

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Round not found');
    expect(activateRound).not.toHaveBeenCalled();
  });

  it('allows authorized lifecycle mutations', async () => {
    const app = express();
    app.use(express.json());
    app.use(roundExecutionRouter);

    const response = await request(app).post('/rounds/round-1/activate').send({});

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(activateRound).toHaveBeenCalledWith('round-1', 'user-1');
  });
});
