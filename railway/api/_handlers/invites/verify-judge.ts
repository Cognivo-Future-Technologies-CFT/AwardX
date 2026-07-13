import { createClient } from '@supabase/supabase-js';
import { enforceRateLimit, getClientIp } from '../../_utils/rateLimit';
import { verifyJudgeSchema } from '../../_utils/validation';
import { isAutoAssignJudging } from '../../../lib/judgingType';

async function loadScopedCategoryIds(
  // ponytail: createClient ReturnType is a generic default that rejects the runtime client
  supabase: any,
  judgeId: string,
  programId: string,
): Promise<Set<string>> {
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, parent_id')
    .eq('program_id', programId);

  const categories = categoriesData || [];
  const childrenByParent = new Map<string, string[]>();
  categories.forEach((category: any) => {
    if (!category.parent_id) return;
    childrenByParent.set(category.parent_id, [...(childrenByParent.get(category.parent_id) || []), category.id]);
  });

  const { data: assignments } = await supabase
    .from('judge_category_assignments')
    .select('category_id')
    .eq('judge_id', judgeId);

  const scopedCategoryIds = new Set<string>();
  const addCategoryAndChildren = (categoryId: string) => {
    if (scopedCategoryIds.has(categoryId)) return;
    scopedCategoryIds.add(categoryId);
    (childrenByParent.get(categoryId) || []).forEach(addCategoryAndChildren);
  };

  (assignments || [])
    .map((row: any) => row.category_id)
    .filter(Boolean)
    .forEach(addCategoryAndChildren);

  return scopedCategoryIds;
}

