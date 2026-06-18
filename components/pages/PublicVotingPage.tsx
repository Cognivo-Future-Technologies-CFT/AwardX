/**
 * Public voting page — slug-based URLs, access control, KYC gate, and voter history.
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  Lock,
  AlertCircle,
  Heart,
  RefreshCw,
  Star,
  LogIn,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonLoader } from '../SkeletonLoader';
import { EmptyState } from '../EmptyState';
import { queryKeys } from '../../services/queryKeys';
import { resolveMediaPublicUrl } from '../../services/supabase';
import { resolveBackendPath } from '../../services/backendApi';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/supabase';

function apiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return resolveBackendPath(`/api${normalized}`);
}

async function authHeaders(): Promise<HeadersInit> {
  const { session } = await auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

type VotingAccessMode = 'open' | 'org_only' | 'authenticated';

interface VotingRound {
  id: string;
  title: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  public_voting_slug?: string;
}

interface VotingSubmission {
  id: string;
  title: string;
  description: string;
  cover_image_url?: string;
  applicant_name: string;
  votes_count: number;
  category?: string;
}

interface VotingConfig {
  votes_per_user: number;
  votes_per_submission: number;
  require_auth: boolean;
  allow_anonymous: boolean;
  show_results_publicly: boolean;
  show_leaderboard: boolean;
  access_mode: VotingAccessMode;
  public_voting_slug?: string;
}

interface MyVote {
  id: string;
  submission_id: string;
  title: string;
  applicant_name: string;
  cover_image_url?: string;
  created_at: string;
}

interface LeaderboardEntry {
  rank: number;
  submission_id: string;
  title: string;
  applicant_name: string;
  vote_count: number;
  judge_score?: number | null;
}

function resolveVotingKey(slug?: string, roundId?: string): string {
  return slug || roundId || '';
}

export const PublicVotingPage: React.FC = () => {
  const { slug, roundId: legacyRoundId } = useParams<{ slug?: string; roundId?: string }>();
  const votingKey = resolveVotingKey(slug, legacyRoundId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [kycStarting, setKycStarting] = useState(false);

  const fetchPath = slug ? `/voting/s/${slug}` : `/voting/${votingKey}`;

  const { data: roundData, isLoading: roundLoading } = useQuery({
    queryKey: queryKeys.voting.round(votingKey),
    queryFn: async () => {
      const res = await fetch(apiUrl(fetchPath));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Voting round not found');
      }
      return res.json();
    },
    enabled: !!votingKey,
    staleTime: 30_000,
  });

  const payload = roundData?.data || roundData;
  const round: VotingRound | null = payload?.round ?? null;
  const config: VotingConfig | null = payload?.config ?? null;
  const program = payload?.program ?? null;
  const submissions: VotingSubmission[] = payload?.submissions ?? [];
  const resolvedRoundId = round?.id || votingKey;

  const needsAuth =
    config?.require_auth ||
    config?.access_mode === 'authenticated' ||
    config?.access_mode === 'org_only';

  const { data: kycStatus } = useQuery({
    queryKey: ['kyc-status', program?.id, user?.id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/kyc/status/${program.id}`), {
        headers: await authHeaders(),
      });
      if (!res.ok) return { status: 'none' };
      const json = await res.json();
      return json.data || { status: 'none' };
    },
    enabled: !!program?.kyc_enabled && isAuthenticated && !!program?.id,
  });

  const kycVerified = !program?.kyc_enabled || kycStatus?.status === 'verified';
  const kycRequired = !!program?.kyc_enabled && isAuthenticated && kycStatus?.status !== 'verified';

  const { data: myVotesData, refetch: refetchMyVotes } = useQuery({
    queryKey: ['voting-my-votes', resolvedRoundId, user?.id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/voting/${resolvedRoundId}/my-votes`), {
        headers: await authHeaders(),
      });
      if (!res.ok) return { votes: [], total: 0 };
      const json = await res.json();
      return json.data as { votes: MyVote[]; total: number };
    },
    enabled: !!resolvedRoundId && (isAuthenticated || !needsAuth),
    staleTime: 10_000,
  });

  const myVotes: MyVote[] = myVotesData?.votes || [];
  const votedSubmissionIds = useMemo(
    () => new Set(myVotes.map((v) => v.submission_id)),
    [myVotes],
  );
  const totalVotesCast = myVotes.length;
  const maxVotes = config?.votes_per_user ?? 1;

  const { data: leaderboardData, isFetching: leaderboardFetching, refetch: refetchLeaderboard } = useQuery({
    queryKey: queryKeys.voting.leaderboard(resolvedRoundId),
    queryFn: async () => {
      const res = await fetch(apiUrl(`/voting/${resolvedRoundId}/leaderboard`));
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!resolvedRoundId && !!config?.show_leaderboard,
    refetchInterval: config?.show_leaderboard ? 20_000 : false,
    staleTime: 15_000,
  });

  const voteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await fetch(apiUrl(`/voting/${resolvedRoundId}/vote`), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          submission_id: submissionId,
          email: userEmail || undefined,
          name: userName || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cast vote');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Vote recorded!');
      queryClient.invalidateQueries({ queryKey: queryKeys.voting.leaderboard(resolvedRoundId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.voting.round(votingKey) });
      void refetchMyVotes();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cast vote');
    },
  });

  const startKyc = async () => {
    if (!program?.id) return;
    setKycStarting(true);
    try {
      const returnUrl = window.location.href;
      const res = await fetch(apiUrl('/kyc/didit/start'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ program_id: program.id, return_url: returnUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not start verification');
      window.location.href = json.data.verification_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'KYC failed to start');
      setKycStarting(false);
    }
  };

  const loginUrl = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;

  if (roundLoading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <SkeletonLoader />
      </div>
    );
  }

  if (!round) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Voting round not found"
        description="This voting page does not exist or the round has ended."
      />
    );
  }

  const isActive = round.status === 'active';
  const canVoteMore = isActive && totalVotesCast < maxVotes && kycVerified;

  const accessLabel =
    config?.access_mode === 'org_only'
      ? 'Organization members only'
      : config?.access_mode === 'authenticated' || config?.require_auth
        ? 'Sign-in required'
        : 'Open to everyone';

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/80 via-slate-50 to-slate-100">
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {program?.title && (
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  {program.title}
                </p>
              )}
              <h1 className="truncate text-2xl font-bold text-slate-900">{round.title}</h1>
              {round.description && (
                <p className="mt-1 text-sm text-slate-500">{round.description}</p>
              )}
              <p className="mt-2 text-xs text-slate-400">{accessLabel}</p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-2">
              {isActive ? (
                <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  Voting open
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                  <Lock className="h-4 w-4" />
                  Voting closed
                </span>
              )}
              {isActive && maxVotes > 0 && (
                <p className="text-xs text-slate-500">
                  {Math.max(0, maxVotes - totalVotesCast)} of {maxVotes} vote
                  {maxVotes !== 1 ? 's' : ''} left
                </p>
              )}
              {!isAuthenticated && needsAuth && (
                <Link
                  to={loginUrl}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in to vote
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {needsAuth && !isAuthenticated && isActive && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This round requires you to sign in before voting.{' '}
            <Link to={loginUrl} className="font-semibold underline">
              Continue to login
            </Link>
          </div>
        )}

        {kycRequired && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-violet-900">
                  <ShieldCheck className="h-5 w-5" />
                  Identity verification required
                </h2>
                <p className="mt-1 text-sm text-violet-800">
                  This event uses DIDIT KYC. Complete a quick check before you can vote.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void startKyc()}
                disabled={kycStarting}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {kycStarting ? 'Starting…' : 'Verify with DIDIT'}
              </button>
            </div>
          </div>
        )}

        {program?.kyc_enabled && kycVerified && isAuthenticated && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Identity verified — you can vote
          </div>
        )}

        {myVotes.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Your votes</h2>
              <p className="text-sm text-slate-500">Submissions you supported in this round</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {myVotes.map((vote) => (
                <li key={vote.id} className="flex items-center gap-4 px-6 py-3">
                  <Heart className="h-4 w-4 flex-shrink-0 text-pink-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{vote.title}</p>
                    <p className="truncate text-xs text-slate-500">{vote.applicant_name}</p>
                  </div>
                  <time className="text-xs text-slate-400">
                    {new Date(vote.created_at).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!config?.require_auth && config?.allow_anonymous !== false && isActive && !isAuthenticated && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="mb-3 text-sm font-semibold text-blue-900">Optional — tell us who you are</p>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="min-w-48 flex-1 rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="email"
                placeholder="Your email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="min-w-48 flex-1 rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            No submissions are available for voting yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {submissions.map((submission) => {
              const hasVoted = votedSubmissionIds.has(submission.id);
              const canVoteForThis =
                canVoteMore && !hasVoted && (!needsAuth || isAuthenticated);
              const coverImageUrl = resolveMediaPublicUrl(submission.cover_image_url);

              return (
                <article
                  key={submission.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  {coverImageUrl && (
                    <img
                      src={coverImageUrl}
                      alt=""
                      className="h-44 w-full object-cover"
                    />
                  )}
                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="line-clamp-2 font-bold leading-snug text-slate-900">
                        {submission.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-slate-500">{submission.applicant_name}</p>
                      {submission.category && (
                        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {submission.category}
                        </span>
                      )}
                    </div>

                    {submission.description && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                        {submission.description}
                      </p>
                    )}

                    {config?.show_results_publicly && (
                      <p className="flex items-center gap-1.5 text-sm font-bold text-pink-600">
                        <Heart className="h-4 w-4" />
                        {submission.votes_count || 0} votes
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (needsAuth && !isAuthenticated) {
                          navigate(loginUrl);
                          return;
                        }
                        if (kycRequired) {
                          toast.error('Complete KYC verification first');
                          return;
                        }
                        voteMutation.mutate(submission.id);
                      }}
                      disabled={!canVoteForThis || voteMutation.isPending}
                      className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        hasVoted
                          ? 'cursor-default bg-emerald-100 text-emerald-700'
                          : canVoteForThis
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                    >
                      {hasVoted
                        ? 'Voted'
                        : canVoteForThis
                          ? 'Cast vote'
                          : needsAuth && !isAuthenticated
                            ? 'Sign in to vote'
                            : 'Vote limit reached'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {config?.show_leaderboard && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Live leaderboard
              </h2>
              <button
                type="button"
                onClick={() => refetchLeaderboard()}
                disabled={leaderboardFetching}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${leaderboardFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {!leaderboardData ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400">Loading leaderboard…</p>
            ) : (leaderboardData.data?.submissions || []).length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400">
                No submissions enrolled in this round yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                <div className="flex items-center gap-3 bg-slate-50 px-6 py-2 text-xs font-semibold text-slate-500">
                  <div className="w-8 text-center">#</div>
                  <div className="flex-1">Submission</div>
                  <div className="flex w-24 items-center justify-end gap-1">
                    <Heart className="h-3 w-3 text-pink-400" /> Votes
                  </div>
                  <div className="flex w-24 items-center justify-end gap-1">
                    <Star className="h-3 w-3 text-indigo-400" /> Judges
                  </div>
                </div>

                {(leaderboardData.data?.submissions || []).map(
                  (entry: LeaderboardEntry, idx: number) => (
                    <div
                      key={entry.submission_id}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50"
                    >
                      <div className="w-8 text-center text-sm font-bold text-slate-500">
                        {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{entry.title}</p>
                        <p className="truncate text-xs text-slate-500">{entry.applicant_name}</p>
                      </div>
                      <div className="w-24 text-right text-sm font-bold text-pink-600">
                        {entry.vote_count ?? 0}
                      </div>
                      <div className="w-24 text-right text-sm">
                        {entry.judge_score != null ? (
                          <span className="font-bold text-indigo-700">
                            {entry.judge_score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
