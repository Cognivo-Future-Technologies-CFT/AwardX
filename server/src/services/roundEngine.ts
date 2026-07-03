/**
 * Round Execution Engine
 *
 * Manages round lifecycle transitions:
 *   draft → scheduled → active → completed → finalized
 *
 * Guards:
 *   - Cannot activate without finalized predecessor (unless root round)
 *   - Cannot activate with 0 enrolled submissions
 *   - Cannot finalize without completing first
 *   - All transitions logged to round_transitions table
 */

import { getSupabaseAdmin } from '../supabase.js';

type RoundStatus = 'draft' | 'scheduled' | 'upcoming' | 'active' | 'completed' | 'cancelled';

interface RoundRow {
  id: string;
  program_id: string;
  title: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  settings: any;
  advancement_criteria: any;
  advancement_trigger: string;
  is_finalized: boolean;
}

async function logTransition(roundId: string, from: string, to: string, triggeredBy: string, metadata?: any) {
  const supabase = getSupabaseAdmin();
  await supabase.from('round_transitions').insert({
    round_id: roundId,
    from_status: from,
    to_status: to,
    triggered_by: triggeredBy,
    metadata: metadata || {},
  });
}

async function getRound(roundId: string): Promise<RoundRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('rounds').select('*').eq('id', roundId).single();
  return data;
}

async function updateRoundStatus(roundId: string, status: string, extra?: Record<string, any>) {
  const supabase = getSupabaseAdmin();
  const { error, data } = await supabase.from('rounds').update({ status, ...extra }).eq('id', roundId).select('title, program_id').single();
  if (error) throw new Error(error.message);

  if (data?.program_id) {
    const { data: program } = await supabase.from('programs').select('organization_id').eq('id', data.program_id).maybeSingle();
    if (program?.organization_id) {
      const { createNotification } = await import('./notifications.js');
      let title = '';
      let body = '';
      if (status === 'active') {
        title = 'Round Started';
        body = `"${data.title}" round has started.`;
      } else if (status === 'completed') {
        title = 'Round Ended';
        body = `"${data.title}" round has ended.`;
      }
      if (title && body) {
        await createNotification(supabase, {
          organizationId: program.organization_id,
          programId: data.program_id,
          type: 'judging',
          title,
          body,
          metadata: {
            entityId: roundId,
            entityType: 'round',
            route: `/dashboard/${data.program_id}/pipeline`,
          }
        });
      }
    }
  }
}

