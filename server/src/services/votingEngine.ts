/**
 * Voting Engine
 *
 * Handles public voting for Public Voting rounds:
 * - Vote casting with limit enforcement
 * - Voter eligibility checks
 * - Real-time results aggregation
 */

import { getSupabaseAdmin } from '../supabase.js';

interface VoterInfo {
  userId?: string;
  email?: string;
  name?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface VoteResult {
  ok: boolean;
  error?: string;
}

interface VotingResults {
  submissions: Array<{
    submission_id: string;
    title: string;
    applicant_name: string | null;
    vote_count: number;
    rank: number;
  }>;
  totalVotes: number;
}

/**
 * Get the voting configuration for a round.
 */
async function getVotingConfig(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('voting_configs')
    .select('*')
    .eq('round_id', roundId)
    .single();
  return data;
}

/**
 * Get the round and verify it's a public voting round that's active.
 */
async function getActiveVotingRound(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('rounds')
    .select('*, programs(id, title, slug, cover_image_url)')
    .eq('id', roundId)
    .single();

  if (!data) return null;

  const isVotingType = ['Public Voting', 'Public Rating', 'public'].includes(data.type);
  if (!isVotingType) return null;

  return data;
}

/**
 * Check how many votes a voter has cast in this round.
 */
async function getVoterVoteCount(roundId: string, voterInfo: VoterInfo) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('public_votes')
    .select('id, submission_id', { count: 'exact' })
    .eq('round_id', roundId);

  if (voterInfo.userId) {
    query = query.eq('user_id', voterInfo.userId);
  } else if (voterInfo.ipAddress) {
    // For anonymous voters, always check IP address
    query = query.eq('ip_address', voterInfo.ipAddress);
    // Also match on user_agent when available, to tighten fingerprinting
    if (voterInfo.userAgent) {
      query = query.eq('user_agent', voterInfo.userAgent);
    }
  }

  const { data, count } = await query;

  // For anonymous voters, also check if there are any votes from this IP
  // regardless of user_agent, to prevent trivial bypass by changing UA
  if (!voterInfo.userId && voterInfo.ipAddress) {
    const { count: ipOnlyCount } = await supabase
      .from('public_votes')
      .select('id', { count: 'exact' })
      .eq('round_id', roundId)
      .eq('ip_address', voterInfo.ipAddress)
      .is('user_id', null);

    return {
      total: Math.max(count || 0, ipOnlyCount || 0),
      submissionIds: (data || []).map(v => v.submission_id),
    };
  }

  return {
    total: count || 0,
    submissionIds: (data || []).map(v => v.submission_id),
  };
}

// ---- Public API ----

/**
 * Get voting round info + submissions for public display.
 */
export async function getVotingRoundPublic(roundId: string) {
  const round = await getActiveVotingRound(roundId);
  if (!round) return null;

  const config = await getVotingConfig(roundId);
  const supabase = getSupabaseAdmin();

  // Get submissions enrolled in this round
  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select(`
      submission_id,
      submissions(id, title, description, cover_image_url, applicant_name, votes_count, category_id, categories(title))
    `)
    .eq('round_id', roundId)
    .eq('status', 'active');

  const submissions = (enrollments || []).map((e: any) => ({
    id: e.submissions?.id,
    title: e.submissions?.title,
    description: e.submissions?.description,
    cover_image_url: e.submissions?.cover_image_url,
    applicant_name: e.submissions?.applicant_name,
    votes_count: config?.show_results_publicly ? (e.submissions?.votes_count || 0) : undefined,
    category: e.submissions?.categories?.title,
  }));

  return {
    round: {
      id: round.id,
      title: round.title,
      description: round.description,
      type: round.type,
      status: round.status,
      start_date: round.start_date,
      end_date: round.end_date,
    },
    program: round.programs,
    config: config ? {
      votes_per_user: config.votes_per_user,
      votes_per_submission: config.votes_per_submission,
      require_auth: config.require_auth,
      show_results_publicly: config.show_results_publicly,
      show_leaderboard: config.show_leaderboard,
    } : null,
    submissions,
  };
}

/**
 * Cast a vote. Validates limits and round status.
 */
