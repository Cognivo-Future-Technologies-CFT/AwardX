/**
 * LeaderboardView
 *
 * Live combined leaderboard showing:
 *   - Judge weighted scores (0–100) per submission
 *   - Public vote counts per submission
 *   - Combined rank
 *   - Status badge (active / advanced / eliminated)
 *
 * Polls the backend every 30 s so concurrent judge reviews appear without a manual refresh.
 * Works as both a full-page view (via ProgramTileHub drawer) and a standalone dashboard widget.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Star, Heart, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { SkeletonLoader } from '../SkeletonLoader';
import { Program } from '../../services/models';
import { queryKeys } from '../../services/queryKeys';

const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/$/, '');

async function fetchLeaderboard(programId: string) {
  const url = `${envBackendUrl}/api/leaderboard/${programId}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Leaderboard API returned ${resp.status}`);
  }
  return resp.json();
}

async function fetchRoundLeaderboard(roundId: string) {
  const url = `${envBackendUrl}/api/leaderboard/rounds/${roundId}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Leaderboard API returned ${resp.status}`);
  }
  return resp.json();
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    advanced: 'bg-emerald-100 text-emerald-700',
    eliminated: 'bg-red-100 text-red-600',
    active: 'bg-blue-100 text-blue-700',
  };
  const label: Record<string, string> = {
    advanced: 'Advanced',
    eliminated: 'Eliminated',
    active: 'In Round',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label[status] || status}
    </span>
  );
};

const RankMedal: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="w-6 text-center text-sm font-bold text-slate-500">#{rank}</span>;
};

interface LeaderboardEntry {
  rank: number;
  submissionId: string;
  title: string;
  applicantName: string;
  category: string | null;
  status: string;
  judgeScore: number | null;
  judgeCount: number;
  voteCount: number;
  combinedScore: number;
}

interface RoundTab {
  id: string;
  title: string;
  type: string;
  status: string;
  leaderboard: {
    entries: LeaderboardEntry[];
    updatedAt: string;
  } | null;
}

const EntryRow: React.FC<{ entry: LeaderboardEntry }> = ({ entry }) => (
  <div className="flex items-center gap-3 py-3 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
    {/* Rank */}
    <div className="w-8 flex-shrink-0 flex items-center justify-center">
      <RankMedal rank={entry.rank} />
    </div>

    {/* Name + category */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-900 truncate">{entry.title}</p>
      <p className="text-xs text-slate-500 truncate">
        {entry.applicantName}
        {entry.category && <span className="ml-1 text-slate-400">· {entry.category}</span>}
      </p>
    </div>

    {/* Judge score */}
    <div className="w-24 text-right flex-shrink-0">
      {entry.judgeScore !== null ? (
        <div>
          <p className="text-sm font-bold text-indigo-700">{entry.judgeScore.toFixed(1)}</p>
          <p className="text-xs text-slate-400">{entry.judgeCount} judge{entry.judgeCount !== 1 ? 's' : ''}</p>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No scores</p>
      )}
    </div>

    {/* Vote count */}
    <div className="w-16 text-right flex-shrink-0">
      <p className="text-sm font-bold text-pink-600">{entry.voteCount}</p>
      <p className="text-xs text-slate-400">votes</p>
    </div>

    {/* Status */}
    <div className="w-24 flex-shrink-0 flex justify-end">
      <StatusBadge status={entry.status} />
    </div>
  </div>
);

// ── Round Accordion ───────────────────────────────────────────────────────────

const RoundLeaderboard: React.FC<{ round: RoundTab; defaultOpen?: boolean }> = ({
  round,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const entries = round.leaderboard?.entries || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <div className="text-left">
            <p className="font-bold text-slate-900 text-sm">{round.title}</p>
            <p className="text-xs text-slate-500 capitalize">
              {round.type} · {round.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {entries.length} entries
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-100">
            <div className="w-8 flex-shrink-0 text-center">Rank</div>
            <div className="flex-1">Submission</div>
            <div className="w-24 text-right flex-shrink-0 flex items-center justify-end gap-1">
              <Star className="w-3 h-3" /> Judge Score
            </div>
            <div className="w-16 text-right flex-shrink-0 flex items-center justify-end gap-1">
              <Heart className="w-3 h-3" /> Votes
            </div>
            <div className="w-24 text-right flex-shrink-0">Status</div>
          </div>

          {entries.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              No submissions enrolled in this round yet.
            </div>
          ) : (
            entries.map((entry) => <EntryRow key={entry.submissionId} entry={entry} />)
          )}

          {round.leaderboard?.updatedAt && (
            <div className="px-4 py-2 text-xs text-slate-400 text-right bg-slate-50 border-t border-slate-100">
              Updated {new Date(round.leaderboard.updatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Single-round widget (used when roundId is passed) ─────────────────────────

export const RoundLeaderboardWidget: React.FC<{ roundId: string }> = ({ roundId }) => {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.leaderboard.byRound(roundId),
    queryFn: () => fetchRoundLeaderboard(roundId),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  if (isLoading) return <SkeletonLoader />;
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 p-4">
        <AlertCircle className="w-4 h-4" /> Failed to load leaderboard
      </div>
    );
  }

  const leaderboard = data?.data;
  if (!leaderboard) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          {leaderboard.round?.title}
        </h3>
        <button onClick={() => refetch()} disabled={isFetching} className="text-slate-400 hover:text-slate-600 transition-colors">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {(leaderboard.entries || []).slice(0, 10).map((entry: LeaderboardEntry) => (
          <EntryRow key={entry.submissionId} entry={entry} />
        ))}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

interface LeaderboardViewProps {
  activeEvent?: Program | null;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ activeEvent }) => {
  const programId = activeEvent?.id;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.leaderboard.byProgram(programId ?? ''),
    queryFn: () => fetchLeaderboard(programId!),
    enabled: !!programId,
    refetchInterval: 30_000,   // live updates every 30 s
    staleTime: 20_000,
  });

  if (!activeEvent) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Select a program to view the leaderboard.
      </div>
    );
  }

  if (isLoading) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-slate-600 font-semibold">Could not load leaderboard</p>
        <p className="text-slate-400 text-sm">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const payload = data?.data;
  const rounds: RoundTab[] = payload?.rounds || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Live Leaderboard
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Combined judge scores and public votes · auto-refreshes every 30 s
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-indigo-500" /> Judge Score (0–100, weighted avg)
        </span>
        <span className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-pink-500" /> Public Votes
        </span>
        <span className="text-slate-400">Combined rank = judge score + 0.1 × votes</span>
      </div>

      {/* Rounds */}
      {rounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Trophy className="w-10 h-10 text-slate-200" />
          <p className="text-slate-500 font-semibold">No active or completed rounds yet</p>
          <p className="text-slate-400 text-sm">
            Rounds appear here once they are active or completed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rounds.map((round, idx) => (
            <RoundLeaderboard key={round.id} round={round} defaultOpen={idx === 0} />
          ))}
        </div>
      )}
    </div>
  );
};
