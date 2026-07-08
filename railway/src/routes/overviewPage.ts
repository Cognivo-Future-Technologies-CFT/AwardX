import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireProgramAccess } from '../middleware/programAccess.js';
import { requireProgramManage } from '../middleware/programManagement.js';
import { getSupabaseAdmin } from '../supabase.js';
import { cacheKeys, cacheTtls, deleteCache, wrapWithCache } from '../cache/redisCache.js';

const router = Router();

async function invalidateOverview(programId: string) {
  await deleteCache(cacheKeys.programOverview(programId));
  await deleteCache(`public:overview:${programId}`);

  const supabase = getSupabaseAdmin();
  const { data: program } = await supabase
    .from('programs')
    .select('slug')
    .eq('id', programId)
    .maybeSingle();

  if (program?.slug) {
    await deleteCache(`public:overview:slug:${program.slug}`);
  }
}

async function getOverviewPayload(programId: string) {
  const supabase = getSupabaseAdmin();

  // Critical queries — failure here is a real error
  const [programResult, configResult, sectionsResult] = await Promise.all([
    supabase
      .from('programs')
      .select('id, title, slug, description, cover_image_url, status, visibility, deadline, timezone, industry_category, active_form_id')
      .eq('id', programId)
      .maybeSingle(),
    supabase.from('program_page_configs').select('*').eq('program_id', programId).maybeSingle(),
    supabase.from('program_page_sections').select('*').eq('program_id', programId).order('sort_order'),
  ]);

  if (programResult.error) throw new Error(programResult.error.message || 'Failed to fetch program');
  if (configResult.error) throw new Error(configResult.error.message || 'Failed to fetch page config');
  if (sectionsResult.error) throw new Error(sectionsResult.error.message || 'Failed to fetch page sections');

  // Optional queries — degrade gracefully if table is missing or errors
  const [sponsorsResult, faqsResult, timelineResult, roundsResult, categoriesResult] = await Promise.allSettled([
    supabase.from('program_sponsors').select('*').eq('program_id', programId).order('sort_order'),
    supabase.from('program_faqs').select('*').eq('program_id', programId).order('sort_order'),
    supabase.from('program_timeline_milestones').select('*').eq('program_id', programId).order('sort_order'),
    supabase
      .from('rounds')
      .select('id, title, description, type, status, start_date, end_date, sort_order')
      .eq('program_id', programId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('categories')
      .select('id, title, description, parent_id, sort_order')
      .eq('program_id', programId)
      .order('sort_order', { ascending: true }),
  ]);

  const safeData = (result: PromiseSettledResult<any>) =>
    result.status === 'fulfilled' ? (result.value?.data || []) : [];

  const sponsors = safeData(sponsorsResult);
  const faqs = safeData(faqsResult);
  const timeline = safeData(timelineResult);
  const rounds = safeData(roundsResult);
  const awards = safeData(categoriesResult);

  // Log any optional query failures for observability
  [sponsorsResult, faqsResult, timelineResult, roundsResult, categoriesResult].forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[overviewPage] optional query ${i} failed for program ${programId}:`, r.reason);
    } else if (r.value?.error) {
      console.warn(`[overviewPage] optional query ${i} error for program ${programId}:`, r.value.error.message);
    }
  });

  return {
    program: programResult.data || null,
    config: configResult.data || null,
    sections: sectionsResult.data || [],
    sponsors,
    faqs,
    timeline,
    rounds,
    awards,
    schedule: {
      deadline: programResult.data?.deadline || null,
      timezone: programResult.data?.timezone || null,
      rounds,
      milestones: timeline,
    },
  };
}

router.get('/public/by-slug/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!slug) {
    return res.status(400).json({ error: 'slug is required' });
  }

  try {
    const payload = await wrapWithCache(`public:overview:slug:${slug}`, cacheTtls.medium, async () => {
      const supabase = getSupabaseAdmin();
      const { data: program, error } = await supabase
        .from('programs')
        .select('id, visibility')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to fetch program by slug');
      }
      if (!program?.id) {
        return null;
      }

      const data = await getOverviewPayload(program.id);
      if (!data.config?.is_published || data.program?.visibility === 'private') {
        return null;
      }

      return data;
    });

    if (!payload) {
      return res.status(404).json({ error: 'Published public program page not found' });
    }

    return res.json({ data: payload });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/public/:programId', async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const payload = await wrapWithCache(`public:overview:${programId}`, cacheTtls.medium, async () => {
      const data = await getOverviewPayload(programId);
      if (!data.program || !data.config?.is_published || data.program.visibility === 'private') {
        return null;
      }
      return data;
    });

    if (!payload) {
      return res.status(404).json({ error: 'Published public program page not found' });
    }

    return res.json({ data: payload });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post(
  '/:programId/invalidate-cache',
  requireAuth,
  requireProgramAccess('programId'),
  async (req, res) => {
    const { programId } = req.params;
    if (!programId) {
      return res.status(400).json({ error: 'programId is required' });
    }

    try {
      await invalidateOverview(programId);
      return res.json({ ok: true });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Failed to invalidate cache' });
    }
  },
);

router.get('/:programId', requireAuth, requireProgramAccess('programId'), async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const payload = await wrapWithCache(cacheKeys.programOverview(programId), cacheTtls.medium, async () => {
      const supabase = getSupabaseAdmin();
      const [configResult, sectionsResult, sponsorsResult, faqsResult, timelineResult] = await Promise.all([
        supabase.from('program_page_configs').select('*').eq('program_id', programId).maybeSingle(),
        supabase.from('program_page_sections').select('*').eq('program_id', programId).order('sort_order'),
        supabase.from('program_sponsors').select('*').eq('program_id', programId).order('sort_order'),
        supabase.from('program_faqs').select('*').eq('program_id', programId).order('sort_order'),
        supabase.from('program_timeline_milestones').select('*').eq('program_id', programId).order('sort_order'),
      ]);

      const errors = [
        configResult.error,
        sectionsResult.error,
        sponsorsResult.error,
        faqsResult.error,
        timelineResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(errors[0]?.message || 'Failed to fetch overview data');
      }

      return {
        config: configResult.data || null,
        sections: sectionsResult.data || [],
        sponsors: sponsorsResult.data || [],
        faqs: faqsResult.data || [],
        timeline: timelineResult.data || [],
      };
    });

    return res.json({ data: payload });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.put('/:programId/config', requireAuth, requireProgramAccess('programId'), requireProgramManage('programId'), async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('program_page_configs')
      .upsert(
        {
          program_id: programId,
          theme_settings: req.body?.theme_settings,
          is_published: req.body?.is_published,
          seo_title: req.body?.seo_title,
          seo_description: req.body?.seo_description,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'program_id' },
      )
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to save config' });
    }

    await invalidateOverview(programId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/:programId/sections', requireAuth, requireProgramAccess('programId'), requireProgramManage('programId'), async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  const payload = req.body || {};
  const id = typeof payload.id === 'string' && payload.id.startsWith('temp-') ? undefined : payload.id;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('program_page_sections')
      .upsert({
        id,
        program_id: programId,
        section_type: payload.section_type,
        title: payload.title,
        subtitle: payload.subtitle,
        content: payload.content,
        settings: payload.settings,
        sort_order: payload.sort_order,
        is_visible: payload.is_visible,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to save section' });
    }

    await invalidateOverview(programId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/:programId/sections/:id', requireAuth, requireProgramAccess('programId'), requireProgramManage('programId'), async (req, res) => {
  const { programId, id } = req.params;
  if (!programId || !id) {
    return res.status(400).json({ error: 'programId and section id are required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('program_page_sections').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete section' });
    }

    await invalidateOverview(programId);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/:programId/sponsors', requireAuth, requireProgramAccess('programId'), requireProgramManage('programId'), async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  const payload = req.body || {};
  const id = typeof payload.id === 'string' && payload.id.startsWith('temp-') ? undefined : payload.id;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('program_sponsors')
      .upsert({
        id,
        program_id: programId,
        name: payload.name,
        logo_url: payload.logo_url,
        website_url: payload.website_url,
        tier: payload.tier,
        tier_label: payload.tier_label,
        sort_order: payload.sort_order,
        is_active: payload.is_active,
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to save sponsor' });
    }

    await invalidateOverview(programId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/:programId/sponsors/:id', requireAuth, requireProgramAccess('programId'), requireProgramManage('programId'), async (req, res) => {
  const { programId, id } = req.params;
  if (!programId || !id) {
    return res.status(400).json({ error: 'programId and sponsor id are required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('program_sponsors').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete sponsor' });
    }

    await invalidateOverview(programId);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/:programId/faqs', requireAuth, requireProgramAccess('programId'), requireProgramManage('programId'), async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  const payload = req.body || {};
  const id = typeof payload.id === 'string' && payload.id.startsWith('temp-') ? undefined : payload.id;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('program_faqs')
      .upsert({
        id,
        program_id: programId,
        question: payload.question,
        answer: payload.answer,
        category: payload.category,
        sort_order: payload.sort_order,
        is_visible: payload.is_visible,
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to save FAQ' });
    }

    await invalidateOverview(programId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/:programId/faqs/:id', requireAuth, requireProgramAccess('programId'), requireProgramManage('programId'), async (req, res) => {
  const { programId, id } = req.params;
  if (!programId || !id) {
    return res.status(400).json({ error: 'programId and FAQ id are required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('program_faqs').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete FAQ' });
    }

    await invalidateOverview(programId);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/:programId/timeline', requireAuth, requireProgramAccess('programId'), requireProgramManage('programId'), async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  const payload = req.body || {};
  const id = typeof payload.id === 'string' && payload.id.startsWith('temp-') ? undefined : payload.id;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('program_timeline_milestones')
      .upsert({
        id,
        program_id: programId,
        title: payload.title,
        date: payload.date,
        description: payload.description,
        icon: payload.icon,
        sort_order: payload.sort_order,
        is_visible: payload.is_visible,
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to save timeline milestone' });
    }

    await invalidateOverview(programId);
    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.delete('/:programId/timeline/:id', requireAuth, requireProgramAccess('programId'), requireProgramManage('programId'), async (req, res) => {
  const { programId, id } = req.params;
  if (!programId || !id) {
    return res.status(400).json({ error: 'programId and timeline id are required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('program_timeline_milestones').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete timeline milestone' });
    }

    await invalidateOverview(programId);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/:programId/media', requireAuth, requireProgramAccess('programId'), async (req, res) => {
  const { programId } = req.params;
  if (!programId) {
    return res.status(400).json({ error: 'programId is required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const prefix = `program-pages/${programId}`;

    const { data, error } = await supabase.storage
      .from('media')
      .list(prefix, {
        limit: 200,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      return res.status(500).json({ error: error.message || 'Failed to fetch media assets' });
    }

    const assets = (data || [])
      .filter((item) => item.name && !item.name.endsWith('/'))
      .map((item) => {
        const path = `${prefix}/${item.name}`;
        const { data: publicData } = supabase.storage.from('media').getPublicUrl(path);
        return {
          name: item.name,
          path,
          url: publicData?.publicUrl || null,
          size: item.metadata?.size || null,
          createdAt: item.created_at || null,
          updatedAt: item.updated_at || null,
        };
      });

    return res.json({ data: assets });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

export default router;
