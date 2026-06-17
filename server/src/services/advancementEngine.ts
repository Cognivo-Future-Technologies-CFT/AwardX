/**
 * Advancement Engine
 *
 * Core logic for evaluating round results and advancing/eliminating participants.
 *
 * Criteria types:
 *   top_n       — top N participants by score/votes advance
 *   top_percent — top N% of participants advance
 *   score_threshold — participants at or above a threshold advance
 *   manual      — admin handpicks (no auto-calculation)
 *   all_pass    — everyone advances
 *
 * Edge cases:
 *   - Empty scores/votes → pauses, returns { paused: true, reason: 'no_scores' }
 *   - Ties at cutoff → pauses, returns { paused: true, reason: 'tie_at_boundary', ties: [...] }
 *   - Admin can provide overrides to force-advance or force-eliminate
 */

import { getSupabaseAdmin } from '../supabase.js';
import { getSuccessorRounds, getRound } from './roundEngine.js';
import { autoRandomAssign, autoSegmentedAssign } from './judgeAssignment.js';

interface AdvancementCriteria {
  type: 'top_n' | 'top_percent' | 'score_threshold' | 'manual' | 'all_pass';
  value?: number;
}

interface ParticipantScore {
  submissionId: string;
  score: number;
  voteCount: number;
  rank: number;
}

interface PreviewResult {
  paused?: boolean;
  reason?: string;
  advancing: ParticipantScore[];
  eliminated: ParticipantScore[];
  ties: ParticipantScore[];
  hasEmptyScores: boolean;
  totalParticipants: number;
}

interface AdvancementOverride {
  submissionId: string;
  action: 'force_advance' | 'force_eliminate';
  reason?: string;
}

interface EdgeCondition {
  type?: string;
  score?: number;
  [key: string]: any;
}

interface OutgoingEdge {
  target_round_id: string;
  condition?: EdgeCondition;
  sort_order?: number;
}

interface ExecuteResult {
  ok: boolean;
  paused?: boolean;
  reason?: string;
  ties?: ParticipantScore[];
  eventId?: string;
  advancedCount?: number;
  eliminatedCount?: number;
  error?: string;
}

/**
 * Compute scores for all active participants in a round.
 * For judging rounds: average of all judges' weighted scores.
 * For voting rounds: vote count.
 */
