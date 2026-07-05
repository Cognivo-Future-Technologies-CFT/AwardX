import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { ensureCanManageProgram } from '../middleware/programManagement.js';
import { getSupabaseAdmin } from '../supabase.js';
import { createNotification } from '../services/notifications.js';

const router = Router();

function mapCategory(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    program_id: row.program_id,
    parent_id: row.parent_id,
    description: row.description,
    sort_order: row.sort_order,
    entries_count: row.entries_count,
    created_at: row.created_at,
  };
}

router.get('/:programId/categories', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to load categories' });
    }

    return res.json({ data: (data || []).map((row) => mapCategory(row as Record<string, unknown>)) });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/:programId/categories', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const parentId = req.body?.parent_id ?? req.body?.parentId ?? null;

  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();

    // Check for duplicate category name at the same level under the same program
    let dupQuery = supabase
      .from('categories')
      .select('id')
      .eq('program_id', programId)
      .ilike('title', title);

    if (parentId) {
      dupQuery = dupQuery.eq('parent_id', parentId);
    } else {
      dupQuery = dupQuery.is('parent_id', null);
    }

    const { data: duplicate, error: duplicateError } = await dupQuery.maybeSingle();
    if (duplicateError) {
      console.error('Error checking duplicate category name:', duplicateError);
    }
    if (duplicate) {
      return res.status(409).json({ error: 'A category with this name already exists at this level' });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        program_id: programId,
        parent_id: parentId || null,
        title,
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to create category' });
    }

    const { data: program } = await supabase.from('programs').select('organization_id').eq('id', programId).maybeSingle();
    if (program?.organization_id) {
      await createNotification(supabase, {
        organizationId: program.organization_id,
        programId,
        type: 'award',
        title: 'New Award Configured',
        body: `"${data.title}" award has been added.`,
        view: 'awards',
        metadata: {
          entityId: data.id,
          entityType: 'category',
        },
      });
    }

    return res.status(201).json({ data: mapCategory(data as Record<string, unknown>) });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/:programId/categories', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('program_id', programId);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete all categories' });
    }

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/:programId/categories/:categoryId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId, categoryId } = req.params;
  if (!programId || !categoryId) {
    return res.status(400).json({ error: 'programId and categoryId are required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .eq('program_id', programId)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ error: existingError.message || 'Failed to load category' });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('program_id', programId);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete category' });
    }

    const { data: program } = await supabase.from('programs').select('organization_id').eq('id', programId).maybeSingle();
    if (program?.organization_id) {
      await createNotification(supabase, {
        organizationId: program.organization_id,
        programId,
        type: 'award',
        title: 'Award Deleted',
        body: `An award/category has been deleted.`,
        view: 'awards',
        metadata: {
          entityId: categoryId,
          entityType: 'category',
        },
      });
    }

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
