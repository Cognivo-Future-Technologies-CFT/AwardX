import type {
  AdvancementCriteria,
  AdvancementTrigger,
  Round,
  RoundEdge,
  ShortlistConfig,
} from '../types/scheduleRounds';

export const SCHEDULER_ROUND_TYPES = [
  'Nomination',
  'Shortlisting',
  'jury',
  'Public Voting',
  'Announce',
] as const;

export type SchedulerRoundType = (typeof SCHEDULER_ROUND_TYPES)[number];

export function shortlistConfigToCriteria(
  config: ShortlistConfig,
  roundType: Round['type'],
): AdvancementCriteria {
  const usesShortlist = roundType === 'Shortlisting' || config.enabled;
  if (!usesShortlist) {
    return { type: 'all_pass' };
  }

  if (config.method === 'fixed_count') {
    return { type: 'top_n', value: Math.max(1, Math.round(config.value || 1)) };
  }

  return {
    type: 'top_percent',
    value: Math.min(100, Math.max(1, Math.round(config.value || 50))),
  };
}

export function criteriaToShortlistConfig(criteria: AdvancementCriteria | null | undefined): ShortlistConfig {
  if (!criteria || criteria.type === 'all_pass') {
    return { enabled: false, method: 'percentage', value: 50, visibility: ['admin'] };
  }

  if (criteria.type === 'top_n') {
    return { enabled: true, method: 'fixed_count', value: criteria.value, visibility: ['admin'] };
  }

  if (criteria.type === 'top_percent') {
    return { enabled: true, method: 'percentage', value: criteria.value, visibility: ['admin'] };
  }

  return { enabled: true, method: 'percentage', value: 50, visibility: ['admin'] };
}

export function createDefaultRound(
  programId: string,
  order: number,
  name: string,
  type: SchedulerRoundType = order === 0 ? 'Nomination' : 'Shortlisting',
): Round {
  const start = new Date();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    id: `round-${Date.now()}`,
    programId,
    name,
    type,
    evaluationLogic: type === 'Nomination' || type === 'Announce' ? 'none' : 'scoring',
    evaluatorStrategy: 'all_judges',
    blindEvaluation: false,
    startCondition: { type: 'fixed_datetime', datetime: start.toISOString() },
    endCondition: { type: 'fixed_datetime', datetime: end.toISOString() },
    shortlistConfig: {
      enabled: order > 0,
      method: 'percentage',
      value: 50,
      visibility: ['admin'],
    },
    order,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    advancementTrigger: 'manual',
    advancementCriteria: order > 0 ? { type: 'top_percent', value: 50 } : { type: 'all_pass' },
    ...(order === 0 && { inputPorts: [], outputPorts: [{ id: 'output-0', name: 'Submissions', dataStreams: ['all'] }] }),
  };
}

/** Linear pipeline edges: each round flows to the next (always). */
export function buildLinearEdges(programId: string, orderedRounds: Round[]): RoundEdge[] {
  const realRounds = orderedRounds.filter((r) => !r.id.startsWith('round-'));
  const edges: RoundEdge[] = [];

  for (let i = 0; i < realRounds.length - 1; i++) {
    const source = realRounds[i];
    const target = realRounds[i + 1];
    edges.push({
      id: `edge-${source.id}-${target.id}`,
      programId,
      sourceRoundId: source.id,
      targetRoundId: target.id,
      condition: { type: 'always' },
      order: i,
      createdAt: new Date().toISOString(),
    });
  }

  return edges;
}

export function roundUsesShortlist(round: Round): boolean {
  return round.type === 'Shortlisting' || round.shortlistConfig.enabled;
}

export function formatRoundDates(round: Round): string {
  const start =
    round.startCondition.type === 'fixed_datetime' ? round.startCondition.datetime : null;
  const end = round.endCondition.type === 'fixed_datetime' ? round.endCondition.datetime : null;

  const fmt = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  return `${fmt(start)} → ${fmt(end)}`;
}

export function primaryActionLabel(round: Round, hasNextRound: boolean): string | null {
  if (round.isFinalized) return null;
  if (round.status === 'draft' || round.status === 'scheduled') return 'Start round';
  if (round.status === 'active') {
    return roundUsesShortlist(round) ? 'End & shortlist' : 'End round';
  }
  if (round.status === 'completed') {
    return roundUsesShortlist(round) ? 'Run shortlist' : hasNextRound ? 'Advance participants' : 'Finalize round';
  }
  return null;
}
