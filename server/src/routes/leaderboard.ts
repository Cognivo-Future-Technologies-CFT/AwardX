/**
 * Leaderboard Routes
 *
 * Returns live leaderboard data combining judge scores and public vote counts.
 * No auth required for public-facing rounds; admin gets full data.
 */

import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';
import { cacheKeys, cacheTtls, wrapWithCache } from '../cache/redisCache.js';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  submissionId: string;
  title: string;
  applicantName: string;
  category: string | null;
  status: string;
  judgeScore: number | null;        // weighted avg, normalized 0–100
  judgeCount: number;
  voteCount: number;
  combinedScore: number;
}

interface RoundLeaderboard {
  round: { id: string; title: string; type: string; status: string };
  entries: LeaderboardEntry[];
  updatedAt: string;
}

async function buildRoundLeaderboard(roundId: string): Promise<RoundLeaderboard | null> {
  const supabase = getSupabaseAdmin();

  const [roundResult, enrollmentsResult, judgeAssignmentsResult, votesResult] = await Promise.all([
    supabase
      .from('rounds')
      .select('id, title, type, status, program_id')
      .eq('id', roundId)
      .maybeSingle(),
    supabase
      .from('round_submissions')
      .select(`
        submission_id,
        status,
        submissions (
          id, title, applicant_name, category_id,
          categories ( title )
        )
      `)
      .eq('round_id', roundId),
    supabase
      .from('submission_judges')
      .select(`
        submission_id,
        status,
        scores ( score, criterion_id, judging_criteria ( weight, max_score ) )
      `)
      .eq('round_id', roundId)
      .eq('status', 'completed'),
    supabase
      .from('public_votes')
      .select('submission_id')
      .eq('round_id', roundId),
  ]);

  if (!roundResult.data) return null;

  const round = roundResult.data;
  const enrollments = enrollmentsResult.data || [];
  const completedJudgings = judgeAssignmentsResult.data || [];
  const votes = votesResult.data || [];

  // Vote count map
  const voteMap: Record<string, number> = {};
  for (const v of votes) {
    voteMap[v.submission_id] = (voteMap[v.submission_id] || 0) + 1;
  }

  // Weighted judge score map (normalised 0-100)
  const judgeScoreMap: Record<string, { totalWeighted: number; totalWeight: number; judgeCount: number }> = {};
  for (const assignment of completedJudgings) {
    const subId = assignment.submission_id;
    if (!judgeScoreMap[subId]) {
      judgeScoreMap[subId] = { totalWeighted: 0, totalWeight: 0, judgeCount: 0 };
    }
    const scores = (assignment as any).scores || [];
    let hasScore = false;
    for (const s of scores) {
      const weight = Number(s.judging_criteria?.weight) || 100;
      const maxScore = Number(s.judging_criteria?.max_score) || 10;
      const normalized = (Number(s.score) / maxScore) * weight;
      judgeScoreMap[subId].totalWeighted += normalized;
      judgeScoreMap[subId].totalWeight += weight;
      hasScore = true;
    }
    if (hasScore) judgeScoreMap[subId].judgeCount++;
  }

  const entries: LeaderboardEntry[] = enrollments.map((e: any) => {
    const subId = e.submission_id;
    const sub = e.submissions || {};
    const scoreData = judgeScoreMap[subId];

    // Normalize judge score to 0-100
    const judgeScore =
      scoreData && scoreData.totalWeight > 0
        ? Math.round((scoreData.totalWeighted / scoreData.totalWeight) * 100) / 100 // already on 0-100 scale via weight normalization
        : null;

    const voteCount = voteMap[subId] || 0;

    // Combined score: judge score (0-100) + votes weighted at 0.1 per vote
    const combinedScore =
      judgeScore !== null ? judgeScore + voteCount * 0.1 : voteCount;

    return {
      rank: 0, // assigned after sort
      submissionId: subId,
      title: sub.title || 'Untitled',
      applicantName: sub.applicant_name || 'Unknown',
      category: (sub.categories as any)?.title || null,
      status: e.status,
      judgeScore,
      judgeCount: scoreData?.judgeCount || 0,
      voteCount,
      combinedScore,
    };
  });

  // Sort descending by combined score
  entries.sort((a, b) => b.combinedScore - a.combinedScore);
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return {
    round: {
      id: round.id,
      title: round.title,
      type: round.type,
      status: round.status,
    },
    entries,
    updatedAt: new Date().toISOString(),
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /leaderboard/rounds/:roundId
 * Per-round leaderboard: judge scores + public vote counts.
 * Public-facing — no auth required.
 */
router.get('/rounds/:roundId', async (req, res) => {
  const { roundId } = req.params;

  try {
    const data = await wrapWithCache(
      cacheKeys.leaderboardByRound(roundId),
      cacheTtls.short,
      () => buildRoundLeaderboard(roundId),
    );

    if (!data) {
      return res.status(404).json({ error: 'Round not found' });
    }

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

/**
 * GET /leaderboard/:programId
 * Program-level leaderboard: one entry per active/completed round.
 * Public-facing — no auth required.
 */
router.get('/:programId', async (req, res) => {
  const { programId } = req.params;

  try {
    const data = await wrapWithCache(
      cacheKeys.leaderboardByProgram(programId),
      cacheTtls.short,
      async () => {
        const supabase = getSupabaseAdmin();

        const { data: rounds, error } = await supabase
          .from('rounds')
          .select('id, title, type, status, sort_order')
          .eq('program_id', programId)
          .in('status', ['active', 'completed'])
          .order('sort_order', { ascending: true });

        if (error) throw new Error(error.message);
        if (!rounds || rounds.length === 0) {
          return { programId, rounds: [], updatedAt: new Date().toISOString() };
        }

        const roundLeaderboards = await Promise.all(
          rounds.map((r) => buildRoundLeaderboard(r.id)),
        );

        return {
          programId,
          rounds: rounds.map((r, i) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            status: r.status,
            leaderboard: roundLeaderboards[i],
          })),
          updatedAt: new Date().toISOString(),
        };
      },
    );

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