async function getEnrolledCount(roundId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from('round_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('round_id', roundId)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
  return count || 0;
}

/**
 * Get predecessor rounds (rounds that have edges pointing to this round).
 */
async function getPredecessorRounds(roundId: string, programId: string): Promise<RoundRow[]> {
  const supabase = getSupabaseAdmin();
  const { data: edges } = await supabase
    .from('round_edges')
    .select('source_round_id')
    .eq('target_round_id', roundId)
    .eq('program_id', programId);

  if (!edges || edges.length === 0) return []; // Root round

  const sourceIds = edges.map(e => e.source_round_id);
  const { data: rounds } = await supabase.from('rounds').select('*').in('id', sourceIds);
  return rounds || [];
}

/**
 * Get successor rounds (rounds that this round has edges pointing to).
 */
async function getSuccessorRounds(roundId: string, programId: string): Promise<RoundRow[]> {
  const supabase = getSupabaseAdmin();
  const { data: edges } = await supabase
    .from('round_edges')
    .select('target_round_id')
    .eq('source_round_id', roundId)
    .eq('program_id', programId);

  if (!edges || edges.length === 0) return [];

  const targetIds = edges.map(e => e.target_round_id);
  const { data: rounds } = await supabase.from('rounds').select('*').in('id', targetIds);
  return rounds || [];
}

async function findRootNominationRoundId(programId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const [{ data: rounds }, { data: edges }] = await Promise.all([
    supabase.from('rounds').select('id, type, sort_order, start_date').eq('program_id', programId),
    supabase.from('round_edges').select('target_round_id').eq('program_id', programId),
  ]);

  if (!rounds || rounds.length === 0) return null;

  const targetIds = new Set((edges || []).map((e) => e.target_round_id));
  const rootRounds = rounds.filter((r) => !targetIds.has(r.id));
  if (rootRounds.length === 0) return null;

  const sortedRoots = [...rootRounds].sort((a, b) => {
    const aSort = Number(a.sort_order ?? Number.MAX_SAFE_INTEGER);
    const bSort = Number(b.sort_order ?? Number.MAX_SAFE_INTEGER);
    if (aSort !== bSort) return aSort - bSort;
    return String(a.start_date || '').localeCompare(String(b.start_date || ''));
  });

  const nominatedRoot = sortedRoots.find((r) => {
    const t = String(r.type || '').toLowerCase();
    return t === 'nomination' || t === 'submission';
  });

  return (nominatedRoot || sortedRoots[0]).id;
}

/** Enroll submissions into the program's root nomination round (skips already-enrolled). */
export async function enrollSubmissionsInRootRound(
  programId: string,
  submissionIds?: string[],
): Promise<{ ok: boolean; enrolled: number; error?: string }> {
  const supabase = getSupabaseAdmin();
  const rootRoundId = await findRootNominationRoundId(programId);
  if (!rootRoundId) {
    return { ok: true, enrolled: 0 };
  }

  let subsQuery = supabase.from('submissions').select('id').eq('program_id', programId);
  if (submissionIds && submissionIds.length > 0) {
    subsQuery = subsQuery.in('id', submissionIds);
  }

  const { data: subs, error: subsError } = await subsQuery;
  if (subsError) return { ok: false, enrolled: 0, error: subsError.message };
  if (!subs || subs.length === 0) return { ok: true, enrolled: 0 };

  const { data: existing } = await supabase
    .from('round_submissions')
    .select('submission_id')
    .eq('round_id', rootRoundId)
    .in('submission_id', subs.map((s) => s.id));

  const existingIds = new Set((existing || []).map((r) => r.submission_id));
  const toEnroll = subs.filter((s) => !existingIds.has(s.id));
  if (toEnroll.length === 0) return { ok: true, enrolled: 0 };

  const rows = toEnroll.map((s) => ({
    round_id: rootRoundId,
    submission_id: s.id,
    status: 'active',
  }));

  const { error: enrollError } = await supabase
    .from('round_submissions')
    .upsert(rows, { onConflict: 'round_id,submission_id' });

  if (enrollError) return { ok: false, enrolled: 0, error: enrollError.message };
  return { ok: true, enrolled: toEnroll.length };
}

/** Backfill any program submissions missing from the root nomination round. */
export async function syncProgramNominationEnrollments(
  programId: string,
): Promise<{ ok: boolean; enrolled: number; error?: string }> {
  return enrollSubmissionsInRootRound(programId);
}

// ---- Public API ----

export async function activateRound(roundId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  const validFrom: RoundStatus[] = ['draft', 'scheduled', 'upcoming'];
  if (!validFrom.includes(round.status as RoundStatus)) {
    return { ok: false, error: `Cannot activate round with status '${round.status}'. Must be draft, scheduled, or upcoming.` };
  }

  // Guard: predecessors must be finalized (unless root)
  const predecessors = await getPredecessorRounds(roundId, round.program_id);
  if (predecessors.length > 0) {
    const unfinalized = predecessors.filter(p => !p.is_finalized);
    if (unfinalized.length > 0) {
      return {
        ok: false,
        error: `Cannot activate: predecessor round(s) not finalized: ${unfinalized.map(p => p.title).join(', ')}`,
      };
    }
  }

  // Guard: must have enrolled submissions (auto-enroll for Nomination/root rounds)
  let enrolledCount = await getEnrolledCount(roundId);
  const roundType = String(round.type || '').toLowerCase();
  if (enrolledCount === 0 && (roundType === 'nomination' || roundType === 'submission') && predecessors.length === 0) {
    await enrollSubmissionsInRootRound(round.program_id);
    enrolledCount = await getEnrolledCount(roundId);
  }
  if (enrolledCount === 0) {
    return { ok: false, error: 'Cannot activate round with 0 enrolled submissions.' };
  }

  await updateRoundStatus(roundId, 'active');
  await logTransition(roundId, round.status, 'active', triggeredBy);
  return { ok: true };
}

export async function completeRound(roundId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  if (round.status !== 'active') {
    return { ok: false, error: `Cannot complete round with status '${round.status}'. Must be active.` };
  }

  const { previewAdvancement } = await import('./advancementEngine.js');
  const preview = await previewAdvancement(roundId);
  const isJudgingRound = !['nomination', 'announce'].includes(round.type?.toLowerCase() || '')
    && (round.settings?.evaluationLogic === 'scoring'
      || (!round.settings?.evaluationLogic
        && !['public voting', 'public rating', 'public'].includes(round.type?.toLowerCase() || '')));

  if (isJudgingRound && preview.hasEmptyScores) {
    return {
      ok: false,
      error: 'No judge scores submitted yet. Judges must complete scoring before this round can end.',
    };
  }

  await updateRoundStatus(roundId, 'completed');
  await logTransition(roundId, 'active', 'completed', triggeredBy);
  return { ok: true };
}

export async function finalizeRound(roundId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  if (round.status !== 'completed') {
    return { ok: false, error: `Cannot finalize round with status '${round.status}'. Must be completed.` };
  }

  if (round.is_finalized) {
    return { ok: false, error: 'Round is already finalized.' };
  }

  await updateRoundStatus(roundId, 'completed', { is_finalized: true });
  await logTransition(roundId, 'completed', 'finalized', triggeredBy, { is_finalized: true });
  return { ok: true };
}

export async function cancelRound(roundId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  if (round.is_finalized) {
    return { ok: false, error: 'Cannot cancel a finalized round.' };
  }

  const prevStatus = round.status;
  await updateRoundStatus(roundId, 'cancelled');
  await logTransition(roundId, prevStatus, 'cancelled', triggeredBy);
  return { ok: true };
}

/**
 * Promote a Nomination round: reset it to draft and re-enroll all current submissions.
 * This allows a fresh nomination cycle to begin with all submissions (including new ones).
 */
export async function promoteRound(roundId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; enrolled?: number; error?: string }> {
  const round = await getRound(roundId);
  if (!round) return { ok: false, error: 'Round not found' };

  if (round.type !== 'Nomination') {
    return { ok: false, error: 'Promote is only available for Nomination rounds.' };
  }

  if (round.status !== 'completed' && !round.is_finalized) {
    return { ok: false, error: 'Round must be completed or finalized to promote.' };
  }

  const supabase = getSupabaseAdmin();

  // Clear existing enrollments
  await supabase.from('round_submissions').delete().eq('round_id', roundId);

  // Fetch all program submissions and enroll them
  const { data: subs } = await supabase
    .from('submissions')
    .select('id')
    .eq('program_id', round.program_id);

  const enrolled = subs?.length || 0;
  if (enrolled > 0) {
    const rows = subs!.map(s => ({ round_id: roundId, submission_id: s.id, status: 'active' }));
    await supabase.from('round_submissions').upsert(rows, { onConflict: 'round_id,submission_id' });
  }

  // Reset round status to draft and un-finalize
  await supabase.from('rounds').update({ status: 'draft', is_finalized: false }).eq('id', roundId);
  await logTransition(roundId, round.status, 'draft', triggeredBy);

  return { ok: true, enrolled };
}

/**
 * Get detailed status for a round including submission counts and scoring progress.
 */
export async function getRoundStatus(roundId: string) {
  const supabase = getSupabaseAdmin();
  const round = await getRound(roundId);
  if (!round) return null;

  // Get enrollment counts
  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select('status')
    .eq('round_id', roundId);
  const rows = enrollments || [];

  // Get scoring progress for judging rounds
  let scoringProgress = null;
  if (round.type === 'jury' || round.type === 'Judging' || round.type === 'Shortlisting') {
    const { data: assignments } = await supabase
      .from('submission_judges')
      .select('status')
      .eq('round_id', roundId);
    const assignmentRows = assignments || [];
    scoringProgress = {
      total: assignmentRows.length,
      completed: assignmentRows.filter(a => a.status === 'completed').length,
      pending: assignmentRows.filter(a => a.status === 'pending').length,
    };
  }

  // Get voting progress for voting rounds
  let votingProgress = null;
  if (round.type === 'Public Voting' || round.type === 'Public Rating' || round.type === 'public') {
    const { count } = await supabase
      .from('public_votes')
      .select('id', { count: 'exact', head: true })
      .eq('round_id', roundId);
    votingProgress = { totalVotes: count || 0 };
  }

  return {
    ...round,
    enrollment: {
      total: rows.length,
      active: rows.filter(r => r.status === 'active').length,
      advanced: rows.filter(r => r.status === 'advanced').length,
      eliminated: rows.filter(r => r.status === 'eliminated').length,
    },
    scoringProgress,
    votingProgress,
  };
}

/**
 * Get pipeline status for all rounds in a program.
 */
export async function getPipelineStatus(programId: string) {
  const supabase = getSupabaseAdmin();

  const { data: allRounds } = await supabase
    .from('rounds')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true });

  if (!allRounds || allRounds.length === 0) return { rounds: [], edges: [] };

  const { data: edges } = await supabase
    .from('round_edges')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true });

  // Get enrollment counts per round
  const roundIds = allRounds.map(r => r.id);
  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select('round_id, status')
    .in('round_id', roundIds);

  const enrollmentMap: Record<string, { total: number; active: number; advanced: number; eliminated: number }> = {};
  for (const row of (enrollments || [])) {
    if (!enrollmentMap[row.round_id]) {
      enrollmentMap[row.round_id] = { total: 0, active: 0, advanced: 0, eliminated: 0 };
    }
    enrollmentMap[row.round_id].total++;
    if (row.status === 'active') enrollmentMap[row.round_id].active++;
    if (row.status === 'advanced') enrollmentMap[row.round_id].advanced++;
    if (row.status === 'eliminated') enrollmentMap[row.round_id].eliminated++;
  }

  const roundsWithStatus = allRounds.map(r => ({
    ...r,
    enrollment: enrollmentMap[r.id] || { total: 0, active: 0, advanced: 0, eliminated: 0 },
  }));

  return { rounds: roundsWithStatus, edges: edges || [] };
}

