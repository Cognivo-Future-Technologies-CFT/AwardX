import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { canAccessProgram } from '../middleware/programAccess.js';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();

async function ensureCanAccessProgram(req: AuthenticatedRequest, programId: string) {
  if (!req.userId) {
    return { ok: false as const, status: 401, error: 'Missing authenticated user' };
  }

  const permitted = await canAccessProgram(req.userId, programId);
  if (!permitted) {
    return { ok: false as const, status: 403, error: 'You do not have access to this program' };
  }

  return { ok: true as const };
}

async function resolveFormProgram(formId: string): Promise<{ id: string; program_id: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('program_forms')
    .select('id, program_id')
    .eq('id', formId)
    .maybeSingle();
  return data || null;
}

router.get('/:programId', requireAuth, async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const access = await ensureCanAccessProgram(req, programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('program_forms')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to fetch forms' });
    }

    return res.json({ data: data || [] });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/:programId', requireAuth, async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const access = await ensureCanAccessProgram(req, programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const payload = req.body || {};
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('program_forms')
      .insert({
        program_id: programId,
        title: payload.title,
        description: payload.description || null,
        is_active: payload.is_active ?? false,
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to create form' });
    }

    return res.status(201).json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.put('/:formId', requireAuth, async (req, res) => {
  const { formId } = req.params;
  if (!formId) {
    return res.status(400).json({ error: 'formId is required' });
  }

  try {
    const form = await resolveFormProgram(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const access = await ensureCanAccessProgram(req, form.program_id);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const payload = req.body || {};
    const updates = Object.fromEntries(
      Object.entries({
        title: payload.title,
        description: payload.description,
        is_active: payload.is_active,
        pages: payload.pages,
        theme: payload.theme,
        allow_multiple_nominations: payload.allow_multiple_nominations,
        max_nominations_per_person: payload.max_nominations_per_person,
        auto_accept_submissions: payload.auto_accept_submissions,
      }).filter(([, value]) => value !== undefined),
    );

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('program_forms')
      .update(updates)
      .eq('id', formId)
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to update form' });
    }

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/:formId', requireAuth, async (req, res) => {
  const { formId } = req.params;
  if (!formId) {
    return res.status(400).json({ error: 'formId is required' });
  }

  try {
    const form = await resolveFormProgram(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const access = await ensureCanAccessProgram(req, form.program_id);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { error: fieldsError } = await supabase
      .from('program_form_fields')
      .delete()
      .eq('form_id', formId);
    if (fieldsError) {
      return res.status(500).json({ error: fieldsError.message || 'Failed to delete form fields' });
    }

    const { error } = await supabase
      .from('program_forms')
      .delete()
      .eq('id', formId);

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete form' });
    }

    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.put('/:formId/fields', requireAuth, async (req, res) => {
  const { formId } = req.params;
  const fields = Array.isArray(req.body?.fields) ? req.body.fields : [];

  if (!formId) {
    return res.status(400).json({ error: 'formId is required' });
  }

  try {
    const form = await resolveFormProgram(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const access = await ensureCanAccessProgram(req, form.program_id);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { error: deleteError } = await supabase
      .from('program_form_fields')
      .delete()
      .eq('form_id', formId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message || 'Failed to reset form fields' });
    }

    if (fields.length > 0) {
      const payload = fields.map((field: any, index: number) => ({
        form_id: formId,
        label: field.label,
        type: field.type,
        required: !!field.required,
        config: field.config ?? {},
        sort_order: field.sort_order ?? index,
      }));

      const { error: insertError } = await supabase
        .from('program_form_fields')
        .insert(payload);

      if (insertError) {
        return res.status(500).json({ error: insertError.message || 'Failed to save form fields' });
      }
    }

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
