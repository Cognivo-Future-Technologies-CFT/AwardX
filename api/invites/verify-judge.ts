import { createClient } from '@supabase/supabase-js';
import { enforceRateLimit, getClientIp } from '../_utils/rateLimit';
import { verifyJudgeSchema } from '../_utils/validation';

export default async function handler(req: any, res: any) {
  // Allow GET (link click) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`verify-judge:${ip}`, 10, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }

  const tokenCandidate = req.method === 'GET' ? req.query?.token : req.body?.token;
  const parsed = verifyJudgeSchema.safeParse({ token: tokenCandidate });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid token format', details: parsed.error.flatten() });
    return;
  }

  const { token } = parsed.data;

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase not configured' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Find the judge by invite_token.
    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select('id, name, email, avatar_url, bio, status, program_id, organization_id, invite_token_used_at')
      .eq('invite_token', token)
      .single();

    if (judgeError || !judge) {
      res.status(404).json({ error: 'Invalid or expired invite link. This link may have already been used.' });
      return;
    }

    // 2. Mark first-time acceptance, but allow repeat opens for the same invite link.
    // This keeps judge portals refreshable and ensures new assignments show up.
    if (!judge.invite_token_used_at) {
      const { error: updateError } = await supabase
        .from('judges')
        .update({
          invite_token_used_at: new Date().toISOString(),
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', judge.id);

      if (updateError) {
        console.error('Failed to mark token as used:', updateError);
        res.status(500).json({ error: 'Failed to process invite' });
        return;
      }
    }

    // 4. Fetch the program details
    let program = null;
    if (judge.program_id) {
      const { data: programData } = await supabase
        .from('programs')
        .select('id, title, slug, description, cover_image_url, status, deadline, timezone, industry_category')
        .eq('id', judge.program_id)
        .single();
      program = programData;
    }

    // 5. Fetch judge assignments with submission details.
    let assignments: any[] = [];
    if (judge.id) {
      const { data: assignmentData } = await supabase
        .from('submission_judges')
        .select(`
          id,
          status,
          completed_at,
          assigned_at,
          submission_id,
          submissions (
            id,
            title,
            description,
            cover_image_url,
            status,
            category_id,
            submitted_at,
            applicant_name,
            vote_count
          )
        `)
        .eq('judge_id', judge.id)
        .order('assigned_at', { ascending: false });

      assignments = assignmentData || [];

      if (assignments.length > 0) {
        const categoryIds = [...new Set(assignments.map((row: any) => row.submissions?.category_id).filter(Boolean))];
        let categoryMap = new Map<string, string>();
        if (categoryIds.length > 0) {
          const { data: categories } = await supabase
            .from('categories')
            .select('id, title')
            .in('id', categoryIds);
          categoryMap = new Map((categories || []).map((c: any) => [c.id, c.title]));
        }

        assignments = assignments.map((row: any) => ({
          ...row,
          category_name: categoryMap.get(row.submissions?.category_id) || 'Uncategorized',
        }));
      }
    }

    // 6. Fetch judging criteria for the program
    let criteria: any[] = [];
    if (judge.program_id) {
      const { data: criteriaData } = await supabase
        .from('judging_criteria')
        .select('id, name, description, weight, min_score, max_score, sort_order')
        .eq('program_id', judge.program_id)
        .order('sort_order');
      criteria = criteriaData || [];
    }

    // 7. Fetch organization name
    let organizationName = '';
    if (judge.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', judge.organization_id)
        .single();
      organizationName = org?.name || '';
    }

    res.json({
      ok: true,
      judge: {
        id: judge.id,
        name: judge.name,
        email: judge.email,
        avatarUrl: judge.avatar_url,
        bio: judge.bio,
      },
      program: program ? {
        id: program.id,
        title: program.title,
        description: program.description,
        coverImageUrl: program.cover_image_url,
        status: program.status,
        deadline: program.deadline,
        timezone: program.timezone,
        industryCategory: program.industry_category,
      } : null,
      organization: organizationName,
      assignments: assignments.map((row: any) => ({
        submissionJudgeId: row.id,
        status: row.status,
        completedAt: row.completed_at,
        submission: row.submissions ? {
          id: row.submissions.id,
          title: row.submissions.title,
          description: row.submissions.description,
          coverImageUrl: row.submissions.cover_image_url,
          status: row.submissions.status,
          category: row.category_name || 'Uncategorized',
          submittedAt: row.submissions.submitted_at,
          applicantName: row.submissions.applicant_name,
          voteCount: row.submissions.vote_count,
        } : null,
      })),
      criteria: criteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        weight: c.weight,
        minScore: c.min_score,
        maxScore: c.max_score,
      })),
    });
  } catch (error: any) {
    console.error('Verify judge error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
