import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleRoundsView } from '../../../components/dashboard/scheduleRounds/ScheduleRoundsView';

const getRounds = vi.fn();
const getEdges = vi.fn();
const saveEdges = vi.fn();
const updateRound = vi.fn();

vi.mock('../../../services/scheduleRoundsDb', () => ({
  scheduleRoundsService: {
    getRounds,
    getEdges,
    saveEdges,
    updateRound,
    createRound: vi.fn(),
    deleteRound: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({
  roundSubmissions: {
    getByRound: vi.fn(async () => ({ data: [], error: null })),
  },
}));

vi.mock('../../../services/roundPipelineApi', () => ({
  activateRound: vi.fn(async () => ({ ok: true })),
  completeRound: vi.fn(async () => ({ ok: true })),
  executeAdvancement: vi.fn(async () => ({ ok: true })),
  previewAdvancement: vi.fn(async () => ({
    advancing: [],
    eliminated: [],
    ties: [],
    hasEmptyScores: false,
    totalParticipants: 0,
  })),
}));

vi.mock('../../../components/dashboard/scheduleRounds/RoundScheduler', () => ({
  RoundScheduler: ({ rounds, onRoundReorder }: any) => (
    <button
      type="button"
      data-testid="reorder-rounds"
      onClick={() =>
        onRoundReorder(
          rounds.map((round: any, index: number) => ({
            ...round,
            order: index,
          })),
        )
      }
    >
      reorder
    </button>
  ),
}));

function buildRound(id: string, order: number) {
  return {
    id,
    programId: 'program-1',
    name: `Round ${order + 1}`,
    type: order === 0 ? 'Nomination' : 'Shortlisting',
    evaluationLogic: 'scoring',
    evaluatorStrategy: 'all_judges',
    blindEvaluation: false,
    startCondition: { type: 'manual_trigger' as const },
    endCondition: { type: 'manual_close' as const },
    shortlistConfig: {
      enabled: order > 0,
      method: 'percentage' as const,
      value: 50,
      visibility: ['admin' as const],
    },
    order,
    status: 'draft' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

describe('ScheduleRoundsView edge persistence guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateRound.mockResolvedValue(buildRound('round-1', 0));
    getRounds.mockResolvedValue([buildRound('round-1', 0), buildRound('round-2', 1)]);
  });

  it('does not overwrite existing custom graph edges on passive reorder', async () => {
    getEdges.mockResolvedValue([
      {
        id: 'edge-custom',
        programId: 'program-1',
        sourceRoundId: 'round-1',
        targetRoundId: 'round-2',
        condition: { type: 'if_score_gte', score: 80 },
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<ScheduleRoundsView activeEvent={{ id: 'program-1' } as any} />);

    await waitFor(() => expect(getRounds).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('reorder-rounds'));

    await waitFor(() => {
      expect(saveEdges).not.toHaveBeenCalled();
    });
  });

  it('persists linear edges when no custom workflow exists', async () => {
    getEdges.mockResolvedValue([
      {
        id: 'edge-1',
        programId: 'program-1',
        sourceRoundId: 'round-1',
        targetRoundId: 'round-2',
        condition: { type: 'always' },
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ]);
    saveEdges.mockResolvedValue([]);

    render(<ScheduleRoundsView activeEvent={{ id: 'program-1' } as any} />);

    await waitFor(() => expect(getRounds).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('reorder-rounds'));

    await waitFor(() => {
      expect(saveEdges).toHaveBeenCalled();
    });
  });
});
