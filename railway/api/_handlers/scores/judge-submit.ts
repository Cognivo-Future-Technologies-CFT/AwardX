import { createClient } from '@supabase/supabase-js';
import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { judgeSubmitScoresSchema } from '../../_utils/validation';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`judge-submit:${ip}`, 30, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }

  const parsed = judgeSubmitScoresSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return;
  }

  const { token, submissionJudgeId, criteriaScores, overallComment } = parsed.data;

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase not configured' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Authenticate: look up the judge by invite_token.
    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select('id, status')
      .eq('invite_token', token)
      .single();

    if (judgeError || !judge) {
      res.status(401).json({ error: 'Invalid or expired invite token.' });
      return;
    }

    if (judge.status !== 'active') {
      res.status(403).json({ error: 'Judge account is no longer active' });
      return;
    }

    // 2. Authorise: confirm the judge owns this submission_judge row.
    const { data: assignment, error: assignmentError } = await supabase
      .from('submission_judges')
      .select('id, submission_id, submissions!inner(program_id)')
      .eq('id', submissionJudgeId)
      .eq('judge_id', judge.id)
      .maybeSingle();

    if (assignmentError || !assignment) {
      res.status(403).json({ error: 'You are not assigned to this submission.' });
      return;
    }

    const programId = (assignment as any).submissions?.program_id;

    // 3. Validate all criterion IDs belong to the program.
    const criterionIds = Array.from(new Set(criteriaScores.map((cs) => cs.criterionId)));
    const { data: criteriaRows, error: criteriaError } = await supabase
      .from('judging_criteria')
      .select('id, min_score, max_score')
      .eq('program_id', programId)
      .in('id', criterionIds);

    if (criteriaError) {
      res.status(500).json({ error: 'Failed to validate judging criteria.' });
      return;
    }

    const criteriaById = new Map((criteriaRows || []).map((c: any) => [c.id, c]));
    for (const cs of criteriaScores) {
      const criterion = criteriaById.get(cs.criterionId);
      if (!criterion) {
        res.status(400).json({ error: `Invalid criterion: ${cs.criterionId}` });
        return;
      }
      const min = Number(criterion.min_score ?? 0);
      const max = Number(criterion.max_score ?? 100);
      if (!Number.isFinite(cs.score) || cs.score < min || cs.score > max) {
        res.status(400).json({ error: `Score for criterion ${cs.criterionId} must be between ${min} and ${max}.` });
        return;
      }
    }

    // 4. Upsert scores.
    const scoreRows = criteriaScores.map((cs) => ({
      submission_judge_id: submissionJudgeId,
      criterion_id: cs.criterionId,
      score: cs.score,
      comment: cs.comment || null,
      scored_at: new Date().toISOString(),
    }));

    const { error: scoresError } = await supabase
      .from('scores')
      .upsert(scoreRows, { onConflict: 'submission_judge_id,criterion_id' });

    if (scoresError) {
      res.status(500).json({ error: scoresError.message || 'Failed to save scores.' });
      return;
    }

    // 5. Upsert overall comment if provided.
    if (overallComment) {
      await supabase
        .from('judge_comments')
        .upsert(
          {
            submission_judge_id: submissionJudgeId,
            overall_comment: overallComment,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'submission_judge_id' },
        );
    }

    // 6. Mark assignment as completed.
    await supabase
      .from('submission_judges')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', submissionJudgeId);

    res.json({ ok: true });
  } catch (error: any) {
    console.error('Judge submit scores error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
