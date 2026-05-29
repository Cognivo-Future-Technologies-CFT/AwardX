/**
 * Voting Engine — public voting rounds with slug URLs, access control, and voter history.
 */

import { getSupabaseAdmin } from '../supabase.js';
import { buildPublicVotingSlug } from '../lib/votingSlug.js';

export type VotingAccessMode = 'open' | 'org_only' | 'authenticated';

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

const VOTING_ROUND_TYPES = ['Public Voting', 'Public Rating', 'public'];

async function getVotingConfig(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('voting_configs')
    .select('*')
    .eq('round_id', roundId)
    .single();
  return data;
}

async function ensureVotingConfigForRound(roundId: string) {
  const supabase = getSupabaseAdmin();
  const existing = await getVotingConfig(roundId);
  if (existing) return existing;

  const { data: round } = await supabase
    .from('rounds')
    .select('id, title, programs(id, slug)')
    .eq('id', roundId)
    .single();

  if (!round) return null;

  const programSlug = (round as any).programs?.slug;
  const roundTitle = round.title || 'voting';
  let slug = buildPublicVotingSlug(programSlug, roundTitle);

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('voting_configs')
      .insert({
        round_id: roundId,
        votes_per_user: 5,
        votes_per_submission: 1,
        require_auth: false,
        allow_anonymous: true,
        show_results_publicly: true,
        show_leaderboard: true,
        access_mode: 'open',
        public_voting_slug: slug,
      })
      .select()
      .single();

    if (!error) return data;
    if (error.code === '23505') {
      slug = buildPublicVotingSlug(programSlug, roundTitle);
      continue;
    }
    return null;
  }

  return null;
}

async function getVotingRoundById(roundId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('rounds')
    .select('*, programs(id, title, slug, cover_image_url, organization_id, kyc_enabled, kyc_provider)')
    .eq('id', roundId)
    .single();

  if (!data) return null;
  if (!VOTING_ROUND_TYPES.includes(data.type)) return null;
  return data;
}

async function getVotingRoundBySlug(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data: config } = await supabase
    .from('voting_configs')
    .select('round_id')
    .eq('public_voting_slug', slug)
    .single();

  if (!config?.round_id) return null;
  return getVotingRoundById(config.round_id);
}

async function getVoterVoteCount(roundId: string, voterInfo: VoterInfo) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('public_votes')
    .select('id, submission_id', { count: 'exact' })
    .eq('round_id', roundId);

  if (voterInfo.userId) {
    query = query.eq('user_id', voterInfo.userId);
  } else if (voterInfo.ipAddress) {
    query = query.eq('ip_address', voterInfo.ipAddress);
    if (voterInfo.userAgent) {
      query = query.eq('user_agent', voterInfo.userAgent);
    }
  }

  const { data, count } = await query;

  if (!voterInfo.userId && voterInfo.ipAddress) {
    const { count: ipOnlyCount } = await supabase
      .from('public_votes')
      .select('id', { count: 'exact' })
      .eq('round_id', roundId)
      .eq('ip_address', voterInfo.ipAddress)
      .is('user_id', null);

    return {
      total: Math.max(count || 0, ipOnlyCount || 0),
      submissionIds: (data || []).map((v) => v.submission_id),
    };
  }

  return {
    total: count || 0,
    submissionIds: (data || []).map((v) => v.submission_id),
  };
}

async function checkVoterAccess(
  round: any,
  config: any,
  voterInfo: VoterInfo,
): Promise<{ ok: boolean; error?: string }> {
  const accessMode: VotingAccessMode = config?.access_mode || 'open';
  const requireAuth = config?.require_auth || accessMode === 'authenticated' || accessMode === 'org_only';

  if (requireAuth && !voterInfo.userId) {
    return { ok: false, error: 'Please sign in to vote in this round.' };
  }

  if (accessMode === 'org_only' && voterInfo.userId) {
    const orgId = round.programs?.organization_id;
    if (!orgId) {
      return { ok: false, error: 'Organization restriction is enabled but program has no organization.' };
    }

    const supabase = getSupabaseAdmin();
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', voterInfo.userId)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', voterInfo.userId)
      .maybeSingle();

    const inOrg =
      !!membership || (profile?.organization_id && profile.organization_id === orgId);

    if (!inOrg) {
      return { ok: false, error: 'Only members of the hosting organization can vote in this round.' };
    }
  }

  if (!config?.allow_anonymous && !voterInfo.userId) {
    return { ok: false, error: 'Anonymous voting is not allowed for this round.' };
  }

  return { ok: true };
}

