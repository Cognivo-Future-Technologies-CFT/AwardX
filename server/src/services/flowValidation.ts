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

export function getConditionRange(condition: any): RangeRepresentation {
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

  const type = String(condition.type || 'always').toLowerCase();

  switch (type) {
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
        min: Number(condition.score ?? condition.value ?? 0),
        max: 100,
        includeMin: true,
        includeMax: true,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    case 'if_score_gt':
      return {
        min: Number(condition.score ?? condition.value ?? 0),
        max: 100,
        includeMin: false,
        includeMax: true,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    case 'if_score_lt':
      return {
        min: 0,
        max: Number(condition.score ?? condition.value ?? 0),
        includeMin: true,
        includeMax: false,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    case 'if_score_lte':
      return {
        min: 0,
        max: Number(condition.score ?? condition.value ?? 0),
        includeMin: true,
        includeMax: true,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    case 'if_score_eq': {
      const val = Number(condition.score ?? condition.value ?? 0);
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

    case 'if_score_range':
      return {
        min: Number(condition.minScore ?? condition.min ?? 0),
        max: Number(condition.maxScore ?? condition.max ?? 100),
        includeMin: true,
        includeMax: true,
        isScoreBased: true,
        isAlways: false,
        isShortlisted: false,
        isManual: false,
      };

    default:
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
  if (a.isAlways || b.isAlways) return true;

  if (a.isShortlisted && b.isShortlisted) return true;
  if (a.isManual && b.isManual) return true;
  if (a.isShortlisted || b.isShortlisted || a.isManual || b.isManual) {
    return true;
  }

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
  if (a.isAlways) return true;
  if (b.isAlways) return false;

  if (a.isShortlisted && b.isShortlisted) return true;
  if (a.isManual && b.isManual) return true;
  if (a.isShortlisted || b.isShortlisted || a.isManual || b.isManual) {
    return false;
  }

  if (a.min > b.min) return false;
  if (a.min === b.min && !a.includeMin && b.includeMin) return false;

  if (a.max < b.max) return false;
  if (a.max === b.max && !a.includeMax && b.includeMax) return false;

  return true;
}

export function validateRoundTransitions(
  edges: any[],
  rounds: Array<{ id: string; title: string; type?: string }>
): FlowValidationResult {
  const errors: FlowValidationError[] = [];
  const roundMap = new Map(rounds.map(r => [r.id, r.title]));
  const roundTypeMap = new Map(rounds.map(r => [r.id, r.type]));

  // Group edges by source round
  const edgesBySource = new Map<string, any[]>();
  for (const edge of edges) {
    const sourceId = edge.source_round_id || edge.sourceRoundId;
    if (!sourceId) continue;
    if (!edgesBySource.has(sourceId)) {
      edgesBySource.set(sourceId, []);
    }
    edgesBySource.get(sourceId)!.push(edge);
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
          const targetId = nonAlwaysEdge.target_round_id || nonAlwaysEdge.targetRoundId;
          const targetName = roundMap.get(targetId) || targetId;
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
          const targetId = alwaysEdge.target_round_id || alwaysEdge.targetRoundId;
          const targetName = roundMap.get(targetId) || targetId;
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
      const targetIdA = edgeA.target_round_id || edgeA.targetRoundId;
      const nameA = roundMap.get(targetIdA) || targetIdA;
      const condA = edgeA.condition;
      const rangeA = getConditionRange(condA);

      for (let j = i + 1; j < group.length; j++) {
        const edgeB = group[j];
        const targetIdB = edgeB.target_round_id || edgeB.targetRoundId;
        const nameB = roundMap.get(targetIdB) || targetIdB;
        const condB = edgeB.condition;
        const rangeB = getConditionRange(condB);

        // Skip overlap check if they originate from different output ports/handles or target different rounds
        const handleA = edgeA.source_handle || edgeA.sourceHandle || 'output-0';
        const handleB = edgeB.source_handle || edgeB.sourceHandle || 'output-0';
        const targetA = edgeA.target_round_id || edgeA.targetRoundId;
        const targetB = edgeB.target_round_id || edgeB.targetRoundId;
        if (handleA !== handleB || targetA !== targetB) continue;

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