export async function resetPipeline(programId: string, triggeredBy: string = 'admin'): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  // Get all rounds for the program
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id, type, status, is_finalized')
    .eq('program_id', programId);
  
  if (roundsError) return { ok: false, error: roundsError.message };
  if (!rounds || rounds.length === 0) {
    return { ok: true };
  }

  const roundIds = rounds.map(r => r.id);

  // 1. Get submission_judges for these rounds to delete dependent scores/comments
  const { data: sjList } = await supabase
    .from('submission_judges')
    .select('id')
    .in('round_id', roundIds);

  const sjIds = (sjList || []).map(sj => sj.id);

  if (sjIds.length > 0) {
    // Delete scores for these submission_judges
    await supabase.from('scores').delete().in('submission_judge_id', sjIds);
    // Delete judge_comments for these submission_judges
    await supabase.from('judge_comments').delete().in('submission_judge_id', sjIds);
  }

  // 2. Delete submission_judges
  const { error: delJudgeError } = await supabase
    .from('submission_judges')
    .delete()
    .in('round_id', roundIds);
  if (delJudgeError) return { ok: false, error: delJudgeError.message };

  // 3. Delete public_votes
  const { error: delVoteError } = await supabase
    .from('public_votes')
    .delete()
    .in('round_id', roundIds);
  if (delVoteError) return { ok: false, error: delVoteError.message };

  // 4. Delete winner_announcements
  const { error: delWinnerError } = await supabase
    .from('winner_announcements')
    .delete()
    .eq('program_id', programId);
  if (delWinnerError) return { ok: false, error: delWinnerError.message };

  // 5. Delete advancement_events (which cascades to details)
  const { error: delAdvError } = await supabase
    .from('advancement_events')
    .delete()
    .in('round_id', roundIds);
  if (delAdvError) return { ok: false, error: delAdvError.message };

  // 6. Delete all round_submissions
  const { error: delSubError } = await supabase
    .from('round_submissions')
    .delete()
    .in('round_id', roundIds);
  if (delSubError) return { ok: false, error: delSubError.message };

  // 7. Reset rounds status to draft and un-finalize
  const { error: resetRoundsError } = await supabase
    .from('rounds')
    .update({ status: 'draft', is_finalized: false })
    .in('id', roundIds);
  if (resetRoundsError) return { ok: false, error: resetRoundsError.message };

  // 8. Reset cached scores/votes on program submissions
  const { error: resetSubmissionsError } = await supabase
    .from('submissions')
    .update({
      average_score: null,
      total_scores: 0,
      votes_count: 0
    })
    .eq('program_id', programId);
  if (resetSubmissionsError) return { ok: false, error: resetSubmissionsError.message };

  // 9. Re-enroll active submissions in the root round
  const enrollResult = await enrollSubmissionsInRootRound(programId);
  if (!enrollResult.ok) return { ok: false, error: enrollResult.error };

  // 10. Log transition logs
  for (const r of rounds) {
    await logTransition(r.id, r.status, 'draft', triggeredBy, { reset: true });
  }

  return { ok: true };
}

export { getPredecessorRounds, getSuccessorRounds, getRound };