async function checkKycIfRequired(program: any, userId?: string): Promise<{ ok: boolean; error?: string }> {
  if (!program?.kyc_enabled) return { ok: true };
  if (!userId) {
    return { ok: false, error: 'Identity verification is required. Please sign in and complete KYC.' };
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('kyc_verifications')
    .select('status')
    .eq('program_id', program.id)
    .eq('user_id', userId)
    .eq('status', 'verified')
    .maybeSingle();

  if (!data) {
    return { ok: false, error: 'Please complete identity verification (KYC) before voting.' };
  }

  return { ok: true };
}

function mapRoundPayload(round: any, config: any) {
  return {
    round: {
      id: round.id,
      title: round.title,
      description: round.description,
      type: round.type,
      status: round.status,
      start_date: round.start_date,
      end_date: round.end_date,
      public_voting_slug: config?.public_voting_slug || null,
    },
    program: round.programs
      ? {
          id: round.programs.id,
          title: round.programs.title,
          slug: round.programs.slug,
          cover_image_url: round.programs.cover_image_url,
          kyc_enabled: round.programs.kyc_enabled,
          kyc_provider: round.programs.kyc_provider,
        }
      : null,
    config: config
      ? {
          votes_per_user: config.votes_per_user,
          votes_per_submission: config.votes_per_submission,
          require_auth: config.require_auth,
          allow_anonymous: config.allow_anonymous,
          show_results_publicly: config.show_results_publicly,
          show_leaderboard: config.show_leaderboard,
          access_mode: config.access_mode || 'open',
          public_voting_slug: config.public_voting_slug,
        }
      : null,
  };
}

export async function resolveRoundId(roundIdOrSlug: string): Promise<string | null> {
  const byId = await getVotingRoundById(roundIdOrSlug);
  if (byId) return byId.id;

  const bySlug = await getVotingRoundBySlug(roundIdOrSlug);
  return bySlug?.id || null;
}

export async function getVotingRoundPublic(roundIdOrSlug: string) {
  const roundId = await resolveRoundId(roundIdOrSlug);
  if (!roundId) return null;

  const round = await getVotingRoundById(roundId);
  if (!round) return null;

  let config = await getVotingConfig(roundId);
  if (!config && VOTING_ROUND_TYPES.includes(round.type)) {
    config = await ensureVotingConfigForRound(roundId);
  }

  const supabase = getSupabaseAdmin();
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
    ...mapRoundPayload(round, config),
    submissions,
  };
}

export async function getMyVotes(roundIdOrSlug: string, voterInfo: VoterInfo) {
  const roundId = await resolveRoundId(roundIdOrSlug);
  if (!roundId) return null;

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('public_votes')
    .select('id, submission_id, created_at, submissions(id, title, applicant_name, cover_image_url)')
    .eq('round_id', roundId)
    .order('created_at', { ascending: false });

  if (voterInfo.userId) {
    query = query.eq('user_id', voterInfo.userId);
  } else if (voterInfo.ipAddress) {
    query = query.eq('ip_address', voterInfo.ipAddress).is('user_id', null);
  } else {
    return { votes: [], total: 0 };
  }

  const { data } = await query;
  return {
    votes: (data || []).map((v: any) => ({
      id: v.id,
      submission_id: v.submission_id,
      created_at: v.created_at,
      title: v.submissions?.title,
      applicant_name: v.submissions?.applicant_name,
      cover_image_url: v.submissions?.cover_image_url,
    })),
    total: data?.length || 0,
  };
}