async function computeParticipantScores(roundId: string, roundType: string): Promise<ParticipantScore[]> {
  const supabase = getSupabaseAdmin();

  // Get all active enrollments
  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select('submission_id')
    .eq('round_id', roundId)
    .eq('status', 'active');

  if (!enrollments || enrollments.length === 0) return [];

  const submissionIds = enrollments.map(e => e.submission_id);

  const isVotingRound = ['public voting', 'public rating', 'public'].includes(roundType?.toLowerCase());

  if (isVotingRound) {
    // Score by vote count
    const { data: votes } = await supabase
      .from('public_votes')
      .select('submission_id')
      .eq('round_id', roundId);

    const voteCounts: Record<string, number> = {};
    for (const vote of (votes || [])) {
      voteCounts[vote.submission_id] = (voteCounts[vote.submission_id] || 0) + 1;
    }

    const results: ParticipantScore[] = submissionIds.map(id => ({
      submissionId: id,
      score: voteCounts[id] || 0,
      voteCount: voteCounts[id] || 0,
      rank: 0,
    }));

    // Sort descending by vote count
    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => { r.rank = i + 1; });
    return results;
  }

  // Judging round — compute average score per submission
  const { data: assignments } = await supabase
    .from('submission_judges')
    .select(`
      submission_id,
      status,
      scores(score, criterion_id, judging_criteria(weight, max_score))
    `)
    .eq('round_id', roundId)
    .in('submission_id', submissionIds);

  // Fetch the round to get the program_id
  const { data: roundData } = await supabase
    .from('rounds')
    .select('program_id')
    .eq('id', roundId)
    .single();

  const programId = roundData?.program_id;

  // Fetch all configured criteria for the program to calculate total possible weight
  const { data: criteriaList } = programId
    ? await supabase
        .from('judging_criteria')
        .select('id, weight')
        .eq('program_id', programId)
    : { data: [] };

  const totalPossibleWeight = (criteriaList || []).reduce((sum, c) => sum + (c?.weight ?? 100), 0) || 100;

  // Calculate average score per submission by averaging each completed judge scorecard normalized to 100%
  const scoreMap: Record<string, { totalPercentageSum: number; judgeCount: number }> = {};

  for (const assignment of (assignments || [])) {
    if (assignment.status !== 'completed') continue;
    const subId = assignment.submission_id;
    if (!scoreMap[subId]) scoreMap[subId] = { totalPercentageSum: 0, judgeCount: 0 };

    const scores = (assignment as any).scores || [];
    let judgeWeightedSum = 0;

    for (const s of scores) {
      const weight = s.judging_criteria?.weight ?? 100;
      const maxScore = s.judging_criteria?.max_score > 0 ? s.judging_criteria.max_score : 10;
      const normalized = (s.score / maxScore) * weight;
      judgeWeightedSum += normalized;
    }

    // Normalize this judge scorecard percentage against the total possible criteria weight
    const judgePercentage = (judgeWeightedSum / totalPossibleWeight) * 100;
    scoreMap[subId].totalPercentageSum += judgePercentage;
    scoreMap[subId].judgeCount++;
  }

  const results: ParticipantScore[] = submissionIds.map(id => {
    const entry = scoreMap[id];
    const avgScore = entry && entry.judgeCount > 0
      ? entry.totalPercentageSum / entry.judgeCount
      : 0;
    return {
      submissionId: id,
      score: Math.round(avgScore * 100) / 100,
      voteCount: 0,
      rank: 0,
    };
  });

  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

/**
 * Apply advancement criteria to ranked participants.
 */
function applyCriteria(
  ranked: ParticipantScore[],
  criteria: AdvancementCriteria
): { advancing: ParticipantScore[]; eliminated: ParticipantScore[]; ties: ParticipantScore[] } {
  if (ranked.length === 0) return { advancing: [], eliminated: [], ties: [] };

  let cutoffIndex: number;

  switch (criteria.type) {
    case 'all_pass':
      return { advancing: [...ranked], eliminated: [], ties: [] };

    case 'manual':
      // Manual means no auto-calculation — admin picks
      return { advancing: [], eliminated: [], ties: [] };

    case 'top_n': {
      const n = criteria.value || 1;
      cutoffIndex = Math.min(n, ranked.length);
      break;
    }
    case 'top_percent': {
      const pct = criteria.value || 50;
      cutoffIndex = Math.ceil(ranked.length * pct / 100);
      break;
    }
    case 'score_threshold': {
      const threshold = criteria.value || 0;
      cutoffIndex = ranked.filter(r => r.score >= threshold).length;
      break;
    }
    default:
      return { advancing: [...ranked], eliminated: [], ties: [] };
  }

  // Detect ties at the cutoff boundary
  if (cutoffIndex > 0 && cutoffIndex < ranked.length) {
    const cutoffScore = ranked[cutoffIndex - 1].score;
    const ties = ranked.filter(
      (r, i) => r.score === cutoffScore && (i >= cutoffIndex - 1)
    );

    // If ties span the boundary, flag them
    const tiesBeforeCutoff = ranked.slice(0, cutoffIndex).filter(r => r.score === cutoffScore);
    const tiesAfterCutoff = ranked.slice(cutoffIndex).filter(r => r.score === cutoffScore);

    if (tiesAfterCutoff.length > 0 && tiesBeforeCutoff.length > 0) {
      // There's a tie at the boundary
      const clearAdvancing = ranked.slice(0, cutoffIndex).filter(r => r.score > cutoffScore);
      const clearEliminated = ranked.slice(cutoffIndex).filter(r => r.score < cutoffScore);
      const allTied = ranked.filter(r => r.score === cutoffScore);

      return {
        advancing: clearAdvancing,
        eliminated: clearEliminated,
        ties: allTied,
      };
    }
  }

  return {
    advancing: ranked.slice(0, cutoffIndex),
    eliminated: ranked.slice(cutoffIndex),
    ties: [],
  };
}

