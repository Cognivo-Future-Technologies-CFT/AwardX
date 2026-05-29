import { describe, expect, it } from 'vitest';
import {
  convertToTilesRepresentation,
  convertToWorkflowRepresentation,
  flowsAreEquivalent,
  hasCustomWorkflowEdges,
  inferRepresentation,
  topologicalSortRounds,
} from '../../../lib/roundRepresentationConversion';
import type { Round, RoundEdge } from '../../../types/scheduleRounds';

function round(id: string, order: number, position?: { x: number; y: number }): Round {
  return {
    id,
    programId: 'program-1',
    name: id,
    type: 'Shortlisting',
    evaluationLogic: 'scoring',
    evaluatorStrategy: 'all_judges',
    blindEvaluation: false,
    startCondition: { type: 'manual_trigger' },
    endCondition: { type: 'manual_close' },
    shortlistConfig: { enabled: true, method: 'percentage', value: 50, visibility: ['admin'] },
    order,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    position,
  };
}

const branchingEdges: RoundEdge[] = [
  {
    id: 'e1',
    programId: 'program-1',
    sourceRoundId: 'a',
    targetRoundId: 'b',
    condition: { type: 'if_score_gte', score: 70 },
    order: 0,
    createdAt: new Date().toISOString(),
  },
];

describe('roundRepresentationConversion', () => {
  it('detects custom workflow edges', () => {
    const rounds = [round('a', 0), round('b', 1)];
    expect(hasCustomWorkflowEdges(rounds, branchingEdges)).toBe(true);
    expect(inferRepresentation(rounds, branchingEdges)).toBe('workflow');
  });

  it('preserves flow when converting block diagram to tiles', () => {
    const rounds = [round('a', 0, { x: 10, y: 10 }), round('b', 1, { x: 400, y: 10 })];
    const converted = convertToTilesRepresentation('program-1', rounds, branchingEdges);
    expect(converted.rounds.every((item) => item.position === undefined)).toBe(true);
    expect(flowsAreEquivalent(branchingEdges, converted.edges)).toBe(true);
  });

  it('preserves flow on block diagram round-trip', () => {
    const rounds = [round('a', 0, { x: 10, y: 10 }), round('b', 1, { x: 400, y: 10 })];
    const asTiles = convertToTilesRepresentation('program-1', rounds, branchingEdges);
    const backToWorkflow = convertToWorkflowRepresentation('program-1', asTiles.rounds, asTiles.edges);
    expect(flowsAreEquivalent(branchingEdges, backToWorkflow.edges)).toBe(true);
    expect(backToWorkflow.rounds[0].position).toBeDefined();
  });

  it('creates sequential edges only when none exist', () => {
    const rounds = [round('a', 0), round('b', 1), round('c', 2)];
    const converted = convertToWorkflowRepresentation('program-1', rounds, []);
    expect(converted.edges).toHaveLength(2);
    expect(converted.edges.every((edge) => edge.condition?.type === 'always')).toBe(true);
  });

  it('topologically sorts rounds for display order', () => {
    const rounds = [round('a', 0), round('b', 1), round('c', 2)];
    const edges: RoundEdge[] = [
      {
        id: 'e1',
        programId: 'program-1',
        sourceRoundId: 'a',
        targetRoundId: 'c',
        condition: { type: 'always' },
        order: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'e2',
        programId: 'program-1',
        sourceRoundId: 'c',
        targetRoundId: 'b',
        condition: { type: 'always' },
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    const sorted = topologicalSortRounds(rounds, edges).filter((item) => !item.id.startsWith('round-'));
    expect(sorted.map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });
});
