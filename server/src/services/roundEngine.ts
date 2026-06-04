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
  const { error } = await supabase.from('rounds').update({ status, ...extra }).eq('id', roundId);
  if (error) throw new Error(error.message);
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
  if (enrolledCount === 0 && round.type === 'Nomination' && predecessors.length === 0) {
    const supabase = getSupabaseAdmin();
    const { data: subs } = await supabase
      .from('submissions')
      .select('id')
      .eq('program_id', round.program_id);
    if (subs && subs.length > 0) {
      const rows = subs.map(s => ({ round_id: roundId, submission_id: s.id, status: 'active' }));
      await supabase.from('round_submissions').upsert(rows, { onConflict: 'round_id,submission_id' });
      enrolledCount = subs.length;
    }
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

export { getPredecessorRounds, getSuccessorRounds, getRound };
