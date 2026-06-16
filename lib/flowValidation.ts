import { RoundEdge, EdgeCondition } from '../types/scheduleRounds';

export interface FlowValidationError {
  sourceRoundId: string;
  sourceRoundName: string;
  edgeIdA?: string;
  edgeIdB?: string;
  targetRoundNameA?: string;
  targetRoundNameB?: string;
  message: string;
  type: 'error' | 'warning';
}

export interface FlowValidationResult {
  isValid: boolean;
  errors: FlowValidationError[];
}

export interface RangeRepresentation {
  min: number;
  max: number;
  includeMin: boolean;
  includeMax: boolean;
  isScoreBased: boolean;
  isAlways: boolean;
  isShortlisted: boolean;
  isManual: boolean;
}

export function getConditionRange(condition: EdgeCondition | undefined | null): RangeRepresentation {
  const defaultRange: RangeRepresentation = {
    min: 0,
    max: 100,
    includeMin: true,
    includeMax: true,
    isScoreBased: false,
    isAlways: true,
    isShortlisted: false,
    isManual: false,
  };

  if (!condition) return defaultRange;

  switch (condition.type) {
    case 'always':
      return defaultRange;

    case 'if_shortlisted':
      return {
        min: 0,
        max: 100,
        includeMin: true,
        includeMax: true,
        isScoreBased: false,
        isAlways: false,
        isShortlisted: true,
        isManual: false,
      };

    case 'manual_approval':
      return {
        min: 0,
        max: 100,
        includeMin: true,
        includeMax: true,
        isScoreBased: false,
        isAlways: false,
        isShortlisted: false,
        isManual: true,
      };

    case 'if_score_gte':
      return {
        min: Number(condition.score ?? 0),
        max: 100,
        includeMin: true,
        includeMax: true,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    case 'if_score_gt' as any:
      return {
        min: Number((condition as any).score ?? 0),
        max: 100,
        includeMin: false,
        includeMax: true,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    case 'if_score_lt' as any:
      return {
        min: 0,
        max: Number((condition as any).score ?? 0),
        includeMin: true,
        includeMax: false,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    case 'if_score_lte' as any:
      return {
        min: 0,
        max: Number((condition as any).score ?? 0),
        includeMin: true,
        includeMax: true,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    case 'if_score_eq' as any: {
      const val = Number((condition as any).score ?? 0);
      return {
        min: val,
        max: val,
        includeMin: true,
        includeMax: true,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };
    }

    case 'if_score_range' as any:
      return {
        min: Number((condition as any).minScore ?? (condition as any).min ?? 0),
        max: Number((condition as any).maxScore ?? (condition as any).max ?? 100),
        includeMin: true,
        includeMax: true,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    default:
      // Treat custom_logic or unknown as general matching anything score-based
      return {
        min: 0,
        max: 100,
        includeMin: true,
        includeMax: true,
        isScoreBased: false,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };
  }
}

export function rangesOverlap(a: RangeRepresentation, b: RangeRepresentation): boolean {
  // Always overlaps with everything
  if (a.isAlways || b.isAlways) return true;

  // Shortlist/manual conditions can overlap with score-based conditions
  if (a.isShortlisted && b.isShortlisted) return true;
  if (a.isManual && b.isManual) return true;
  if (a.isShortlisted || b.isShortlisted || a.isManual || b.isManual) {
    return true; // Overlap assumed because they operate on different dimensions
  }

  // Both are score based
  if (a.min > b.max || b.min > a.max) return false;

  if (a.min === b.max) {
    return a.includeMin && b.includeMax;
  }
  if (b.min === a.max) {
    return b.includeMin && a.includeMax;
  }

  return true;
}

export function rangeSubsumes(a: RangeRepresentation, b: RangeRepresentation): boolean {
  if (a.isAlways) return true; // always subsumes anything
  if (b.isAlways) return false; // nothing except always can subsumes always

  // Shortlisted / manual
  if (a.isShortlisted && b.isShortlisted) return true;
  if (a.isManual && b.isManual) return true;
  if (a.isShortlisted || b.isShortlisted || a.isManual || b.isManual) {
    return false; // Different categories
  }

  // Score based boundaries
  if (a.min > b.min) return false;
  if (a.min === b.min && !a.includeMin && b.includeMin) return false;

  if (a.max < b.max) return false;
  if (a.max === b.max && !a.includeMax && b.includeMax) return false;

  return true;
}

export function validateRoundTransitions(
  edges: RoundEdge[],
  rounds: Array<{ id: string; name: string; type?: string }>
): FlowValidationResult {
  const errors: FlowValidationError[] = [];
  const roundMap = new Map(rounds.map(r => [r.id, r.name]));
  const roundTypeMap = new Map(rounds.map(r => [r.id, r.type]));

  // Group edges by source round
  const edgesBySource = new Map<string, RoundEdge[]>();
  for (const edge of edges) {
    if (!edgesBySource.has(edge.sourceRoundId)) {
      edgesBySource.set(edge.sourceRoundId, []);
    }
    edgesBySource.get(edge.sourceRoundId)!.push(edge);
  }

  // Validate each group
  for (const [sourceId, group] of edgesBySource.entries()) {
    const sourceName = roundMap.get(sourceId) || sourceId;
    const sourceType = roundTypeMap.get(sourceId);

    // Verify condition constraints by round type
    if (sourceType) {
      if (sourceType === 'Nomination') {
        const nonAlwaysEdge = group.find(e => e.condition && e.condition.type !== 'always');
        if (nonAlwaysEdge) {
          const targetName = roundMap.get(nonAlwaysEdge.targetRoundId) || nonAlwaysEdge.targetRoundId;
          errors.push({
            sourceRoundId: sourceId,
            sourceRoundName: sourceName,
            edgeIdA: nonAlwaysEdge.id,
            message: `Nomination round "${sourceName}" can only have "Always Proceed" connection logic (transition to "${targetName}" has condition type "${nonAlwaysEdge.condition?.type}").`,
            type: 'error',
          });
        }
      } else {
        const alwaysEdge = group.find(e => !e.condition || e.condition.type === 'always');
        if (alwaysEdge) {
          const targetName = roundMap.get(alwaysEdge.targetRoundId) || alwaysEdge.targetRoundId;
          errors.push({
            sourceRoundId: sourceId,
            sourceRoundName: sourceName,
            edgeIdA: alwaysEdge.id,
            message: `Only Nomination rounds can have "Always Proceed" connection logic. Round "${sourceName}" transition to "${targetName}" must use a specific condition (e.g. If Shortlisted).`,
            type: 'error',
          });
        }
      }
    }

    for (let i = 0; i < group.length; i++) {
      const edgeA = group[i];
      const nameA = roundMap.get(edgeA.targetRoundId) || edgeA.targetRoundId;
      const condA = edgeA.condition;
      const rangeA = getConditionRange(condA);

      for (let j = i + 1; j < group.length; j++) {
        const edgeB = group[j];
        const nameB = roundMap.get(edgeB.targetRoundId) || edgeB.targetRoundId;
        const condB = edgeB.condition;
        const rangeB = getConditionRange(condB);

        const overlaps = rangesOverlap(rangeA, rangeB);

        if (overlaps) {
          errors.push({
            sourceRoundId: sourceId,
            sourceRoundName: sourceName,
            edgeIdA: edgeA.id,
            edgeIdB: edgeB.id,
            targetRoundNameA: nameA,
            targetRoundNameB: nameB,
            message: `Ambiguous transitions from "${sourceName}": Transition to "${nameA}" and "${nameB}" overlap. Make conditions mutually exclusive.`,
            type: 'error',
          });
        }
      }
    }
  }

  return {
    isValid: errors.filter(e => e.type === 'error').length === 0,
    errors,
  };
}
