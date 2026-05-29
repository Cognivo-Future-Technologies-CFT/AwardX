import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleRoundsView } from '../../../components/dashboard/scheduleRounds/ScheduleRoundsView';

const mocks = vi.hoisted(() => ({
  getRounds: vi.fn(),
  getEdges: vi.fn(),
  saveEdges: vi.fn(),
  updateRound: vi.fn(),
}));

vi.mock('../../../services/scheduleRoundsDb', () => ({
  scheduleRoundsService: {
    getRounds: mocks.getRounds,
    getEdges: mocks.getEdges,
    saveEdges: mocks.saveEdges,
    updateRound: mocks.updateRound,
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

vi.mock('../../../components/dashboard/scheduleRounds/WorkflowView', () => ({
  WorkflowView: () => <div data-testid="workflow-canvas" />,
}));

vi.mock('../../../components/dashboard/scheduleRounds/TileView', () => ({
  TileView: ({ onRoundReorder, rounds }: any) => (
    <button
      type="button"
      data-testid="tile-reorder-rounds"
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

describe('ScheduleRoundsView representation conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.updateRound.mockResolvedValue(buildRound('db-round-1', 0));
    mocks.getRounds.mockResolvedValue([buildRound('db-round-1', 0), buildRound('db-round-2', 1)]);
  });

  it('does not rewrite edges while in block diagram mode', async () => {
    mocks.getEdges.mockResolvedValue([
      {
        id: 'edge-custom',
        programId: 'program-1',
        sourceRoundId: 'db-round-1',
        targetRoundId: 'db-round-2',
        condition: { type: 'if_score_gte', score: 80 },
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<ScheduleRoundsView activeEvent={{ id: 'program-1' } as any} />);

    await waitFor(() => expect(screen.getByTestId('current-representation')).toHaveTextContent('Block diagram'));
    expect(screen.queryByTestId('tile-reorder-rounds')).not.toBeInTheDocument();
    expect(mocks.saveEdges).not.toHaveBeenCalled();
  });

  it('does not rewrite connections when reordering tiles', async () => {
    window.localStorage.setItem('awardx:schedule-representation:program-1', 'tiles');
    mocks.getEdges.mockResolvedValue([
      {
        id: 'edge-1',
        programId: 'program-1',
        sourceRoundId: 'db-round-1',
        targetRoundId: 'db-round-2',
        condition: { type: 'always' },
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<ScheduleRoundsView activeEvent={{ id: 'program-1' } as any} />);

    await waitFor(() => expect(screen.getByTestId('current-representation')).toHaveTextContent('Tile sequence'));
    fireEvent.click(screen.getByTestId('tile-reorder-rounds'));

    await waitFor(() => {
      expect(mocks.updateRound).toHaveBeenCalled();
    });
    expect(mocks.saveEdges).not.toHaveBeenCalled();
  });

  it('opens conversion dialog instead of switching views instantly', async () => {
    mocks.getEdges.mockResolvedValue([]);

    render(<ScheduleRoundsView activeEvent={{ id: 'program-1' } as any} />);

    await waitFor(() => expect(screen.getByTestId('convert-to-workflow')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('convert-to-workflow'));

    expect(screen.getByText('Convert tile sequence to block diagram')).toBeInTheDocument();
  });
});
