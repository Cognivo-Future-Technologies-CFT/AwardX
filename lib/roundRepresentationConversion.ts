import { buildLinearEdges } from './roundScheduleUtils';
import type { Round, RoundEdge } from '../types/scheduleRounds';

export type ScheduleRepresentation = 'workflow' | 'tiles';

export interface ConversionAnalysis {
  canConvert: boolean;
  warnings: string[];
  willSimplifyBranching: boolean;
  willReorderRounds: boolean;
}

const STORAGE_PREFIX = 'awardx:schedule-representation:';

export function representationStorageKey(programId: string): string {
  return `${STORAGE_PREFIX}${programId}`;
}

export function readStoredRepresentation(programId: string): ScheduleRepresentation | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(representationStorageKey(programId));
  return raw === 'workflow' || raw === 'tiles' ? raw : null;
}

export function writeStoredRepresentation(programId: string, mode: ScheduleRepresentation): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(representationStorageKey(programId), mode);
}

export function readScheduleRepresentation(programId: string): ScheduleRepresentation {
  return readStoredRepresentation(programId) ?? 'tiles';
}

export function toggleScheduleRepresentation(mode: ScheduleRepresentation): ScheduleRepresentation {
  return mode === 'tiles' ? 'workflow' : 'tiles';
}

export function holdHintForScheduleMode(mode: ScheduleRepresentation): string {
  return mode === 'tiles' ? 'Hold to view flow' : 'Hold to view tiles';
}

export function hasCustomWorkflowEdges(orderedRounds: Round[], edges: RoundEdge[]): boolean {
  if (edges.length === 0) return false;

  const realRounds = orderedRounds.filter((round) => !round.id.startsWith('round-'));
  if (realRounds.length <= 1) {
    return edges.length > 0;
  }

  const expectedPairs = new Set<string>();
  for (let idx = 0; idx < realRounds.length - 1; idx += 1) {
    expectedPairs.add(`${realRounds[idx].id}->${realRounds[idx + 1].id}`);
  }

  const seenPairs = new Set<string>();
  for (const edge of edges) {
    const conditionType = String((edge.condition as any)?.type || 'always').toLowerCase();
    if (conditionType !== 'always') {
      return true;
    }

    const pair = `${edge.sourceRoundId}->${edge.targetRoundId}`;
    if (!expectedPairs.has(pair) || seenPairs.has(pair)) {
      return true;
    }
    seenPairs.add(pair);
  }

  return seenPairs.size !== expectedPairs.size;
}

/** Infer how the program is currently represented in the UI. */
export function inferRepresentation(rounds: Round[], edges: RoundEdge[]): ScheduleRepresentation {
  if (hasCustomWorkflowEdges(rounds, edges)) {
    return 'workflow';
  }
  if (rounds.some((round) => round.position && Number.isFinite(round.position.x) && Number.isFinite(round.position.y))) {
    return 'workflow';
  }
  return 'tiles';
}