function extractEdgeCondition(raw: any): EdgeCondition {
  if (!raw || typeof raw !== 'object') return { type: 'always' };
  if (typeof raw.type === 'string') return raw as EdgeCondition;
  return { type: 'always' };
}

async function evaluateEdgeCondition(
  conditionRaw: any,
  participant: ParticipantScore,
  shortlistedIds: Set<string>
): Promise<boolean> {
  const condition = extractEdgeCondition(conditionRaw);
  const type = String(condition.type || 'always').toLowerCase();

  if (type === 'always') return true;

  if (type === 'if_score_gte') {
    const threshold = Number(condition.score ?? condition.value ?? NaN);
    if (!Number.isFinite(threshold)) return false;
    return participant.score >= threshold;
  }

  if (type === 'if_score_gt') {
    const threshold = Number(condition.score ?? condition.value ?? NaN);
    if (!Number.isFinite(threshold)) return false;
    return participant.score > threshold;
  }

  if (type === 'if_score_lt') {
    const threshold = Number(condition.score ?? condition.value ?? NaN);
    if (!Number.isFinite(threshold)) return false;
    return participant.score < threshold;
  }

  if (type === 'if_score_lte') {
    const threshold = Number(condition.score ?? condition.value ?? NaN);
    if (!Number.isFinite(threshold)) return false;
    return participant.score <= threshold;
  }

  if (type === 'if_score_eq') {
    const threshold = Number(condition.score ?? condition.value ?? NaN);
    if (!Number.isFinite(threshold)) return false;
    return participant.score === threshold;
  }

  if (type === 'if_score_range') {
    const minScore = Number((condition as any).minScore ?? (condition as any).min ?? NaN);
    const maxScore = Number((condition as any).maxScore ?? (condition as any).max ?? NaN);
    if (!Number.isFinite(minScore) || !Number.isFinite(maxScore)) return false;
    return participant.score >= minScore && participant.score <= maxScore;
  }

  if (type === 'if_shortlisted') {
    return shortlistedIds.has(participant.submissionId);
  }

  if (type === 'manual_approval') {
    return false;
  }

  if (type === 'custom_logic') {
    return false;
  }

  return false;
}

// ---- Public API ----

/**
 * Preview advancement without mutating data.
 */
export async function previewAdvancement(
  roundId: string,
  criteriaOverride?: AdvancementCriteria
): Promise<PreviewResult> {
  const round = await getRound(roundId);
  if (!round) throw new Error('Round not found');

  const isNomination = round.type?.toLowerCase() === 'nomination';
  const criteria: AdvancementCriteria = isNomination
    ? { type: 'all_pass' }
    : (criteriaOverride || round.advancement_criteria as AdvancementCriteria || { type: 'all_pass' });
  const ranked = await computeParticipantScores(roundId, round.type);

  // Check for empty scores
  // Only check scores for rounds that are configured to use 'scoring' or are jury/judging rounds.
  const evalLogic = round.settings?.evaluationLogic || (
    ['public voting', 'public rating', 'public'].includes(round.type?.toLowerCase())
      ? 'voting'
      : (round.type?.toLowerCase() === 'nomination' ? 'none' : 'scoring')
  );
  const isJudgingRound = !isNomination && evalLogic === 'scoring';
  const hasEmptyScores = isJudgingRound && ranked.every(r => r.score === 0);


  if (hasEmptyScores && ranked.length > 0) {
    return {
      paused: true,
      reason: 'no_scores',
      advancing: [],
      eliminated: [],
      ties: ranked,
      hasEmptyScores: true,
      totalParticipants: ranked.length,
    };
  }

  const { advancing, eliminated, ties } = applyCriteria(ranked, criteria);

  if (ties.length > 0) {
    return {
      paused: true,
      reason: 'tie_at_boundary',
      advancing,
      eliminated,
      ties,
      hasEmptyScores: false,
      totalParticipants: ranked.length,
    };
  }

  return {
    advancing,
    eliminated,
    ties: [],
    hasEmptyScores: false,
    totalParticipants: ranked.length,
  };
}

