import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();

function mapEnrollmentWinners(
  enrollments: any[],
  announcedAt: string,
  idPrefix: string,
) {
  return (enrollments || [])
    .map((row: any, idx: number) => {
      const sub = row.submissions;
      if (!sub) return null;
      const score = row.carried_score ?? sub.average_score ?? null;
      return {
        id: `${idPrefix}-${sub.id}`,
        rank: idx + 1,
        tier: idx === 0 ? 'Winner' : idx === 1 ? 'Runner-up' : idx === 2 ? 'Third place' : 'Finalist',
        finalScore: score,
        judgeScore: score,
        publicVotes: sub.votes_count ?? 0,
        announcedAt,
        submission: {
          id: sub.id,
          title: sub.title,
          description: sub.description,
          applicantName: sub.applicant_name,
          coverImageUrl: sub.cover_image_url,
          category: sub.categories?.title || null,
        },
      };
    })
    .filter(Boolean);
}

async function loadPublishedWinners(programId: string) {
  const supabase = getSupabaseAdmin();

  const { data: winners, error: winnersError } = await supabase
    .from('winner_announcements')
    .select(`
      id,
      rank,
      tier,
      final_score,
      judge_score,
      public_votes,
      announced_at,
      is_published,
      submissions (
        id,
        title,
        description,
        applicant_name,
        cover_image_url,
        category_id,
        categories ( title )
      )
    `)
    .eq('program_id', programId)
    .eq('is_published', true)
    .order('rank', { ascending: true, nullsFirst: false });

  if (winnersError) {
    throw new Error(winnersError.message);
  }

  return (winners || []).map((row: any) => ({
    id: row.id,
    rank: row.rank,
    tier: row.tier,
    finalScore: row.final_score,
    judgeScore: row.judge_score,
    publicVotes: row.public_votes,
    announcedAt: row.announced_at,
    submission: row.submissions
      ? {
          id: row.submissions.id,
          title: row.submissions.title,
          description: row.submissions.description,
          applicantName: row.submissions.applicant_name,
          coverImageUrl: row.submissions.cover_image_url,
          category: row.submissions.categories?.title || null,
        }
      : null,
  }));
}

const ENROLLMENT_SELECT = `
  submission_id,
  carried_score,
  status,
  submissions (
    id,
    title,
    description,
    applicant_name,
    cover_image_url,
    average_score,
    votes_count,
    categories ( title )
  )
`;

async function loadRoundParticipants(roundId: string, announcedAt: string, idPrefix: string) {
  const supabase = getSupabaseAdmin();
  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select(ENROLLMENT_SELECT)
    .eq('round_id', roundId)
    .in('status', ['active', 'advanced', 'shortlisted'])
    .order('carried_score', { ascending: false, nullsFirst: false });

  return mapEnrollmentWinners(enrollments || [], announcedAt, idPrefix);
}

/** Fallback: Announce enrollments, then prior pipeline rounds if Announce is still empty. */
async function loadAnnounceRoundParticipants(programId: string) {
  const supabase = getSupabaseAdmin();

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, title, type, status, end_date, is_finalized, sort_order')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true });

  const announceRound =
    (rounds || []).find((r) => String(r.type || '').toLowerCase() === 'announce') || null;

  if (announceRound) {
    const winners = await loadRoundParticipants(
      announceRound.id,
      announceRound.end_date || new Date().toISOString(),
      'announce',
    );
    if (winners.length > 0) {
      return { announceRound, winners };
    }
  }

  // ponytail: if Announce isn't populated yet, show standings from the latest upstream round
  const upstream = [...(rounds || [])]
    .filter((r) => {
      const t = String(r.type || '').toLowerCase();
      return t !== 'announce' && t !== 'nomination';
    })
    .reverse();

  for (const round of upstream) {
    const winners = await loadRoundParticipants(
      round.id,
      round.end_date || new Date().toISOString(),
      `standings-${round.id.slice(0, 8)}`,
    );
    if (winners.length > 0) {
      return {
        announceRound: announceRound || {
          id: round.id,
          title: `${round.title} (preliminary)`,
          status: round.status,
          end_date: round.end_date,
          is_finalized: round.is_finalized,
        },
        winners,
      };
    }
  }

  return { announceRound, winners: [] as any[] };
}

router.get('/programs/:programId/public', async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id, title, description, cover_image_url, status, deadline, industry_category')
      .eq('id', programId)
      .maybeSingle();

    if (programError) {
      return res.status(500).json({ error: programError.message });
    }
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    let winners = await loadPublishedWinners(programId);
    let announceRound = null;

    if (winners.length === 0) {
      // If Announce round is active/has enrollments, try to publish then reload
      const { data: announce } = await supabase
        .from('rounds')
        .select('id, status')
        .eq('program_id', programId)
        .ilike('type', 'announce')
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (announce && ['active', 'completed'].includes(String(announce.status || ''))) {
        try {
          const { publishWinnersFromAnnounceRound } = await import('../services/advancementEngine.js');
          await publishWinnersFromAnnounceRound(announce.id, 'public_page');
          winners = await loadPublishedWinners(programId);
        } catch (err) {
          console.error('[announcements] auto-publish failed:', err);
        }
      }
    }

    if (winners.length === 0) {
      const fallback = await loadAnnounceRoundParticipants(programId);
      winners = fallback.winners;
      announceRound = fallback.announceRound;
    } else {
      const { data: roundRow } = await supabase
        .from('rounds')
        .select('id, title, status, end_date, is_finalized')
        .eq('program_id', programId)
        .ilike('type', 'announce')
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      announceRound = roundRow;
    }

    return res.json({
      data: {
        program,
        announceRound,
        winners,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