function sortRoundsByOrder(rounds: Round[]): Round[] {
  return [...rounds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Topological order for DAG edges; falls back to `order` for disconnected nodes. */
export function topologicalSortRounds(rounds: Round[], edges: RoundEdge[]): Round[] {
  const realRounds = rounds.filter((round) => !round.id.startsWith('round-'));
  if (realRounds.length === 0) return sortRoundsByOrder(rounds);

  const roundById = new Map(realRounds.map((round) => [round.id, round]));
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const round of realRounds) {
    indegree.set(round.id, 0);
    adjacency.set(round.id, []);
  }

  for (const edge of edges) {
    if (!roundById.has(edge.sourceRoundId) || !roundById.has(edge.targetRoundId)) continue;
    if (edge.sourceRoundId === edge.targetRoundId) continue;
    adjacency.get(edge.sourceRoundId)!.push(edge.targetRoundId);
    indegree.set(edge.targetRoundId, (indegree.get(edge.targetRoundId) || 0) + 1);
  }

  const queue = realRounds
    .filter((round) => (indegree.get(round.id) || 0) === 0)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((round) => round.id);

  const sortedIds: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sortedIds.push(nodeId);
    for (const neighbor of adjacency.get(nodeId) || []) {
      const nextDegree = (indegree.get(neighbor) || 0) - 1;
      indegree.set(neighbor, nextDegree);
      if (nextDegree === 0) {
        queue.push(neighbor);
        queue.sort((a, b) => (roundById.get(a)?.order ?? 0) - (roundById.get(b)?.order ?? 0));
      }
    }
  }

  const unsorted = realRounds
    .filter((round) => !sortedIds.includes(round.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const orderedReal = [...sortedIds.map((id) => roundById.get(id)!), ...unsorted];
  const tempRounds = rounds.filter((round) => round.id.startsWith('round-'));

  return [...orderedReal, ...tempRounds].map((round, index) => ({ ...round, order: index }));
}

export function layoutRoundsOnCanvas(orderedRounds: Round[]): Round[] {
  const columnWidth = 400;
  const rowHeight = 320;

  return orderedRounds.map((round, index) => ({
    ...round,
    order: index,
    position: {
      x: (index % 3) * columnWidth + 100,
      y: Math.floor(index / 3) * rowHeight + 100,
    },
  }));
}

function cloneEdges(edges: RoundEdge[]): RoundEdge[] {
  return edges.map((edge) => ({
    ...edge,
    condition: edge.condition ? { ...edge.condition } : edge.condition,
  }));
}

export function analyzeConversionToTiles(rounds: Round[], edges: RoundEdge[]): ConversionAnalysis {
  const warnings: string[] = [];
  const orderedByGraph = topologicalSortRounds(rounds, edges);
  const orderedByOrder = sortRoundsByOrder(rounds).filter((round) => !round.id.startsWith('round-'));
  const graphOrderedIds = orderedByGraph.filter((round) => !round.id.startsWith('round-')).map((round) => round.id);
  const orderIds = orderedByOrder.map((round) => round.id);
  const willReorderRounds =
    graphOrderedIds.length === orderIds.length &&
    graphOrderedIds.some((id, index) => id !== orderIds[index]);

  warnings.push('Connections and conditions are preserved — only how rounds are displayed changes.');
  if (willReorderRounds) {
    warnings.push('Tile card order will follow the existing flow (topological order).');
  }
  warnings.push('Canvas node positions are cleared in tile mode.');

  return {
    canConvert: rounds.length > 0,
    warnings,
    willSimplifyBranching: false,
    willReorderRounds,
  };
}

export function analyzeConversionToWorkflow(rounds: Round[], edges: RoundEdge[]): ConversionAnalysis {
  const warnings: string[] = [];

  if (rounds.length > 1 && edges.length === 0) {
    warnings.push('No connections exist yet — a sequential flow will be created from the current tile order.');
  } else {
    warnings.push('Connections and conditions are preserved — only canvas layout is updated.');
  }
  warnings.push('Rounds are placed on a grid following the existing flow.');

  return {
    canConvert: rounds.length > 0,
    warnings,
    willSimplifyBranching: false,
    willReorderRounds: false,
  };
}

/**
 * Tiles view: update display order from flow; keep edges/conditions unchanged.
 */
export function convertToTilesRepresentation(
  _programId: string,
  rounds: Round[],
  edges: RoundEdge[],
): { rounds: Round[]; edges: RoundEdge[] } {
  const ordered = topologicalSortRounds(rounds, edges);
  const withoutPositions = ordered.map((round) => {
    const { position: _position, ...rest } = round;
    return { ...rest, order: round.order };
  });
  return { rounds: withoutPositions, edges: cloneEdges(edges) };
}

/**
 * Block diagram: layout nodes from flow; keep edges/conditions unchanged.
 */
export function convertToWorkflowRepresentation(
  programId: string,
  rounds: Round[],
  edges: RoundEdge[],
): { rounds: Round[]; edges: RoundEdge[] } {
  const flowOrder = edges.length > 0 ? topologicalSortRounds(rounds, edges) : sortRoundsByOrder(rounds);
  const laidOut = layoutRoundsOnCanvas(flowOrder);
  const nextEdges = edges.length > 0 ? cloneEdges(edges) : buildLinearEdges(programId, laidOut);
  return { rounds: laidOut, edges: nextEdges };
}

/** Round-trip check: edges deep-equal on id, source, target, condition type/score */
export function flowsAreEquivalent(before: RoundEdge[], after: RoundEdge[]): boolean {
  if (before.length !== after.length) return false;
  const key = (edge: RoundEdge) =>
    `${edge.sourceRoundId}|${edge.targetRoundId}|${String((edge.condition as any)?.type || 'always')}|${(edge.condition as any)?.score ?? ''}`;
  const beforeKeys = before.map(key).sort();
  const afterKeys = after.map(key).sort();
  return beforeKeys.every((value, index) => value === afterKeys[index]);
}