/**
 * Execute advancement — mutates data, enrolls in next round.
 */
export async function executeAdvancement(
  roundId: string,
  overrides?: AdvancementOverride[],
  triggeredBy?: string,
  criteriaOverride?: AdvancementCriteria,
  tieResolutions?: Array<{ submissionId: string; action: 'advance' | 'eliminate' }>,
  targetRoundId?: string
): Promise<ExecuteResult> {
  const supabase = getSupabaseAdmin();
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  if (round.status !== 'completed') {
    return { ok: false, error: 'Round must be completed before advancing participants.' };
  }
  if (round.is_finalized) {
    return { ok: false, error: 'Round is already finalized.' };
  }

  try {
    // Get preview
    const preview = await previewAdvancement(roundId, criteriaOverride);

    // Handle empty scores — skip for Nomination rounds (they don't need scores)
    if (preview.hasEmptyScores && !overrides?.length && round.type?.toLowerCase() !== 'nomination') {
      return { ok: false, paused: true, reason: 'no_scores', error: 'No scores submitted. Cannot auto-advance with empty data.' };
    }

    // Build final advancing/eliminated lists
    const advancingSet = new Set(preview.advancing.map(p => p.submissionId));
    const eliminatedSet = new Set(preview.eliminated.map(p => p.submissionId));

    // Handle ties — auto-eliminate if no resolutions provided
    if (preview.ties.length > 0 && !tieResolutions?.length && !overrides?.length) {
      for (const tie of preview.ties) {
        eliminatedSet.add(tie.submissionId);
      }
    }

    // Apply tie resolutions
    for (const tr of (tieResolutions || [])) {
      if (tr.action === 'advance') advancingSet.add(tr.submissionId);
      else eliminatedSet.add(tr.submissionId);
    }

    // Apply overrides
    for (const override of (overrides || [])) {
      if (override.action === 'force_advance') {
        advancingSet.add(override.submissionId);
        eliminatedSet.delete(override.submissionId);
      } else {
        eliminatedSet.add(override.submissionId);
        advancingSet.delete(override.submissionId);
      }
    }

    // Ensure ties that weren't resolved are eliminated by default
    for (const tie of preview.ties) {
      if (!advancingSet.has(tie.submissionId) && !eliminatedSet.has(tie.submissionId)) {
        eliminatedSet.add(tie.submissionId);
      }
    }

    // Find and validate successor rounds
    const successors = await getSuccessorRounds(roundId, round.program_id);
    const successorById = new Map((successors || []).map((row: any) => [row.id, row]));

    const { data: outgoingEdges } = await supabase
      .from('round_edges')
      .select('target_round_id, condition, sort_order')
      .eq('program_id', round.program_id)
      .eq('source_round_id', roundId)
      .order('sort_order', { ascending: true });

    const edges: OutgoingEdge[] = (outgoingEdges || [])
      .filter((edge: any) => edge?.target_round_id && successorById.has(edge.target_round_id));

    const targetRound = successors.length > 0 ? successors[0] : null;

    // Build score lookup for details
    const allScored = [...preview.advancing, ...preview.eliminated, ...preview.ties];
    const scoreMap = new Map(allScored.map(p => [p.submissionId, p]));
    const enrollmentsByRound = new Map<string, Array<Record<string, any>>>();

    // Enroll advancing participants in chosen targetRoundId or successor round(s) that match edge conditions.
    if (advancingSet.size > 0) {
      const advancingParticipants = Array.from(advancingSet)
        .map((submissionId) => scoreMap.get(submissionId))
        .filter(Boolean) as ParticipantScore[];

      if (targetRoundId) {
        if (!enrollmentsByRound.has(targetRoundId)) {
          enrollmentsByRound.set(targetRoundId, []);
        }
        for (const participant of advancingParticipants) {
          enrollmentsByRound.get(targetRoundId)!.push({
            round_id: targetRoundId,
            submission_id: participant.submissionId,
            status: 'active',
            source_round_id: roundId,
            carried_score: participant.score,
          });
        }
      } else if (edges.length > 0) {
        const { data: shortlistedRows } = await supabase
          .from('submissions')
          .select('id, status, submission_data')
          .in('id', advancingParticipants.map((p) => p.submissionId));

        const shortlistedIds = new Set(
          (shortlistedRows || [])
            .filter((row: any) => {
              const status = String(row.status || '').toLowerCase();
              const dataStatus = String(row.submission_data?.status || '').toLowerCase();
              const dataFlag = row.submission_data?.shortlisted === true;
              return status === 'shortlisted' || dataStatus === 'shortlisted' || dataFlag;
            })
            .map((row: any) => row.id)
        );

        const unroutedSubmissionIds: string[] = [];

        for (const participant of advancingParticipants) {
          let matchedTargetRoundId: string | null = null;

          for (const edge of edges) {
            const allowed = await evaluateEdgeCondition(edge.condition, participant, shortlistedIds);
            if (!allowed) continue;

            matchedTargetRoundId = edge.target_round_id;

            if (!enrollmentsByRound.has(edge.target_round_id)) {
              enrollmentsByRound.set(edge.target_round_id, []);
            }

            enrollmentsByRound.get(edge.target_round_id)!.push({
              round_id: edge.target_round_id,
              submission_id: participant.submissionId,
              status: 'active',
              source_round_id: roundId,
              carried_score: participant.score,
            });

            // Deterministic branching: first matching edge by sort_order wins.
            break;
          }

          if (!matchedTargetRoundId) {
            unroutedSubmissionIds.push(participant.submissionId);
          }
        }

        if (unroutedSubmissionIds.length > 0) {
          return {
            ok: false,
            error: `Failed to route ${unroutedSubmissionIds.length} advancing participant(s) to a successor round based on edge conditions.`,
          };
        }
      } else {
        // Fallback to first successor if no edges are configured
        const defaultTarget = successors[0]?.id;
        if (defaultTarget) {
          if (!enrollmentsByRound.has(defaultTarget)) {
            enrollmentsByRound.set(defaultTarget, []);
          }
          for (const participant of advancingParticipants) {
            enrollmentsByRound.get(defaultTarget)!.push({
              round_id: defaultTarget,
              submission_id: participant.submissionId,
              status: 'active',
              source_round_id: roundId,
              carried_score: participant.score,
            });
          }
        }
      }
    }

    const advancingDetails = Array.from(advancingSet).map((subId) => {
      const participant = scoreMap.get(subId);
      const override = overrides?.find((o) => o.submissionId === subId);
      return {
        submission_id: subId,
        outcome: override ? 'override_advanced' : 'advanced',
        rank: participant?.rank || null,
        score: participant?.score || null,
        vote_count: participant?.voteCount || null,
        was_at_cutoff_boundary: preview.ties.some((tie) => tie.submissionId === subId),
        override_reason: override?.reason || null,
      };
    });

    const eliminatedDetails = Array.from(eliminatedSet).map((subId) => {
      const participant = scoreMap.get(subId);
      const override = overrides?.find((o) => o.submissionId === subId);
      return {
        submission_id: subId,
        outcome: override ? 'override_eliminated' : 'eliminated',
        rank: participant?.rank || null,
        score: participant?.score || null,
        vote_count: participant?.voteCount || null,
        was_at_cutoff_boundary: preview.ties.some((tie) => tie.submissionId === subId),
        override_reason: override?.reason || null,
        elimination_reason: override?.reason || `Eliminated in round: ${round.title}`,
      };
    });

    const enrollmentRows = Array.from(enrollmentsByRound.values()).flat();
    const criteria = criteriaOverride || round.advancement_criteria || { type: 'all_pass' };
    const txEnabled = process.env.ROUND_ADVANCEMENT_TX_ENABLED !== 'false';
    if (!txEnabled) {
      return { ok: false, error: 'Transactional advancement is disabled by ROUND_ADVANCEMENT_TX_ENABLED=false.' };
    }

    const triggerType = triggeredBy === 'scheduler_auto' ? 'automatic' : 'manual';
    const transitionActor = triggeredBy || 'admin';
    const executedBy = triggeredBy && triggeredBy !== 'scheduler_auto' ? triggeredBy : null;

    const { data: txData, error: txError } = await supabase.rpc('execute_round_advancement_tx', {
      p_round_id: roundId,
      p_target_round_id: targetRound?.id || null,
      p_trigger_type: triggerType,
      p_transition_triggered_by: transitionActor,
      p_executed_by: executedBy,
      p_criteria_used: criteria,
      p_total_participants: preview.totalParticipants,
      p_had_ties: preview.ties.length > 0,
      p_tie_resolution: tieResolutions || null,
      p_advanced: advancingDetails,
      p_eliminated: eliminatedDetails,
      p_enrollments: enrollmentRows,
      p_audit_details: `Advanced ${advancingSet.size}, eliminated ${eliminatedSet.size} from "${round.title}"`,
      p_audit_metadata: {
        target_round_id: targetRound?.id || null,
        advanced_count: advancingSet.size,
        eliminated_count: eliminatedSet.size,
      },
    });

    if (txError) {
      return { ok: false, error: txError.message || 'Failed to execute transactional advancement' };
    }

    const txRow = Array.isArray(txData) ? txData[0] : txData;
    const eventId = txRow?.event_id;

    if (enrollmentsByRound.size > 0) {
      // Auto-assign judges for successor rounds that received enrollments.
      const { data: judgingConfig } = await supabase
        .from('judging_config')
        .select('auto_assign, max_judges_per_submission')
        .eq('program_id', round.program_id)
        .maybeSingle();

      const shouldAutoAssign = Boolean(judgingConfig?.auto_assign);
      if (shouldAutoAssign) {
        for (const targetRoundId of enrollmentsByRound.keys()) {
          const successorRound = successorById.get(targetRoundId);
          if (!successorRound) continue;

          const settings = (successorRound as any).settings || {};
          const strategy = settings?.assignment_strategy === 'segmented' ? 'segmented' : 'random';
          const segmentField = settings?.segment_field || 'category_id';
          const judgesPerSubmission = Number(judgingConfig?.max_judges_per_submission || 3);

          if (strategy === 'segmented') {
            await autoSegmentedAssign(targetRoundId, round.program_id, segmentField, judgesPerSubmission, triggeredBy || 'system_auto');
          } else {
            await autoRandomAssign(targetRoundId, round.program_id, judgesPerSubmission, triggeredBy || 'system_auto');
          }
        }
      }
    }

    return {
      ok: true,
      eventId,
      advancedCount: advancingSet.size,
      eliminatedCount: eliminatedSet.size,
    };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Failed to execute advancement' };
  }
}

/**
 * Get advancement history for a program.
 */
export async function getAdvancementHistory(programId: string) {
  const supabase = getSupabaseAdmin();
  const { data: allRounds } = await supabase
    .from('rounds')
    .select('id')
    .eq('program_id', programId);

  if (!allRounds || allRounds.length === 0) return [];

  const roundIds = allRounds.map(r => r.id);
  const { data } = await supabase
    .from('advancement_events')
    .select(`
      *,
      advancement_details(*),
      rounds!advancement_events_round_id_fkey(title, type)
    `)
    .in('round_id', roundIds)
    .order('executed_at', { ascending: false });

  return data || [];
}
