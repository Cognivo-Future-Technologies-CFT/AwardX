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

  const isVotingRound = ['Public Voting', 'Public Rating', 'public'].includes(roundType);

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

  // Calculate weighted average per submission
  const scoreMap: Record<string, { totalWeighted: number; totalWeight: number; judgeCount: number }> = {};

  for (const assignment of (assignments || [])) {
    if (assignment.status !== 'completed') continue;
    const subId = assignment.submission_id;
    if (!scoreMap[subId]) scoreMap[subId] = { totalWeighted: 0, totalWeight: 0, judgeCount: 0 };

    const scores = (assignment as any).scores || [];
    for (const s of scores) {
      const weight = s.judging_criteria?.weight || 100;
      const maxScore = s.judging_criteria?.max_score || 10;
      const normalized = (s.score / maxScore) * weight;
      scoreMap[subId].totalWeighted += normalized;
      scoreMap[subId].totalWeight += weight;
    }
    scoreMap[subId].judgeCount++;
  }

  const results: ParticipantScore[] = submissionIds.map(id => {
    const entry = scoreMap[id];
    const avgScore = entry && entry.totalWeight > 0
      ? (entry.totalWeighted / entry.totalWeight) * 100
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

  if (type === 'if_shortlisted') {
    return shortlistedIds.has(participant.submissionId);
  }

  if (type === 'manual_approval') {
    // Manual-approval edges require an explicit manual flow; auto advancement won't route to them.
    return false;
  }

  if (type === 'custom_logic') {
    // Custom expressions are not server-evaluated yet; keep fail-closed.
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

  const criteria: AdvancementCriteria = criteriaOverride || round.advancement_criteria as AdvancementCriteria || { type: 'all_pass' };
  const ranked = await computeParticipantScores(roundId, round.type);

  // Check for empty scores
  const isJudgingRound = !['Public Voting', 'Public Rating', 'public'].includes(round.type);
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
  tieResolutions?: Array<{ submissionId: string; action: 'advance' | 'eliminate' }>
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

  let lockAcquired = false;
  const releaseFinalizeLock = async () => {
    if (!lockAcquired) return;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { error } = await supabase
          .from('rounds')
          .update({ is_finalized: false })
          .eq('id', roundId)
          .eq('is_finalized', true);
        if (!error) break;
        console.warn(`Lock release attempt ${attempt + 1} failed:`, error.message);
      } catch (e) {
        console.warn(`Lock release attempt ${attempt + 1} threw:`, e);
      }
      if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
    lockAcquired = false;
  };

  const { data: lockRow, error: lockError } = await supabase
    .from('rounds')
    .update({ is_finalized: true })
    .eq('id', roundId)
    .eq('status', 'completed')
    .eq('is_finalized', false)
    .select('id')
    .maybeSingle();

  if (lockError) {
    return { ok: false, error: lockError.message || 'Failed to lock round for advancement.' };
  }
  if (!lockRow) {
    return { ok: false, error: 'Round is already being advanced or finalized.' };
  }
  lockAcquired = true;

  try {
    // Get preview
    const preview = await previewAdvancement(roundId, criteriaOverride);

    // Handle empty scores
    if (preview.hasEmptyScores && !overrides?.length) {
      await releaseFinalizeLock();
      return { ok: false, paused: true, reason: 'no_scores', error: 'No scores submitted. Cannot auto-advance with empty data.' };
    }

    // Handle ties (if no resolutions provided)
    if (preview.ties.length > 0 && !tieResolutions?.length && !overrides?.length) {
      await releaseFinalizeLock();
      return {
        ok: false,
        paused: true,
        reason: 'tie_at_boundary',
        ties: preview.ties,
        error: `${preview.ties.length} participant(s) tied at cutoff boundary. Resolve ties before advancing.`,
      };
    }

    // Build final advancing/eliminated lists
    const advancingSet = new Set(preview.advancing.map(p => p.submissionId));
    const eliminatedSet = new Set(preview.eliminated.map(p => p.submissionId));

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

    // Create advancement event
    const criteria = criteriaOverride || round.advancement_criteria || { type: 'all_pass' };
    const { data: event, error: eventError } = await supabase
      .from('advancement_events')
      .insert({
        round_id: roundId,
        target_round_id: targetRound?.id || null,
        trigger_type: triggeredBy === 'scheduler_auto' ? 'automatic' : 'manual',
        criteria_used: criteria,
        total_participants: preview.totalParticipants,
        advanced_count: advancingSet.size,
        eliminated_count: eliminatedSet.size,
        had_ties: preview.ties.length > 0,
        tie_resolution: tieResolutions || null,
        executed_by: triggeredBy && triggeredBy !== 'scheduler_auto' ? triggeredBy : null,
      })
      .select()
      .single();

    if (eventError || !event) {
      await releaseFinalizeLock();
      return { ok: false, error: eventError?.message || 'Failed to create advancement event' };
    }

    // Build score lookup for details
    const allScored = [...preview.advancing, ...preview.eliminated, ...preview.ties];
    const scoreMap = new Map(allScored.map(p => [p.submissionId, p]));

    // Create advancement details
    const details: Array<any> = [];

    for (const subId of advancingSet) {
      const p = scoreMap.get(subId);
      const override = overrides?.find(o => o.submissionId === subId);
      details.push({
        advancement_event_id: event.id,
        submission_id: subId,
        outcome: override ? 'override_advanced' : 'advanced',
        rank: p?.rank || null,
        score: p?.score || null,
        vote_count: p?.voteCount || null,
        was_at_cutoff_boundary: preview.ties.some(t => t.submissionId === subId),
        override_reason: override?.reason || null,
      });
    }

    for (const subId of eliminatedSet) {
      const p = scoreMap.get(subId);
      const override = overrides?.find(o => o.submissionId === subId);
      details.push({
        advancement_event_id: event.id,
        submission_id: subId,
        outcome: override ? 'override_eliminated' : 'eliminated',
        rank: p?.rank || null,
        score: p?.score || null,
        vote_count: p?.voteCount || null,
        was_at_cutoff_boundary: preview.ties.some(t => t.submissionId === subId),
        override_reason: override?.reason || null,
      });
    }

    if (details.length > 0) {
      const { error: detailsError } = await supabase.from('advancement_details').insert(details);
      if (detailsError) {
        await releaseFinalizeLock();
        return { ok: false, error: detailsError.message || 'Failed to create advancement details' };
      }
    }

    // Update round_submissions statuses
    for (const subId of advancingSet) {
      const { error: advanceError } = await supabase
        .from('round_submissions')
        .update({ status: 'advanced', advanced_at: new Date().toISOString() })
        .eq('round_id', roundId)
        .eq('submission_id', subId);
      if (advanceError) {
        await releaseFinalizeLock();
        return { ok: false, error: advanceError.message || 'Failed to update advanced participants' };
      }
    }

    for (const subId of eliminatedSet) {
      const override = overrides?.find(o => o.submissionId === subId);
      const { error: eliminateError } = await supabase
        .from('round_submissions')
        .update({
          status: 'eliminated',
          eliminated_at: new Date().toISOString(),
          elimination_reason: override?.reason || `Eliminated in round: ${round.title}`,
        })
        .eq('round_id', roundId)
        .eq('submission_id', subId);
      if (eliminateError) {
        await releaseFinalizeLock();
        return { ok: false, error: eliminateError.message || 'Failed to update eliminated participants' };
      }
    }

    // Enroll advancing participants in successor round(s) that match edge conditions.
    if (edges.length > 0 && advancingSet.size > 0) {
      const advancingParticipants = Array.from(advancingSet)
        .map((submissionId) => scoreMap.get(submissionId))
        .filter(Boolean) as ParticipantScore[];

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

      const enrollmentsByRound = new Map<string, Array<Record<string, any>>>();
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
        await releaseFinalizeLock();
        return {
          ok: false,
          error: `Failed to route ${unroutedSubmissionIds.length} advancing participant(s) to a successor round based on edge conditions.`,
        };
      }

      for (const [targetRoundId, rows] of enrollmentsByRound.entries()) {
        if (rows.length === 0) continue;

        const { error: enrollError } = await supabase
          .from('round_submissions')
          .upsert(rows, { onConflict: 'round_id,submission_id' });
        if (enrollError) {
          await releaseFinalizeLock();
          return { ok: false, error: enrollError.message || 'Failed to enroll advancing participants in next round' };
        }
      }

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

    // Log transition
    const { error: transitionError } = await supabase.from('round_transitions').insert({
      round_id: roundId,
      from_status: 'completed',
      to_status: 'finalized',
      triggered_by: triggeredBy || 'admin',
      metadata: { advancement_event_id: event.id },
    });
    if (transitionError) {
      await releaseFinalizeLock();
      return { ok: false, error: transitionError.message || 'Failed to log round transition' };
    }

    // Audit log
    const { error: auditError } = await supabase.from('audit_logs').insert({
      action: 'Advanced participants',
      action_type: 'advancement',
      resource_type: 'round',
      resource_id: roundId,
      details: `Advanced ${advancingSet.size}, eliminated ${eliminatedSet.size} from "${round.title}"`,
      metadata: {
        event_id: event.id,
        target_round_id: targetRound?.id,
        advanced_count: advancingSet.size,
        eliminated_count: eliminatedSet.size,
      },
    });
    if (auditError) {
      await releaseFinalizeLock();
      return { ok: false, error: auditError.message || 'Failed to write advancement audit log' };
    }

    lockAcquired = false;
    return {
      ok: true,
      eventId: event.id,
      advancedCount: advancingSet.size,
      eliminatedCount: eliminatedSet.size,
    };
  } catch (error: any) {
    await releaseFinalizeLock();
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
