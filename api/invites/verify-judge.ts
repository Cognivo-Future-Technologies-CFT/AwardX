import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Allow GET (link click) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = req.method === 'GET' ? req.query?.token : req.body?.token;
  if (!token) {
    res.status(400).json({ error: 'token is required' });
    return;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    res.status(400).json({ error: 'Invalid token format' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase not configured' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Find the judge by invite_token (must not be used yet)
    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select('id, name, email, avatar_url, bio, status, program_id, organization_id, invite_token_used_at')
      .eq('invite_token', token)
      .single();

    if (judgeError || !judge) {
      res.status(404).json({ error: 'Invalid or expired invite link. This link may have already been used.' });
      return;
    }

    // 2. Check if token has already been used
    if (judge.invite_token_used_at) {
      res.status(410).json({
        error: 'This invite link has already been used. Please contact the organizer if you need a new link.',
        expired: true,
      });
      return;
    }

    // 3. Mark token as used and update judge status to active
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

    // 5. Fetch ONLY shortlisted submissions for this program
    let submissions: any[] = [];
    if (judge.program_id) {
      const { data: submissionData } = await supabase
        .from('submissions')
        .select('id, title, description, cover_image_url, status, category_id, submitted_at, applicant_name, vote_count')
        .eq('program_id', judge.program_id)
        .eq('status', 'shortlisted')
        .order('submitted_at', { ascending: false });
      submissions = submissionData || [];

      // Fetch category names for submissions
      if (submissions.length > 0) {
        const categoryIds = [...new Set(submissions.map(s => s.category_id).filter(Boolean))];
        if (categoryIds.length > 0) {
          const { data: categories } = await supabase
            .from('categories')
            .select('id, title')
            .in('id', categoryIds);
          const categoryMap = new Map((categories || []).map((c: any) => [c.id, c.title]));
          submissions = submissions.map(s => ({
            ...s,
            category_name: categoryMap.get(s.category_id) || 'Uncategorized',
          }));
        }
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
      submissions: submissions.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        coverImageUrl: s.cover_image_url,
        status: s.status,
        category: s.category_name || 'Uncategorized',
        submittedAt: s.submitted_at,
        applicantName: s.applicant_name,
        voteCount: s.vote_count,
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
