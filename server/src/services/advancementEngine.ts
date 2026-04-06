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
      ? (entry.totalWeighted / entry.totalWeight) * 100 / (entry.judgeCount || 1)
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

  // Get preview
  const preview = await previewAdvancement(roundId, criteriaOverride);

  // Handle empty scores
  if (preview.hasEmptyScores && !overrides?.length) {
    return { ok: false, paused: true, reason: 'no_scores', error: 'No scores submitted. Cannot auto-advance with empty data.' };
  }

  // Handle ties (if no resolutions provided)
  if (preview.ties.length > 0 && !tieResolutions?.length && !overrides?.length) {
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

  // Find target round
  const successors = await getSuccessorRounds(roundId, round.program_id);
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
    await supabase.from('advancement_details').insert(details);
  }

  // Update round_submissions statuses
  for (const subId of advancingSet) {
    await supabase
      .from('round_submissions')
      .update({ status: 'advanced', advanced_at: new Date().toISOString() })
      .eq('round_id', roundId)
      .eq('submission_id', subId);
  }

  for (const subId of eliminatedSet) {
    const override = overrides?.find(o => o.submissionId === subId);
    await supabase
      .from('round_submissions')
      .update({
        status: 'eliminated',
        eliminated_at: new Date().toISOString(),
        elimination_reason: override?.reason || `Eliminated in round: ${round.title}`,
      })
      .eq('round_id', roundId)
      .eq('submission_id', subId);
  }

  // Enroll advancing participants in the target round
  if (targetRound && advancingSet.size > 0) {
    const enrollments = Array.from(advancingSet).map(subId => {
      const p = scoreMap.get(subId);
      return {
        round_id: targetRound.id,
        submission_id: subId,
        status: 'active',
        source_round_id: roundId,
        carried_score: p?.score ?? null,
      };
    });

    await supabase
      .from('round_submissions')
      .upsert(enrollments, { onConflict: 'round_id,submission_id' });

    // Auto-assign judges for the next round when configured.
    const { data: judgingConfig } = await supabase
      .from('judging_config')
      .select('auto_assign, max_judges_per_submission')
      .eq('program_id', round.program_id)
      .maybeSingle();

    const shouldAutoAssign = Boolean(judgingConfig?.auto_assign);
    if (shouldAutoAssign) {
      const settings = (targetRound as any).settings || {};
      const strategy = settings?.assignment_strategy === 'segmented' ? 'segmented' : 'random';
      const segmentField = settings?.segment_field || 'category_id';
      const judgesPerSubmission = Number(judgingConfig?.max_judges_per_submission || 3);

      if (strategy === 'segmented') {
        await autoSegmentedAssign(targetRound.id, round.program_id, segmentField, judgesPerSubmission, triggeredBy || 'system_auto');
      } else {
        await autoRandomAssign(targetRound.id, round.program_id, judgesPerSubmission, triggeredBy || 'system_auto');
      }
    }
  }

  // Finalize the source round
  await supabase
    .from('rounds')
    .update({ is_finalized: true })
    .eq('id', roundId);

  // Log transition
  await supabase.from('round_transitions').insert({
    round_id: roundId,
    from_status: 'completed',
    to_status: 'finalized',
    triggered_by: triggeredBy || 'admin',
    metadata: { advancement_event_id: event.id },
  });

  // Audit log
  await supabase.from('audit_logs').insert({
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

  return {
    ok: true,
    eventId: event.id,
    advancedCount: advancingSet.size,
    eliminatedCount: eliminatedSet.size,
  };
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
