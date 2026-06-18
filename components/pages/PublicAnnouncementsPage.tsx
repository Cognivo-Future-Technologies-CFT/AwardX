/**
 * Public winners / announcements page for completed award programs.
 */

import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  Calendar,
  Crown,
  Medal,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { SkeletonLoader } from '../SkeletonLoader';
import { EmptyState } from '../EmptyState';
import { resolveMediaPublicUrl } from '../../services/supabase';
import { resolveBackendPath } from '../../services/backendApi';
import { fireCelebrationConfetti } from '../../lib/confetti';

function apiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return resolveBackendPath(`/api${normalized}`);
}

interface WinnerEntry {
  id: string;
  rank: number | null;
  tier: string | null;
  finalScore: number | null;
  judgeScore: number | null;
  publicVotes: number | null;
  announcedAt: string;
  submission: {
    id: string;
    title: string;
    description: string;
    applicantName: string;
    coverImageUrl?: string;
    category?: string | null;
  } | null;
}

export const PublicAnnouncementsPage: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-announcements', programId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/announcements/programs/${programId}/public`));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Announcements not found');
      }
      return res.json();
    },
    enabled: !!programId,
    staleTime: 60_000,
  });

  const payload = data?.data;
  const program = payload?.program;
  const winners: WinnerEntry[] = payload?.winners || [];
  const announceRound = payload?.announceRound;

  useEffect(() => {
    if (winners.length > 0) {
      fireCelebrationConfetti(2500);
    }
  }, [winners.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <SkeletonLoader />
      </div>
    );
  }

  if (isError || !program) {
    return (
      <EmptyState
        icon={Trophy}
        title="Announcements not available"
        description="Winners haven't been published for this program yet, or the page doesn't exist."
      />
    );
  }

  const topThree = winners.filter((w) => w.rank && w.rank <= 3).sort((a, b) => (a.rank || 99) - (b.rank || 99));
  const rest = winners.filter((w) => !w.rank || w.rank > 3);

  const podiumOrder = [
    topThree.find((w) => w.rank === 2),
    topThree.find((w) => w.rank === 1),
    topThree.find((w) => w.rank === 3),
  ].filter(Boolean) as WinnerEntry[];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link
            to={`/program?id=${program.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to program
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            Official Results
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          {program.cover_image_url && (
            <div className="mx-auto mb-6 h-32 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <img
                src={resolveMediaPublicUrl(program.cover_image_url) || program.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300">
            <Crown className="h-4 w-4" />
            Winner Announcements
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">{program.title}</h1>
          {program.description && (
            <p className="mx-auto max-w-2xl text-lg text-white/60">{program.description}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-white/50">
            {announceRound?.title && (
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-400" />
                {announceRound.title}
              </span>
            )}
            {program.deadline && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(program.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </motion.section>

        {winners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-16 text-center">
            <Award className="mx-auto mb-4 h-12 w-12 text-white/30" />
            <h2 className="text-xl font-semibold text-white/90">Winners coming soon</h2>
            <p className="mt-2 text-white/50">
              The organizers are preparing the official announcement. Check back shortly.
            </p>
          </div>
        ) : (
          <>
            {podiumOrder.length > 0 && (
              <section className="mb-14">
                <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-amber-300/80">
                  Top honorees
                </h2>
                <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-3">
                  {podiumOrder.map((winner, idx) => {
                    const isFirst = winner.rank === 1;
                    const sub = winner.submission;
                    const cover = sub?.coverImageUrl
                      ? resolveMediaPublicUrl(sub.coverImageUrl) || sub.coverImageUrl
                      : null;
                    return (
                      <motion.article
                        key={winner.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.12 }}
                        className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-white/10 to-white/5 p-6 text-center ${
                          isFirst
                            ? 'order-first border-amber-400/40 shadow-[0_0_60px_-15px_rgba(251,191,36,0.5)] md:order-none md:-mt-4'
                            : 'border-white/10'
                        }`}
                      >
                        <div className="mb-4 text-3xl">
                          {winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : '🥉'}
                        </div>
                        {cover ? (
                          <img src={cover} alt="" className="mx-auto mb-4 h-24 w-24 rounded-full border-2 border-white/20 object-cover" />
                        ) : (
                          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/20 bg-white/10">
                            <Star className="h-10 w-10 text-amber-300/60" />
                          </div>
                        )}
                        <h3 className="text-lg font-bold">{sub?.title || 'Winner'}</h3>
                        <p className="text-sm text-white/60">{sub?.applicantName}</p>
                        {winner.tier && (
                          <span className="mt-3 inline-block rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200">
                            {winner.tier}
                          </span>
                        )}
                        {isFirst && (
                          <Crown className="absolute right-4 top-4 h-5 w-5 text-amber-400" />
                        )}
                      </motion.article>
                    );
                  })}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
                  <Medal className="h-5 w-5 text-violet-400" />
                  All recognized entries
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {rest.map((winner, idx) => {
                    const sub = winner.submission;
                    return (
                      <motion.article
                        key={winner.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + idx * 0.05 }}
                        className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-5"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-lg font-bold text-violet-200">
                          #{winner.rank || idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold">{sub?.title || 'Honoree'}</h3>
                          <p className="text-sm text-white/50">{sub?.applicantName}</p>
                          {sub?.category && (
                            <span className="mt-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/70">
                              {sub.category}
                            </span>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};
