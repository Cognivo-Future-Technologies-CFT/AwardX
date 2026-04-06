/**
 * PublicVotingPage
 *
 * Public-facing voting page for a specific round.
 * - Fetches round info, submission cards, and voting config from the backend.
 * - Polls for live leaderboard updates every 20 s when show_leaderboard is enabled.
 * - Respects votes_per_user limit (tracked client-side + enforced server-side).
 * - Shows optional name/email fields when auth is not required.
 * - Distinguishes judge scores from public votes on the leaderboard.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Lock, AlertCircle, Heart, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonLoader } from '../SkeletonLoader';
import { EmptyState } from '../EmptyState';
import { queryKeys } from '../../services/queryKeys';
import { resolveMediaPublicUrl } from '../../services/supabase';

const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/$/, '');

function apiUrl(path: string) {
  return `${envBackendUrl}/api${path}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface VotingRound {
  id: string;
  title: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
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
}

interface LeaderboardEntry {
  rank: number;
  submission_id: string;
  title: string;
  applicant_name: string;
  vote_count: number;
  judge_score?: number | null;
  judge_count?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PublicVotingPage: React.FC = () => {
  const { roundId } = useParams<{ roundId: string }>();
  const queryClient = useQueryClient();

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [votedSubmissions, setVotedSubmissions] = useState<Set<string>>(new Set());
  const [totalVotes, setTotalVotes] = useState(0);

  // ── Fetch round data ─────────────────────────────────────────────────────────
  const { data: roundData, isLoading: roundLoading } = useQuery({
    queryKey: queryKeys.voting.round(roundId ?? ''),
    queryFn: async () => {
      const res = await fetch(apiUrl(`/voting/${roundId}`));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Voting round not found');
      }
      return res.json();
    },
    enabled: !!roundId,
    staleTime: 30_000,
  });

  const payload = roundData?.data || roundData;
  const round: VotingRound | null = payload?.round ?? null;
  const config: VotingConfig | null = payload?.config ?? null;
  const submissions: VotingSubmission[] = payload?.submissions ?? [];

  // ── Fetch leaderboard (polls every 20 s when enabled) ────────────────────────
  const { data: leaderboardData, isFetching: leaderboardFetching, refetch: refetchLeaderboard } = useQuery({
    queryKey: queryKeys.voting.leaderboard(roundId ?? ''),
    queryFn: async () => {
      const res = await fetch(apiUrl(`/voting/${roundId}/leaderboard`));
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!roundId && !!config?.show_leaderboard,
    refetchInterval: config?.show_leaderboard ? 20_000 : false,
    staleTime: 15_000,
  });

  // ── Vote mutation ─────────────────────────────────────────────────────────────
  const voteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const res = await fetch(apiUrl(`/voting/${roundId}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    onSuccess: (_, submissionId) => {
      setVotedSubmissions((prev) => new Set([...prev, submissionId]));
      setTotalVotes((prev) => prev + 1);
      toast.success('Vote cast successfully!');
      // Invalidate leaderboard so it refreshes
      queryClient.invalidateQueries({ queryKey: queryKeys.voting.leaderboard(roundId ?? '') });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cast vote');
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  if (roundLoading) {
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
        title="Voting Round Not Found"
        description="The voting round you're looking for doesn't exist or has ended."
      />
    );
  }

  const isActive = round.status === 'active';
  const maxVotes = config?.votes_per_user ?? 1;
  const canVoteMore = isActive && totalVotes < maxVotes;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Sticky header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{round.title}</h1>
              {payload?.program?.title && (
                <p className="text-slate-500 text-sm mt-0.5">{payload.program.title}</p>
              )}
              {round.description && (
                <p className="text-sm text-slate-400 mt-1">{round.description}</p>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              {isActive ? (
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Voting Open
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-sm">
                  <Lock className="w-4 h-4" />
                  Voting Closed
                </div>
              )}
              {isActive && maxVotes > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {Math.max(0, maxVotes - totalVotes)} of {maxVotes} vote{maxVotes !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Anonymous voter info (if auth not required) */}
        {!config?.require_auth && isActive && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 font-semibold mb-3">
              Optional: Tell us who you are
            </p>
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="flex-1 min-w-48 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="email"
                placeholder="Your email (optional)"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="flex-1 min-w-48 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
        )}

        {/* Submissions grid */}
        {submissions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            No submissions are available for voting in this round.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {submissions.map((submission) => {
              const hasVoted = votedSubmissions.has(submission.id);
              const canVoteForThis = canVoteMore && !hasVoted;
              const coverImageUrl = resolveMediaPublicUrl(submission.cover_image_url);

              return (
                <div
                  key={submission.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all"
                >
                  {coverImageUrl && (
                    <img
                      src={coverImageUrl}
                      alt={submission.title}
                      className="w-full h-44 object-cover"
                    />
                  )}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-900 leading-snug line-clamp-2">
                        {submission.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">{submission.applicant_name}</p>
                      {submission.category && (
                        <span className="inline-block mt-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          {submission.category}
                        </span>
                      )}
                    </div>

                    {submission.description && (
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {submission.description}
                      </p>
                    )}

                    {config?.show_results_publicly && (
                      <p className="text-sm font-bold text-pink-600 flex items-center gap-1.5">
                        <Heart className="w-4 h-4" />
                        {submission.votes_count || 0} vote{submission.votes_count !== 1 ? 's' : ''}
                      </p>
                    )}

                    <button
                      onClick={() => voteMutation.mutate(submission.id)}
                      disabled={!canVoteForThis || voteMutation.isPending}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        hasVoted
                          ? 'bg-emerald-100 text-emerald-700 cursor-default'
                          : canVoteMore
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {hasVoted
                        ? '✓ Voted'
                        : canVoteMore
                          ? 'Cast Vote'
                          : 'Vote limit reached'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard */}
        {config?.show_leaderboard && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Live Leaderboard
              </h2>
              <button
                onClick={() => refetchLeaderboard()}
                disabled={leaderboardFetching}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${leaderboardFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {!leaderboardData ? (
              <div className="px-6 py-8 text-center text-sm text-slate-400">
                Leaderboard data is loading…
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* Column headers */}
                <div className="flex items-center gap-3 px-6 py-2 bg-slate-50 text-xs font-semibold text-slate-500">
                  <div className="w-8 text-center">#</div>
                  <div className="flex-1">Submission</div>
                  <div className="w-24 text-right flex items-center justify-end gap-1">
                    <Heart className="w-3 h-3 text-pink-400" /> Public votes
                  </div>
                  <div className="w-24 text-right flex items-center justify-end gap-1">
                    <Star className="w-3 h-3 text-indigo-400" /> Judge score
                  </div>
                </div>

                {(leaderboardData.data?.submissions || leaderboardData.data?.entries || []).map(
                  (entry: LeaderboardEntry, idx: number) => (
                    <div
                      key={entry.submission_id}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-8 text-center">
                        {idx === 0 ? (
                          <span className="text-base">🥇</span>
                        ) : idx === 1 ? (
                          <span className="text-base">🥈</span>
                        ) : idx === 2 ? (
                          <span className="text-base">🥉</span>
                        ) : (
                          <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{entry.title}</p>
                        <p className="text-xs text-slate-500 truncate">{entry.applicant_name}</p>
                      </div>
                      <div className="w-24 text-right font-bold text-pink-600 text-sm">
                        {entry.vote_count ?? 0}
                      </div>
                      <div className="w-24 text-right text-sm">
                        {entry.judge_score != null ? (
                          <span className="font-bold text-indigo-700">
                            {entry.judge_score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
