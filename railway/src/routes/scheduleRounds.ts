import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { ensureCanManageProgram } from '../middleware/programManagement.js';
import { requireProgramAccess } from '../middleware/programAccess.js';
import { getSupabaseAdmin } from '../supabase.js';
import { cacheKeys, cacheTtls, deleteCache, wrapWithCache } from '../cache/redisCache.js';
import { validateRoundTransitions } from '../services/flowValidation.js';
import { createNotification } from '../services/notifications.js';

const router = Router();
const ALLOWED_ROUND_TYPES = new Set([
  'Nomination',
  'Shortlisting',
  'Public Voting',
  'Public Rating',
  'Announce',
  'jury',
  'public',
  'hybrid',
  'compliance',
  'custom',
]);
const ALLOWED_ROUND_STATUSES = new Set(['draft', 'scheduled', 'upcoming', 'active', 'completed', 'cancelled']);

function validationError(fields: Record<string, string>) {
  return {
    error: 'Validation failed',
    fields,
  };
}

function asIsoDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateRoundPayload(payload: any, options?: { partial?: boolean }) {
  const partial = Boolean(options?.partial);
  const fields: Record<string, string> = {};

  if (!partial || payload.title !== undefined) {
    if (typeof payload.title !== 'string' || !payload.title.trim()) {
      fields.title = 'title is required';
    }
  }

  if (!partial || payload.type !== undefined) {
    if (typeof payload.type !== 'string' || !ALLOWED_ROUND_TYPES.has(payload.type)) {
      fields.type = `type must be one of: ${Array.from(ALLOWED_ROUND_TYPES).join(', ')}`;
    }
  }

  if (payload.status !== undefined) {
    if (typeof payload.status !== 'string' || !ALLOWED_ROUND_STATUSES.has(payload.status)) {
      fields.status = `status must be one of: ${Array.from(ALLOWED_ROUND_STATUSES).join(', ')}`;
    }
  }

  if (payload.description !== undefined && payload.description !== null && typeof payload.description !== 'string') {
    fields.description = 'description must be a string or null';
  }

  if (payload.sort_order !== undefined) {
    const sortOrder = Number(payload.sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      fields.sort_order = 'sort_order must be an integer greater than or equal to 0';
    }
  }

  if (payload.settings !== undefined) {
    if (!payload.settings || typeof payload.settings !== 'object' || Array.isArray(payload.settings)) {
      fields.settings = 'settings must be an object';
    }
  }

  const startDate = payload.start_date !== undefined ? asIsoDate(payload.start_date) : null;
  const endDate = payload.end_date !== undefined ? asIsoDate(payload.end_date) : null;

  if (payload.start_date !== undefined && !startDate) {
    fields.start_date = 'start_date must be a valid ISO date string';
  }
  if (payload.end_date !== undefined && !endDate) {
    fields.end_date = 'end_date must be a valid ISO date string';
  }
  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    fields.date_range = 'start_date must be earlier than or equal to end_date';
  }

  return {
    ok: Object.keys(fields).length === 0,
    fields,
  };
}

function validateEdgesPayload(edges: any[]) {
  const fields: Record<string, string> = {};

  edges.forEach((edge, idx) => {
    const prefix = `edges[${idx}]`;
    if (!edge || typeof edge !== 'object') {
      fields[prefix] = 'each edge must be an object';
      return;
    }

    if (!edge.source_round_id || typeof edge.source_round_id !== 'string') {
      fields[`${prefix}.source_round_id`] = 'source_round_id is required';
    }
    if (!edge.target_round_id || typeof edge.target_round_id !== 'string') {
      fields[`${prefix}.target_round_id`] = 'target_round_id is required';
    }
    if (edge.sort_order !== undefined) {
      const sortOrder = Number(edge.sort_order);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        fields[`${prefix}.sort_order`] = 'sort_order must be an integer greater than or equal to 0';
      }
    }
  });

  return {
    ok: Object.keys(fields).length === 0,
    fields,
  };
}

