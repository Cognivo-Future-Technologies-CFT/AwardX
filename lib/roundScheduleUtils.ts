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
  'Public Voting',
  'Announce',
] as const;

export type SchedulerRoundType = (typeof SCHEDULER_ROUND_TYPES)[number];

export function isVotingRoundType(type: Round['type'] | string | null | undefined): boolean {
  const normalized = String(type || '').toLowerCase().trim();
  return ['public voting', 'public rating', 'public', 'voting'].includes(normalized);
}

export function isJudgingRoundType(type: Round['type']): boolean {
  return type === 'Shortlisting' || type === 'jury' || type === 'hybrid';
}

export function shortlistConfigToCriteria(
  config: ShortlistConfig,
  roundType: Round['type'],
): AdvancementCriteria {
  const usesShortlist =
    roundType === 'Shortlisting'
    || isVotingRoundType(roundType)
    || config.enabled;
  if (!usesShortlist) {
    return { type: 'all_pass' };
  }

  if (config.method === 'fixed_count') {
    return { type: 'top_n', value: Math.max(1, Math.round(config.value || 1)) };
  }

  if (config.method === 'score_match') {
    return {
      type: 'score_threshold',
      value: Math.min(100, Math.max(0, Math.round(config.value || 0))),
    };
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

  if (criteria.type === 'score_threshold') {
    return { enabled: true, method: 'score_match', value: criteria.value, visibility: ['admin'] };
  }

  return { enabled: true, method: 'percentage', value: 50, visibility: ['admin'] };
}

export function shortlistRuleSummary(config: ShortlistConfig, roundType?: Round['type']): string {
  if (!config.enabled && roundType !== 'Shortlisting' && roundType !== 'Public Voting') {
    return '';
  }
  const isVoting = roundType ? isVotingRoundType(roundType) : false;
  if (config.method === 'score_match') {
    return isVoting
      ? `Score match ${config.value} — entries with ${config.value}+ votes advance`
      : `Score match ${config.value} — entries scored ${config.value}+ advance`;
  }
  if (config.method === 'fixed_count') {
    return `Top ${config.value} entries advance`;
  }
  return `Top ${config.value}% of entries advance`;
}

export function createDefaultRound(
  programId: string,
  order: number,
  name: string,
  type: SchedulerRoundType = order === 0 ? 'Nomination' : 'Shortlisting',
): Round {
  const start = new Date();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const roundType = type as Round['type'];
  const votingRound = isVotingRoundType(roundType);

  const shortlistConfig: ShortlistConfig = {
    enabled: type !== 'Nomination' && type !== 'Announce' && order > 0,
    method: votingRound ? 'percentage' : 'score_match',
    value: 50,
    visibility: ['admin'],
  };

  return {
    id: `round-${Date.now()}`,
    programId,
    name,
    type,
    evaluationLogic:
      type === 'Nomination' || type === 'Announce'
        ? 'none'
        : votingRound
          ? 'voting'
          : 'scoring',
    evaluatorStrategy: 'all_judges',
    blindEvaluation: false,
    startCondition: { type: 'fixed_datetime', datetime: start.toISOString() },
    endCondition: { type: 'fixed_datetime', datetime: end.toISOString() },
    shortlistConfig,
    order,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    advancementTrigger: 'manual',
    advancementCriteria: shortlistConfigToCriteria(shortlistConfig, roundType),
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
      condition: source.type === 'Nomination' ? { type: 'always' } : { type: 'if_shortlisted' },
      order: i,
      createdAt: new Date().toISOString(),
    });
  }

  return edges;
}

export function roundUsesShortlist(round: Round): boolean {
  if (round.type === 'Nomination' || round.type === 'Announce') return false;
  return (
    round.type === 'Shortlisting'
    || isVotingRoundType(round.type)
    || round.shortlistConfig.enabled
  );
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

/** User-facing round type label for judge/voting portals. */
export function formatRoundTypeLabel(type?: string | null): string {
  if (!type) return 'Judging';
  switch (type) {
    case 'Nomination':
      return 'Shortlisting';
    case 'Shortlisting':
    case 'jury':
    case 'hybrid':
      return 'Shortlisting — Judging';
    case 'Public Voting':
    case 'Public Rating':
    case 'public':
      return 'Public Voting — Public';
    case 'Announce':
      return 'Announcement';
    default:
      return type;
  }
}

/** Schedule UI: round type with audience qualifier (Judging / Public). */
export function formatRoundTypeWithAudience(type?: string | null): string {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'shortlisting' || normalized === 'jury' || normalized === 'hybrid') {
    return 'Shortlisting — Judging';
  }
  if (normalized === 'public voting' || normalized === 'public rating' || normalized === 'public') {
    return 'Public Voting — Public';
  }
  if (normalized === 'nomination') return 'Nomination';
  if (normalized === 'announce') return 'Announce';
  return type || 'Round';
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