export async function castVote(
  roundId: string,
  submissionId: string,
  voterInfo: VoterInfo
): Promise<VoteResult> {
  const round = await getActiveVotingRound(roundId);
  if (!round) return { ok: false, error: 'Voting round not found or not active.' };
  if (round.status !== 'active') return { ok: false, error: 'This voting round is not currently active.' };

  const config = await getVotingConfig(roundId);

  // Check auth requirement
  if (config?.require_auth && !voterInfo.userId) {
    return { ok: false, error: 'Authentication is required to vote.' };
  }

  // Check if anonymous voting is allowed
  if (!config?.allow_anonymous && !voterInfo.userId) {
    return { ok: false, error: 'Anonymous voting is not allowed for this round.' };
  }

  // Check vote limits
  if (config) {
    const voterVotes = await getVoterVoteCount(roundId, voterInfo);

    // Check total votes per user
    if (config.votes_per_user > 0 && voterVotes.total >= config.votes_per_user) {
      return { ok: false, error: `You have reached the maximum of ${config.votes_per_user} vote(s) for this round.` };
    }

    // Check votes per submission
    if (config.votes_per_submission > 0) {
      const votesForThisSubmission = voterVotes.submissionIds.filter(id => id === submissionId).length;
      if (votesForThisSubmission >= config.votes_per_submission) {
        return { ok: false, error: `You have already voted for this submission.` };
      }
    }
  }

  // Verify submission is enrolled in this round
  const supabase = getSupabaseAdmin();
  const { data: enrollment } = await supabase
    .from('round_submissions')
    .select('id')
    .eq('round_id', roundId)
    .eq('submission_id', submissionId)
    .eq('status', 'active')
    .single();

  if (!enrollment) return { ok: false, error: 'Submission is not part of this voting round.' };

  // Cast the vote
  const { error: insertError } = await supabase
    .from('public_votes')
    .insert({
      round_id: roundId,
      submission_id: submissionId,
      user_id: voterInfo.userId || null,
      ip_address: voterInfo.ipAddress || null,
      user_agent: voterInfo.userAgent || null,
      voter_email: voterInfo.email || null,
      voter_name: voterInfo.name || null,
    });

  if (insertError) return { ok: false, error: insertError.message };

  // Increment votes_count on the submission (atomic via RPC, with fallback)
  const { error: rpcError } = await supabase.rpc('increment_submission_votes', { submission_id: submissionId });
  if (rpcError) {
    // Fallback: use the old pattern but log the error
    console.warn('RPC not available, using non-atomic increment:', rpcError.message);
    const { data: sub } = await supabase.from('submissions').select('votes_count').eq('id', submissionId).single();
    if (sub) {
      await supabase.from('submissions').update({ votes_count: (sub.votes_count || 0) + 1 }).eq('id', submissionId);
    }
  }

  return { ok: true };
}

/**
 * Get voting results for a round (admin view).
 */
export async function getVotingResults(roundId: string): Promise<VotingResults> {
  const supabase = getSupabaseAdmin();

  // Count votes per submission
  const { data: votes } = await supabase
    .from('public_votes')
    .select('submission_id')
    .eq('round_id', roundId);

  const voteCounts: Record<string, number> = {};
  let totalVotes = 0;
  for (const vote of (votes || [])) {
    voteCounts[vote.submission_id] = (voteCounts[vote.submission_id] || 0) + 1;
    totalVotes++;
  }

  // Get submission details
  const submissionIds = Object.keys(voteCounts);
  if (submissionIds.length === 0) return { submissions: [], totalVotes: 0 };

  const { data: subs } = await supabase
    .from('submissions')
    .select('id, title, applicant_name')
    .in('id', submissionIds);

  const results = (subs || [])
    .map(s => ({
      submission_id: s.id,
      title: s.title,
      applicant_name: s.applicant_name,
      vote_count: voteCounts[s.id] || 0,
      rank: 0,
    }))
    .sort((a, b) => b.vote_count - a.vote_count);

  // Assign ranks
  results.forEach((r, i) => { r.rank = i + 1; });

  return { submissions: results, totalVotes };
}

/**
 * Get leaderboard (public-safe, respects config).
 */
export async function getLeaderboard(roundId: string) {
  const config = await getVotingConfig(roundId);
  if (!config?.show_leaderboard) return null;

  const results = await getVotingResults(roundId);
  return results;
}