function submissionInScope(submission: any, scopedCategoryIds: Set<string>): boolean {
  const categoryId = submission?.category_id;
  return !!categoryId && scopedCategoryIds.has(categoryId);
}

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

    // 4–7. Fetch program, assignments, criteria, and org name in parallel.
    const [programResult, orgResult] = await Promise.all([
      // 4. Program details
      judge.program_id
        ? supabase
            .from('programs')
            .select('id, title, slug, description, cover_image_url, status, deadline, timezone, industry_category, judging_type')
            .eq('id', judge.program_id)
            .single()
        : Promise.resolve({ data: null }),

      // 7. Organization name
      judge.organization_id
        ? supabase
            .from('organizations')
            .select('name')
            .eq('id', judge.organization_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    const program = programResult.data;
    const organizationName: string = (orgResult.data as any)?.name || '';
    const judgingType = (program as any)?.judging_type;
    const autoAssign = isAutoAssignJudging(judgingType);
    const effectiveProgramId = judge.program_id || (program as any)?.id;

    let scopedCategoryIds = new Set<string>();
    if (autoAssign && effectiveProgramId) {
      scopedCategoryIds = await loadScopedCategoryIds(supabase, judge.id, effectiveProgramId);
    }

    if (req.method === 'GET' && !judge.invite_token_used_at) {
      res.json({
        ok: true,
        requiresAcceptance: true,
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
      });
      return;
    }

    if (req.method === 'POST') {
      const action = String(req.body?.action || 'accept').trim().toLowerCase();
      if (action !== 'accept' && action !== 'decline') {
        res.status(400).json({ error: 'Invalid action parameter' });
        return;
      }

      if (action === 'decline') {
        const { error: updateError } = await supabase
          .from('judges')
          .update({
            status: 'declined',
            invite_token_used_at: new Date().toISOString(),
          })
          .eq('id', judge.id);

        if (updateError) {
          console.error('Failed to decline judge invite:', updateError);
          res.status(500).json({ error: 'Failed to process invite' });
          return;
        }

        res.json({ ok: true, declined: true });
        return;
      }

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
    }

    // Now fetch assignments and criteria for active judges
    const [assignmentResult, criteriaResult] = await Promise.all([
      // 5. Judge assignments with submission details
      supabase
        .from('submission_judges')
        .select(`
          id,
          status,
          completed_at,
          assigned_at,
          submission_id,
          round_id,
          rounds (
            id,
            title,
            type,
            status
          ),
          submissions (
            id,
            title,
            description,
            cover_image_url,
            status,
            category_id,
            submitted_at,
            applicant_name,
            votes_count,
            submission_data
          )
        `)
        .eq('judge_id', judge.id)
        .order('assigned_at', { ascending: false }),

      // 6. Judging criteria
      judge.program_id
        ? supabase
            .from('judging_criteria')
            .select('id, name, description, weight, min_score, max_score, sort_order')
            .eq('program_id', judge.program_id)
            .order('sort_order')
        : Promise.resolve({ data: [] }),
    ]);

    let assignments: any[] = assignmentResult.data || [];
    const criteria: any[] = criteriaResult.data || [];

    if (autoAssign) {
      if (scopedCategoryIds.size === 0) {
        res.status(403).json({
          error: 'No category assignments found for your judge account. Contact the organizer to assign categories before judging.',
        });
        return;
      }

      const inScope = assignments.filter((row: any) => submissionInScope(row.submissions, scopedCategoryIds));
      const outOfScope = assignments.filter((row: any) => !submissionInScope(row.submissions, scopedCategoryIds) && row.status === 'pending');

      if (outOfScope.length > 0) {
        const outOfScopeIds = outOfScope.map((row: any) => row.id);
        await supabase
          .from('submission_judges')
          .delete()
          .in('id', outOfScopeIds);
      }

      assignments = inScope;
    }

    // Parallel judging only: if no explicit assignments, auto-assign all program submissions.
    if (!autoAssign && effectiveProgramId && assignments.length === 0) {
      const { data: programSubs } = await supabase
        .from('submissions')
        .select('id, title, description, cover_image_url, status, category_id, submitted_at, applicant_name, votes_count, submission_data')
        .eq('program_id', effectiveProgramId)
        .order('submitted_at', { ascending: false });

      if (programSubs && programSubs.length > 0) {
        const inserts = programSubs.map((sub: any) => ({
          submission_id: sub.id,
          judge_id: judge.id,
          status: 'pending',
        }));
        const { data: created } = await supabase
          .from('submission_judges')
          .upsert(inserts, { onConflict: 'submission_id,judge_id' })
          .select('id, status, completed_at, assigned_at, submission_id');

        if (created && created.length > 0) {
          const subMap = new Map(programSubs.map((s: any) => [s.id, s]));
          assignments = created.map((row: any) => ({
            ...row,
            submissions: subMap.get(row.submission_id) || null,
          }));
        }
      }
    }

    // Auto Assign: backfill missing submission_judges for in-scope submissions.
    if (autoAssign && effectiveProgramId && scopedCategoryIds.size > 0) {
      const { data: scopedSubs } = await supabase
        .from('submissions')
        .select('id, title, description, cover_image_url, status, category_id, submitted_at, applicant_name, votes_count, submission_data')
        .eq('program_id', effectiveProgramId)
        .in('category_id', Array.from(scopedCategoryIds))
        .order('submitted_at', { ascending: false });

      const existingSubmissionIds = new Set(assignments.map((row: any) => row.submission_id));
      const missingSubs = (scopedSubs || []).filter((sub: any) => !existingSubmissionIds.has(sub.id));

      if (missingSubs.length > 0) {
        const inserts = missingSubs.map((sub: any) => ({
          submission_id: sub.id,
          judge_id: judge.id,
          status: 'pending',
        }));
        const { data: created } = await supabase
          .from('submission_judges')
          .upsert(inserts, { onConflict: 'submission_id,judge_id' })
          .select('id, status, completed_at, assigned_at, submission_id, round_id, rounds(id, title, type, status)');

        if (created && created.length > 0) {
          const subMap = new Map((scopedSubs || []).map((s: any) => [s.id, s]));
          assignments = [
            ...assignments,
            ...created.map((row: any) => ({
              ...row,
              submissions: subMap.get(row.submission_id) || null,
            })),
          ];
        }
      }
    }

    // Enrich assignments with category names
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
        round: row.rounds ? {
          id: row.rounds.id,
          name: row.rounds.title,
          type: row.rounds.type,
          status: row.rounds.status,
        } : null,
        submission: row.submissions ? {
          id: row.submissions.id,
          title: row.submissions.title,
          description: row.submissions.description,
          coverImageUrl: row.submissions.cover_image_url,
          status: row.submissions.status,
          category: row.category_name || 'Uncategorized',
          submittedAt: row.submissions.submitted_at,
          applicantName: row.submissions.applicant_name,
          voteCount: row.submissions.votes_count,
          submissionData: row.submissions.submission_data || {},
        } : null,
      })),
      criteria: criteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        weight: c.weight,
        minScore: c.min_score,
        maxScore: c.max_score,
        sortOrder: c.sort_order,
      })),
    });
  } catch (error: any) {
    console.error('Verify judge error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