export async function castVote(
  roundIdOrSlug: string,
  submissionId: string,
  voterInfo: VoterInfo,
): Promise<VoteResult> {
  const roundId = await resolveRoundId(roundIdOrSlug);
  if (!roundId) return { ok: false, error: 'Voting round not found.' };

  const round = await getVotingRoundById(roundId);
  if (!round) return { ok: false, error: 'Voting round not found or not a public voting round.' };
  if (round.status !== 'active') {
    return { ok: false, error: 'This voting round is not currently active.' };
  }

  let config = await getVotingConfig(roundId);
  if (!config) {
    config = await ensureVotingConfigForRound(roundId);
  }

  const access = await checkVoterAccess(round, config, voterInfo);
  if (!access.ok) return { ok: false, error: access.error };

  const kyc = await checkKycIfRequired(round.programs, voterInfo.userId);
  if (!kyc.ok) return { ok: false, error: kyc.error };

  if (config) {
    const voterVotes = await getVoterVoteCount(roundId, voterInfo);

    if (config.votes_per_user > 0 && voterVotes.total >= config.votes_per_user) {
      return {
        ok: false,
        error: `You have reached the maximum of ${config.votes_per_user} vote(s) for this round.`,
      };
    }

    if (config.votes_per_submission > 0) {
      const votesForSubmission = voterVotes.submissionIds.filter((id) => id === submissionId).length;
      if (votesForSubmission >= config.votes_per_submission) {
        return { ok: false, error: 'You have already voted for this submission.' };
      }
    }
  }

  const supabase = getSupabaseAdmin();
  const { data: enrollment } = await supabase
    .from('round_submissions')
    .select('id')
    .eq('round_id', roundId)
    .eq('submission_id', submissionId)
    .eq('status', 'active')
    .single();

  if (!enrollment) return { ok: false, error: 'Submission is not part of this voting round.' };

  const { data: insertedVote, error: insertError } = await supabase
    .from('public_votes')
    .insert({
      round_id: roundId,
      submission_id: submissionId,
      user_id: voterInfo.userId || null,
      ip_address: voterInfo.ipAddress || null,
      user_agent: voterInfo.userAgent || null,
      voter_email: voterInfo.email || null,
      voter_name: voterInfo.name || null,
    })
    .select('id')
    .single();

  if (insertError) return { ok: false, error: insertError.message };

  const { error: rpcError } = await supabase.rpc('increment_submission_votes', {
    submission_id: submissionId,
  });
  if (rpcError) {
    if (insertedVote?.id) {
      await supabase.from('public_votes').delete().eq('id', insertedVote.id);
    }
    return { ok: false, error: rpcError.message || 'Failed to record vote count' };
  }

  return { ok: true };
}

export async function getVotingResults(roundId: string): Promise<VotingResults> {
  const supabase = getSupabaseAdmin();

  const { data: votes } = await supabase
    .from('public_votes')
    .select('submission_id')
    .eq('round_id', roundId);

  const voteCounts: Record<string, number> = {};
  let totalVotes = 0;
  for (const vote of votes || []) {
    voteCounts[vote.submission_id] = (voteCounts[vote.submission_id] || 0) + 1;
    totalVotes++;
  }

  const submissionIds = Object.keys(voteCounts);
  if (submissionIds.length === 0) return { submissions: [], totalVotes: 0 };

  const { data: subs } = await supabase
    .from('submissions')
    .select('id, title, applicant_name')
    .in('id', submissionIds);

  const results = (subs || [])
    .map((s) => ({
      submission_id: s.id,
      title: s.title,
      applicant_name: s.applicant_name,
      vote_count: voteCounts[s.id] || 0,
      rank: 0,
    }))
    .sort((a, b) => b.vote_count - a.vote_count);

  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return { submissions: results, totalVotes };
}

export async function getLeaderboard(roundId: string) {
  const config = await getVotingConfig(roundId);
  if (!config?.show_leaderboard) return null;
  return getVotingResults(roundId);
}

export async function upsertVotingConfig(
  roundId: string,
  config: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin();
  const round = await getVotingRoundById(roundId);

  let slug = config.public_voting_slug as string | undefined;
  if (!slug && round && VOTING_ROUND_TYPES.includes(round.type)) {
    slug = buildPublicVotingSlug(round.programs?.slug, round.title || 'voting');
  }

  const payload: Record<string, unknown> = {
    round_id: roundId,
    votes_per_user: config.votes_per_user ?? 5,
    votes_per_submission: config.votes_per_submission ?? 1,
    require_auth: config.require_auth ?? false,
    allow_anonymous: config.allow_anonymous ?? true,
    show_results_publicly: config.show_results_publicly ?? false,
    show_leaderboard: config.show_leaderboard ?? true,
    access_mode: config.access_mode ?? 'open',
    updated_at: new Date().toISOString(),
  };

  if (slug) {
    payload.public_voting_slug = slug;
  }

  const { data, error } = await supabase
    .from('voting_configs')
    .upsert(payload, { onConflict: 'round_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
