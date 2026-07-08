import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { ensureCanManageProgram } from '../middleware/programManagement.js';
import { getSupabaseAdmin } from '../supabase.js';
import { enrollSubmissionsInRootRound } from '../services/roundEngine.js';

const router = Router();

const UI_TO_DB_STATUS: Record<string, string> = {
  Pending: 'pending',
  'Under Review': 'under_review',
  Shortlisted: 'shortlisted',
  Accepted: 'accepted',
  Rejected: 'rejected',
  Withdrawn: 'withdrawn',
};

function mapSubmissionRow(row: Record<string, unknown>, categoryTitle?: string | null) {
  return {
    id: row.id,
    program_id: row.program_id,
    category_id: row.category_id,
    title: row.title,
    description: row.description,
    status: row.status,
    applicant_name: row.applicant_name,
    applicant_email: row.applicant_email,
    submitted_at: row.submitted_at,
    average_score: row.average_score,
    cover_image_url: row.cover_image_url,
    category_title: categoryTitle ?? null,
    submission_data: row.submission_data ?? null,
  };
}

async function resolveCategoryId(
  programId: string,
  options: { categoryId?: string | null; categoryTitle?: string | null },
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  if (options.categoryId) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('id', options.categoryId)
      .eq('program_id', programId)
      .maybeSingle();
    return data?.id ?? null;
  }

  const title = typeof options.categoryTitle === 'string' ? options.categoryTitle.trim() : '';
  if (!title || title === 'General') return null;

  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('program_id', programId)
    .eq('title', title)
    .maybeSingle();

  return data?.id ?? null;
}

