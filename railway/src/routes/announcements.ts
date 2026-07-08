import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();

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

/** Fallback: participants enrolled in the Announce round when no published rows exist yet. */
async function loadAnnounceRoundParticipants(programId: string) {
  const supabase = getSupabaseAdmin();

  const { data: announceRound } = await supabase
    .from('rounds')
    .select('id, title, status, end_date, is_finalized')
    .eq('program_id', programId)
    .ilike('type', 'announce')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!announceRound) return { announceRound: null, winners: [] as any[] };

  const { data: enrollments } = await supabase
    .from('round_submissions')
    .select(`
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
    `)
    .eq('round_id', announceRound.id)
    .in('status', ['active', 'advanced'])
    .order('carried_score', { ascending: false, nullsFirst: false });

  const winners = (enrollments || [])
    .map((row: any, idx: number) => {
      const sub = row.submissions;
      if (!sub) return null;
      const score = row.carried_score ?? sub.average_score ?? null;
      return {
        id: `announce-${sub.id}`,
        rank: idx + 1,
        tier: idx === 0 ? 'Winner' : idx === 1 ? 'Runner-up' : idx === 2 ? 'Third place' : 'Finalist',
        finalScore: score,
        judgeScore: score,
        publicVotes: sub.votes_count ?? 0,
        announcedAt: announceRound.end_date || new Date().toISOString(),
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

  return { announceRound, winners };
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
      const fallback = await loadAnnounceRoundParticipants(programId);
      winners = fallback.winners;
      announceRound = fallback.announceRound;
    } else {
      const { data: roundRow } = await supabase
        .from('rounds')
        .select('id, title, status, end_date')
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