function validateEdgesAsDag(roundIds: string[], edges: Array<{ source_round_id?: string; target_round_id?: string }>) {
  const roundIdSet = new Set(roundIds);
  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();
  const seenPairs = new Set<string>();

  for (const roundId of roundIds) {
    adjacency.set(roundId, new Set());
    indegree.set(roundId, 0);
  }

  for (const edge of edges) {
    const source = String(edge.source_round_id || '');
    const target = String(edge.target_round_id || '');

    if (!source || !target) {
      return { ok: false, error: 'Each edge must include source_round_id and target_round_id' };
    }
    if (!roundIdSet.has(source) || !roundIdSet.has(target)) {
      return { ok: false, error: 'Edges must connect existing rounds in this program' };
    }
    if (source === target) {
      return { ok: false, error: 'Self-referential round edges are not allowed' };
    }

    const pairKey = `${source}->${target}`;
    if (seenPairs.has(pairKey)) {
      return { ok: false, error: `Duplicate edge detected: ${source} -> ${target}` };
    }
    seenPairs.add(pairKey);

    const neighbors = adjacency.get(source)!;
    if (!neighbors.has(target)) {
      neighbors.add(target);
      indegree.set(target, (indegree.get(target) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [node, degree] of indegree.entries()) {
    if (degree === 0) queue.push(node);
  }

  let visited = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    visited += 1;
    for (const neighbor of adjacency.get(node) || []) {
      const nextDegree = (indegree.get(neighbor) || 0) - 1;
      indegree.set(neighbor, nextDegree);
      if (nextDegree === 0) queue.push(neighbor);
    }
  }

  if (visited !== roundIds.length) {
    return { ok: false, error: 'Round graph contains a cycle and cannot be saved' };
  }

  return { ok: true };
}

function validateEdgeCondition(raw: any) {
  const condition = raw && typeof raw === 'object' ? raw : { type: 'always' };
  const type = String(condition.type || 'always').toLowerCase();
  const allowed = new Set([
    'always',
    'if_shortlisted',
    'if_score_gte',
    'if_score_gt',
    'if_score_lt',
    'if_score_lte',
    'if_score_eq',
    'if_score_range',
    'manual_approval',
    'custom_logic'
  ]);

  if (!allowed.has(type)) {
    return { ok: false, error: `Unsupported edge condition type: ${type}` };
  }

  if (['if_score_gte', 'if_score_gt', 'if_score_lt', 'if_score_lte', 'if_score_eq'].includes(type)) {
    const value = Number(condition.score ?? condition.value);
    if (!Number.isFinite(value)) {
      return { ok: false, error: `${type} condition requires a numeric score threshold` };
    }
  }

  if (type === 'if_score_range') {
    const minScore = Number(condition.minScore ?? condition.min);
    const maxScore = Number(condition.maxScore ?? condition.max);
    if (!Number.isFinite(minScore) || !Number.isFinite(maxScore)) {
      return { ok: false, error: 'if_score_range condition requires numeric min and max score thresholds' };
    }
    if (minScore > maxScore) {
      return { ok: false, error: 'if_score_range minimum score cannot exceed maximum score' };
    }
  }

  return { ok: true };
}

async function invalidateSchedule(programId: string) {
  await Promise.all([
    deleteCache(cacheKeys.programRounds(programId)),
    deleteCache(cacheKeys.programRoundEdges(programId)),
    deleteCache(cacheKeys.programStats(programId)),
  ]);
}

router.get('/:programId/rounds', requireAuth, requireProgramAccess('programId'), async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const rounds = await wrapWithCache(cacheKeys.programRounds(programId), cacheTtls.medium, async () => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('program_id', programId)
        .order('sort_order', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Failed to fetch rounds');
      }

      return data || [];
    });

    return res.json({ data: rounds });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/:programId/edges', requireAuth, requireProgramAccess('programId'), async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const edges = await wrapWithCache(cacheKeys.programRoundEdges(programId), cacheTtls.short, async () => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('round_edges')
        .select('*')
        .eq('program_id', programId)
        .order('sort_order', { ascending: true });

      if (error) {
        throw new Error(error.message || 'Failed to fetch round edges');
      }

      return data || [];
    });

    return res.json({ data: edges });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/:programId/rounds', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const payload = req.body || {};
    const validation = validateRoundPayload(payload);
    if (!validation.ok) {
      return res.status(400).json(validationError(validation.fields));
    }

    const supabase = getSupabaseAdmin();
    const title = String(payload.title || '').trim();

    const { data: duplicate } = await supabase
      .from('rounds')
      .select('id')
      .eq('program_id', programId)
      .ilike('title', title)
      .maybeSingle();

    if (duplicate) {
      return res.status(400).json(validationError({ title: 'A round with this name already exists in this program' }));
    }

    const { data, error } = await supabase
      .from('rounds')
      .insert({
        program_id: programId,
        title: payload.title,
        description: payload.description || null,
        type: payload.type,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: payload.status || 'draft',
        sort_order: payload.sort_order ?? 0,
        settings: payload.settings || {},
        ...(payload.advancement_criteria !== undefined && { advancement_criteria: payload.advancement_criteria }),
        ...(payload.advancement_trigger !== undefined && { advancement_trigger: payload.advancement_trigger }),
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to create round' });
    }

    const { data: program } = await supabase.from('programs').select('organization_id').eq('id', programId).maybeSingle();
    if (program?.organization_id) {
      await createNotification(supabase, {
        organizationId: program.organization_id,
        programId: programId,
        type: 'judging',
        title: 'Round Created',
        body: `"${data.title}" round has been created.`,
        view: 'schedule-rounds',
        metadata: {
          entityId: data.id,
          entityType: 'round',
        },
      });
    }

    await invalidateSchedule(programId);
    return res.status(201).json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.put('/:programId/rounds/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId, id } = req.params;
  if (!programId || !id) {
    return res.status(400).json({ error: 'programId and round id are required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const payload = req.body || {};
    const validation = validateRoundPayload(payload, { partial: true });
    if (!validation.ok) {
      return res.status(400).json(validationError(validation.fields));
    }

    const supabase = getSupabaseAdmin();
    const { data: existingRound, error: existingRoundError } = await supabase
      .from('rounds')
      .select('id')
      .eq('id', id)
      .eq('program_id', programId)
      .maybeSingle();

    if (existingRoundError) {
      return res.status(500).json({ error: existingRoundError.message || 'Failed to load round' });
    }
    if (!existingRound) {
      return res.status(404).json({ error: 'Round not found' });
    }

    if (payload.title !== undefined) {
      const title = String(payload.title).trim();
      const { data: duplicate } = await supabase
        .from('rounds')
        .select('id')
        .eq('program_id', programId)
        .ilike('title', title)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return res.status(400).json(validationError({ title: 'A round with this name already exists in this program' }));
      }
    }

    const updates = {
      title: payload.title,
      description: payload.description,
      type: payload.type,
      start_date: payload.start_date,
      end_date: payload.end_date,
      status: payload.status,
      sort_order: payload.sort_order,
      settings: payload.settings,
      advancement_criteria: payload.advancement_criteria,
      advancement_trigger: payload.advancement_trigger,
    };

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from('rounds')
      .update(filteredUpdates)
      .eq('id', id)
      .eq('program_id', programId)
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to update round' });
    }

    const { data: program } = await supabase.from('programs').select('organization_id').eq('id', programId).maybeSingle();
    if (program?.organization_id) {
      await createNotification(supabase, {
        organizationId: program.organization_id,
        programId: programId,
        type: 'judging',
        title: 'Round Updated',
        body: `"${data.title}" round settings were updated.`,
        view: 'schedule-rounds',
        metadata: {
          entityId: data.id,
          entityType: 'round',
        },
      });
    }

    await invalidateSchedule(programId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/:programId/rounds/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId, id } = req.params;
  if (!programId || !id) {
    return res.status(400).json({ error: 'programId and round id are required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const supabase = getSupabaseAdmin();
    const { data: existingRound, error: existingRoundError } = await supabase
      .from('rounds')
      .select('id')
      .eq('id', id)
      .eq('program_id', programId)
      .maybeSingle();

    if (existingRoundError) {
      return res.status(500).json({ error: existingRoundError.message || 'Failed to load round' });
    }
    if (!existingRound) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const { error: edgeDeleteError } = await supabase
      .from('round_edges')
      .delete()
      .eq('program_id', programId)
      .or(`source_round_id.eq.${id},target_round_id.eq.${id}`);
    if (edgeDeleteError) {
      return res.status(500).json({ error: edgeDeleteError.message || 'Failed to delete round connections' });
    }

    const { error } = await supabase.from('rounds').delete().eq('id', id).eq('program_id', programId);
    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete round' });
    }

    const { data: program } = await supabase.from('programs').select('organization_id').eq('id', programId).maybeSingle();
    if (program?.organization_id) {
      await createNotification(supabase, {
        organizationId: program.organization_id,
        programId: programId,
        type: 'judging',
        title: 'Round Deleted',
        body: `A round has been deleted.`,
        view: 'schedule-rounds',
        metadata: {
          entityId: id,
          entityType: 'round',
        },
      });
    }

    await invalidateSchedule(programId);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.put('/:programId/edges', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    if (!Array.isArray(req.body?.edges)) {
      return res.status(400).json(validationError({ edges: 'edges must be an array' }));
    }

    const edges = req.body.edges;
    const payloadValidation = validateEdgesPayload(edges);
    if (!payloadValidation.ok) {
      return res.status(400).json(validationError(payloadValidation.fields));
    }

    const supabase = getSupabaseAdmin();

    const { data: roundRows, error: roundsError } = await supabase
      .from('rounds')
      .select('id, title, type')
      .eq('program_id', programId);

    if (roundsError) {
      return res.status(500).json({ error: roundsError.message || 'Failed to validate round graph' });
    }

    const roundIds = (roundRows || []).map((row: any) => row.id);
    const roundsMap = new Map((roundRows || []).map((row: any) => [row.id, row]));

    for (const edge of edges) {
      const conditionValidation = validateEdgeCondition(edge?.condition);
      if (!conditionValidation.ok) {
        return res.status(400).json(validationError({
          'edges.condition': conditionValidation.error || 'Invalid edge condition',
        }));
      }

      // Check backend rule constraints
      const sourceRound = roundsMap.get(edge.source_round_id);
      if (sourceRound) {
        const conditionType = edge.condition?.type || 'always';
        if (sourceRound.type === 'Nomination') {
          if (conditionType !== 'always') {
            return res.status(400).json(validationError({
              'edges.condition': 'Nomination rounds can only have "always" connection logic.',
            }));
          }
        } else {
          if (conditionType === 'always') {
            return res.status(400).json(validationError({
              'edges.condition': 'Only Nomination rounds can have "always" connection logic.',
            }));
          }
        }
      }
    }

    const dagValidation = validateEdgesAsDag(roundIds, edges);
    if (!dagValidation.ok) {
      return res.status(400).json(validationError({
        edges: dagValidation.error || 'Invalid edge graph',
      }));
    }

    const roundsList = (roundRows || []).map((row: any) => ({ id: row.id, title: row.title, type: row.type }));
    const transitionValidation = validateRoundTransitions(edges, roundsList);
    if (!transitionValidation.isValid) {
      const firstError = transitionValidation.errors.find(e => e.type === 'error');
      return res.status(400).json(validationError({
        edges: firstError?.message || 'Round flow transition logic contains overlapping or shadowed conditions.',
      }));
    }

    const { error: deleteError } = await supabase.from('round_edges').delete().eq('program_id', programId);
    if (deleteError) {
      return res.status(500).json({ error: deleteError.message || 'Failed to clear existing edges' });
    }

    if (edges.length > 0) {
      const normalizedEdges = edges.map((edge: any, idx: number) => {
        const sourceRound = roundsMap.get(edge.source_round_id);
        const defaultCondition = sourceRound?.type === 'Nomination' ? { type: 'always' } : { type: 'if_shortlisted' };
        return {
          program_id: programId,
          source_round_id: edge.source_round_id,
          target_round_id: edge.target_round_id,
          condition: edge.condition || defaultCondition,
          sort_order: edge.sort_order ?? idx,
        };
      });

      const { error: insertError } = await supabase.from('round_edges').insert(normalizedEdges);
      if (insertError) {
        return res.status(500).json({ error: insertError.message || 'Failed to save edges' });
      }
    }

    await invalidateSchedule(programId);
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

// ---- Active Form Management ----

router.get('/:programId/active-form', requireAuth, requireProgramAccess('programId'), async (req, res) => {
  const { programId } = req.params;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('programs')
      .select('active_form_id')
      .eq('id', programId)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data: { active_form_id: data?.active_form_id || null } });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.put('/:programId/active-form', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  const { form_id } = req.body || {};
  try {
    const access = await ensureCanManageProgram(req.userId || '', programId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    if (form_id !== undefined && form_id !== null && typeof form_id !== 'string') {
      return res.status(400).json(validationError({ form_id: 'form_id must be a string UUID or null' }));
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('programs')
      .update({ active_form_id: form_id || null })
      .eq('id', programId);
    if (error) return res.status(500).json({ error: error.message });
    await invalidateSchedule(programId);
    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

// ---- Round Submissions (Pipeline Enrollment) ----

router.get('/:programId/rounds/:roundId/submissions', requireAuth, requireProgramAccess('programId'), async (req, res) => {
  const { roundId } = req.params;
  try {
    const data = await wrapWithCache(cacheKeys.roundSubmissions(roundId), cacheTtls.short, async () => {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('round_submissions')
        .select(`
          *,
          submissions(id, title, description, status, average_score, votes_count, applicant_name, applicant_email, category_id)
        `)
        .eq('round_id', roundId)
        .order('enrolled_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    });
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/:programId/rounds/:roundId/submissions/count', requireAuth, requireProgramAccess('programId'), async (req, res) => {
  const { roundId } = req.params;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('round_submissions')
      .select('status')
      .eq('round_id', roundId);
    if (error) return res.status(500).json({ error: error.message });
    const rows = data || [];
    return res.json({
      data: {
        total: rows.length,
        active: rows.filter(r => r.status === 'active').length,
        advanced: rows.filter(r => r.status === 'advanced').length,
        eliminated: rows.filter(r => r.status === 'eliminated').length,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