router.get('/:programId/submissions', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const formId = typeof req.query.formId === 'string' ? req.query.formId.trim() : '';
  const offset = (page - 1) * pageSize;

  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('submissions')
      .select(
        `
        *,
        categories(title),
        submission_judges(judge_id)
      `,
        { count: 'exact' },
      )
      .eq('program_id', programId)
      .order('submitted_at', { ascending: false });

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,applicant_name.ilike.%${search}%,applicant_email.ilike.%${search}%`,
      );
    }

    if (formId) {
      // Include legacy/manual rows that predate form_id in submission_data.
      query = query.or(`submission_data->>form_id.eq.${formId},submission_data->>form_id.is.null`);
    }

    const { data, error, count } = await query.range(offset, offset + pageSize - 1);
    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to load submissions' });
    }

    const rows = (data || []).map((row: Record<string, unknown> & {
      categories?: { title?: string } | null;
      submission_judges?: Array<{ judge_id: string }>;
    }) => ({
      ...mapSubmissionRow(row, row.categories?.title ?? null),
      submission_judges: row.submission_judges || [],
    }));

    return res.json({
      data: rows,
      total: count || 0,
      page,
      pageSize,
      hasMore: offset + rows.length < (count || 0),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/:programId/submissions', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const applicantName =
    typeof req.body?.applicant_name === 'string'
      ? req.body.applicant_name.trim()
      : typeof req.body?.applicant === 'string'
        ? req.body.applicant.trim()
        : '';
  const applicantEmail =
    typeof req.body?.applicant_email === 'string' ? req.body.applicant_email.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description : '';
  const categoryId = req.body?.category_id ?? req.body?.categoryId ?? null;
  const categoryTitle = req.body?.category_title ?? req.body?.category ?? null;
  const statusRaw = req.body?.status;
  const responses =
    req.body?.responses && typeof req.body.responses === 'object' && !Array.isArray(req.body.responses)
      ? (req.body.responses as Record<string, unknown>)
      : {};

  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!applicantName) {
    return res.status(400).json({ error: 'applicant is required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const resolvedCategoryId = await resolveCategoryId(programId, {
      categoryId: categoryId || null,
      categoryTitle: categoryTitle || null,
    });

    let dbStatus = 'pending';
    if (typeof statusRaw === 'string') {
      dbStatus = UI_TO_DB_STATUS[statusRaw] || statusRaw.toLowerCase();
    }

    const supabase = getSupabaseAdmin();
    const { data: programRow } = await supabase
      .from('programs')
      .select('active_form_id')
      .eq('id', programId)
      .maybeSingle();

    const activeFormId =
      typeof programRow?.active_form_id === 'string' ? programRow.active_form_id : null;

    const { data, error } = await supabase
      .from('submissions')
      .insert({
        program_id: programId,
        category_id: resolvedCategoryId,
        title,
        description: description || '',
        status: dbStatus,
        applicant_name: applicantName,
        applicant_email: applicantEmail || null,
        applicant_id: req.userId || null,
        ...(activeFormId
          ? {
              submission_data: {
                form_id: activeFormId,
                source: 'dashboard',
                submitted_at: new Date().toISOString(),
                responses,
              },
            }
          : Object.keys(responses).length > 0
          ? {
              submission_data: {
                source: 'dashboard',
                submitted_at: new Date().toISOString(),
                responses,
              },
            }
          : {}),
      })
      .select('*, categories(title)')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to create submission' });
    }

    const row = data as Record<string, unknown> & { categories?: { title?: string } | null };
    const submissionId = String(row.id);

    try {
      await enrollSubmissionsInRootRound(programId, [submissionId]);
    } catch (enrollErr) {
      console.warn('[pipeline] Failed to auto-enroll submission in nomination round:', enrollErr);
    }

    return res.status(201).json({
      data: mapSubmissionRow(row, row.categories?.title ?? null),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.patch('/:programId/submissions/bulk', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  const statusRaw = req.body?.status;

  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }
  if (ids.length === 0) {
    return res.status(400).json({ error: 'ids is required' });
  }
  if (typeof statusRaw !== 'string' || !statusRaw.trim()) {
    return res.status(400).json({ error: 'status is required' });
  }

  const dbStatus = UI_TO_DB_STATUS[statusRaw] || statusRaw.toLowerCase();

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('submissions')
      .update({ status: dbStatus })
      .in('id', ids)
      .eq('program_id', programId);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to update submissions' });
    }

    return res.json({ ok: true, updated: ids.length });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/:programId/submissions', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];

  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }
  if (ids.length === 0) {
    return res.status(400).json({ error: 'ids is required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('submissions')
      .delete()
      .in('id', ids)
      .eq('program_id', programId);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete submissions' });
    }

    return res.json({ ok: true, deleted: ids.length });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/public/:submissionId/auto-assign', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { submissionId } = req.params;

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch the submission details (program_id, category_id) using service role (bypassing RLS)
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('program_id, category_id')
      .eq('id', submissionId)
      .single();

    if (subError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const { program_id: programId, category_id: categoryId } = submission;

    if (!categoryId) {
      return res.json({ ok: true, message: 'Submission has no category, skipping assignment' });
    }

    // Fetch the program details to verify judging_type is auto_assign
    const { data: program, error: progError } = await supabase
      .from('programs')
      .select('judging_type')
      .eq('id', programId)
      .single();

    if (progError || !program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    if (program.judging_type !== 'auto_assign') {
      return res.json({ ok: true, message: 'Program is not configured for auto_assign, skipping assignment' });
    }

    // Fetch categories to build the parent hierarchy
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, parent_id')
      .eq('program_id', programId);

    if (categoriesError) {
      return res.status(500).json({ error: categoriesError.message || 'Failed to load categories' });
    }

    const categories = categoriesData || [];
    const parentByChild = new Map<string, string | null>();
    categories.forEach((category: any) => {
      parentByChild.set(category.id, category.parent_id || null);
    });

    const matchingCategoryIds = new Set<string>([categoryId]);
    let cursor: string | null | undefined = categoryId;
    while (cursor) {
      const parentId = parentByChild.get(cursor);
      if (!parentId || matchingCategoryIds.has(parentId)) break;
      matchingCategoryIds.add(parentId);
      cursor = parentId;
    }

    // Fetch judge assignments mapped to these categories
    const { data: judgeAssignments, error: judgeAssignmentsError } = await supabase
      .from('judge_category_assignments')
      .select('judge_id, category_id, judges!inner(program_id, status)')
      .eq('judges.program_id', programId)
      .in('category_id', Array.from(matchingCategoryIds));

    if (judgeAssignmentsError) {
      return res.status(500).json({ error: judgeAssignmentsError.message || 'Failed to load category judges' });
    }

    const judgeIds = Array.from(
      new Set(
        (judgeAssignments || [])
          .filter((row: any) => String(row.judges?.status || '').toLowerCase() !== 'declined')
          .map((row: any) => row.judge_id)
          .filter(Boolean),
      ),
    );

    if (judgeIds.length > 0) {
      const rows = judgeIds.map((judgeId) => ({
        submission_id: submissionId,
        judge_id: judgeId,
        status: 'pending',
      }));

      const { error: upsertError } = await supabase
        .from('submission_judges')
        .upsert(rows, { onConflict: 'submission_id,judge_id' });

      if (upsertError) {
        return res.status(500).json({ error: upsertError.message || 'Failed to assign category judges' });
      }
    }

    return res.json({ ok: true, assignedCount: judgeIds.length });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
