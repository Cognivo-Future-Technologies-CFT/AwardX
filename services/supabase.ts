import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

// Create Supabase client (untyped for flexibility until database is set up)
// After running the SQL schema, regenerate types with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > services/database.types.ts
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  : null; // Will be null if not configured - app should handle this gracefully

// Helper to check if Supabase is configured
export const isSupabaseReady = () => supabase !== null;

// ============================================================================
// AUTH HELPERS
// ============================================================================

export const auth = {
  // Sign up with email/password
  signUp: async (email: string, password: string, metadata?: { full_name?: string }) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured. Please check your environment variables.' } };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  // Sign in with email/password
  signIn: async (email: string, password: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured. Please check your environment variables.' } };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign in with magic link
  signInWithMagicLink: async (email: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured. Please check your environment variables.' } };
    }
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${import.meta.env.VITE_SITE_URL}/auth/callback`,
      },
    });
    return { data, error };
  },

  // Sign in with OAuth provider
  signInWithProvider: async (provider: 'google' | 'github' | 'linkedin') => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured. Please check your environment variables.' } };
    }
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${siteUrl}`,
      },
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    if (!supabase) {
      return { error: { message: 'Supabase is not configured. Please check your environment variables.' } };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  getUser: async () => {
    if (!supabase) {
      return { user: null, error: { message: 'Supabase is not configured. Please check your environment variables.' } };
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Get current session
  getSession: async () => {
    if (!supabase) {
      return { session: null, error: { message: 'Supabase is not configured. Please check your environment variables.' } };
    }
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // Reset password
  resetPassword: async (email: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured. Please check your environment variables.' } };
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_SITE_URL}/auth/reset-password`,
    });
    return { data, error };
  },

  // Update password
  updatePassword: async (newPassword: string) => {
    if (!supabase) {
      return { data: null, error: { message: 'Supabase is not configured. Please check your environment variables.' } };
    }
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => { } } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================================================
// DATABASE HELPERS
// ============================================================================

// Organizations
export const organizations = {
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  getCurrent: async (): Promise<{ data: { id: string } | null; error: any }> => {
    if (!supabase) return { data: null, error: 'Supabase not configured' };

    const { user, error: userError } = await auth.getUser();
    if (userError || !user) return { data: null, error: userError || 'Not authenticated' };

    // First get the profile to get organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // Profile might not exist yet - that's okay, user just signed up
      return { data: null, error: null };
    }

    // If no organization_id, return null (user not assigned to org yet)
    if (!profile || !profile.organization_id) {
      return { data: null, error: null };
    }

    // Then get the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url, website, industry, plan')
      .eq('id', profile.organization_id)
      .single();

    if (orgError || !org) {
      return { data: null, error: orgError || 'Organization not found' };
    }

    return { data: org as { id: string }, error: null };
  },

  create: async (name: string, slug: string) => {
    const { data, error } = await supabase.rpc('setup_new_organization', {
      p_org_name: name,
      p_org_slug: slug,
      p_owner_user_id: (await auth.getUser()).user?.id,
    });
    return { data, error };
  },

  update: async (id: string, updates: Partial<{ name: string; logo_url: string; website: string }>) => {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },
};

// Programs
export const programs = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('programs')
      .select(`
        *,
        event_types(name, icon),
        categories(count),
        rounds(count)
      `)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('programs')
      .select(`
        *,
        event_types(*),
        categories(*),
        rounds(*),
        program_payment_configs(*),
        judging_criteria(*)
      `)
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (program: {
    title: string;
    description?: string;
    industry_category?: string;
    event_type_id?: string;
    deadline?: string;
  }) => {
    const { data, error } = await supabase
      .from('programs')
      .insert({
        ...program,
        organization_id: (await organizations.getCurrent()).data?.id,
      })
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<{
    title: string;
    description: string;
    status: string;
    deadline: string;
    slug: string;
    cover_image_url: string;
    industry_category: string;
    visibility: string;
    timezone: string;
  }>) => {
    const { data, error } = await supabase
      .from('programs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', id);
    return { error };
  },

  getStats: async (programId?: string) => {
    if (programId) {
      const { data, error } = await supabase
        .from('program_stats')
        .select('*')
        .eq('id', programId)
        .single();
      return { data, error };
    }
    const { data, error } = await supabase
      .from('program_stats')
      .select('*');
    return { data, error };
  },
};

// Categories
export const categories = {
  getByProgram: async (programId: string) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  create: async (category: {
    program_id: string;
    title: string;
    description?: string;
    parent_id?: string;
  }) => {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<{ title: string; description: string }>) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// Rounds
export const rounds = {
  getByProgram: async (programId: string) => {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  create: async (round: {
    program_id: string;
    title: string;
    type: string;
    start_date: string;
    end_date: string;
  }) => {
    const { data, error } = await supabase
      .from('rounds')
      .insert(round)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<{
    title: string;
    start_date: string;
    end_date: string;
    status: string;
  }>) => {
    const { data, error } = await supabase
      .from('rounds')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('rounds')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// Submissions
export const submissions = {
  getAll: async (filters?: {
    programId?: string;
    categoryId?: string;
    status?: string;
  }) => {
    let query = supabase
      .from('submission_details')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (filters?.programId) {
      query = query.eq('program_id', filters.programId);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        programs(title),
        categories(title),
        submission_files(*),
        submission_judges(
          *,
          judges(*),
          scores(*),
          judge_comments(*)
        )
      `)
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (submission: {
    program_id: string;
    category_id?: string;
    title: string;
    description?: string;
    submission_data?: Record<string, any>;
  }) => {
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        ...submission,
        applicant_id: (await auth.getUser()).user?.id,
      })
      .select()
      .single();
    return { data, error };
  },

  updateStatus: async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  bulkUpdateStatus: async (ids: string[], status: string) => {
    const { data, error } = await supabase
      .from('submissions')
      .update({ status })
      .in('id', ids)
      .select();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id);
    return { error };
  },

  assignJudges: async (submissionId: string, judgeIds: string[]) => {
    const assignments = judgeIds.map(judgeId => ({
      submission_id: submissionId,
      judge_id: judgeId,
    }));
    const { data, error } = await supabase
      .from('submission_judges')
      .upsert(assignments, { onConflict: 'submission_id,judge_id' })
      .select();
    return { data, error };
  },
};

// Judges
export const judges = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('judge_workload')
      .select('*')
      .order('name');
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('judges')
      .select(`
        *,
        submission_judges(
          *,
          submissions(*)
        )
      `)
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (judge: {
    name: string;
    email: string;
    bio?: string;
  }) => {
    const org = await organizations.getCurrent();
    const { data, error } = await supabase
      .from('judges')
      .insert({
        ...judge,
        organization_id: org.data?.id,
      })
      .select()
      .single();
    return { data, error };
  },

  invite: async (email: string, name: string) => {
    // Create judge record and send invite email
    const { data, error } = await judges.create({ name, email });
    if (!error && data) {
      // Trigger invite email via Supabase Edge Function or similar
      // await supabase.functions.invoke('send-judge-invite', { body: { judgeId: data.id } });
    }
    return { data, error };
  },

  updateStatus: async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('judges')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },
};

// Judging Criteria
export const judgingCriteria = {
  getByProgram: async (programId: string) => {
    const { data, error } = await supabase
      .from('judging_criteria')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  create: async (criterion: {
    program_id: string;
    name: string;
    description?: string;
    weight: number;
    max_score?: number;
  }) => {
    const { data, error } = await supabase
      .from('judging_criteria')
      .insert(criterion)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<{
    name: string;
    weight: number;
    description: string;
  }>) => {
    const { data, error } = await supabase
      .from('judging_criteria')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('judging_criteria')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// Scores
export const scores = {
  submit: async (submissionJudgeId: string, scores: { criterionId: string; score: number; comment?: string }[]) => {
    const scoreRecords = scores.map(s => ({
      submission_judge_id: submissionJudgeId,
      criterion_id: s.criterionId,
      score: s.score,
      comment: s.comment,
    }));
    const { data, error } = await supabase
      .from('scores')
      .upsert(scoreRecords, { onConflict: 'submission_judge_id,criterion_id' })
      .select();

    if (!error) {
      // Mark as completed
      await supabase
        .from('submission_judges')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', submissionJudgeId);
    }

    return { data, error };
  },

  getBySubmission: async (submissionId: string) => {
    const { data, error } = await supabase
      .from('submission_judges')
      .select(`
        *,
        judges(name, avatar_url),
        scores(*, judging_criteria(name, weight)),
        judge_comments(*)
      `)
      .eq('submission_id', submissionId);
    return { data, error };
  },
};

// Contacts (CRM)
export const contacts = {
  getAll: async (filters?: { status?: string; source?: string }) => {
    let query = supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    const { data, error } = await query;
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, contact_custom_fields(*)')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (contact: {
    name: string;
    email: string;
    phone?: string;
    source?: string;
    tags?: string[];
  }) => {
    const org = await organizations.getCurrent();
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        ...contact,
        organization_id: org.data?.id,
      })
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<{
    name: string;
    email: string;
    phone: string;
    status: string;
    tags: string[];
  }>) => {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// Messages
export const messages = {
  getThreads: async () => {
    const { data, error } = await supabase
      .from('message_threads')
      .select(`
        *,
        thread_participants(user_id, last_read_at),
        messages(content, sent_at, sender_name)
      `)
      .order('updated_at', { ascending: false });
    return { data, error };
  },

  getByThread: async (threadId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: true });
    return { data, error };
  },

  send: async (threadId: string, content: string) => {
    const user = (await auth.getUser()).user;
    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: user?.id,
        content,
        sender_name: user?.user_metadata?.full_name || user?.email,
      })
      .select()
      .single();
    return { data, error };
  },

  createThread: async (subject: string, participantIds: string[]) => {
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({ subject })
      .select()
      .single();

    if (threadError || !thread) return { data: null, error: threadError };

    const participants = participantIds.map(userId => ({
      thread_id: thread.id,
      user_id: userId,
    }));
    await supabase.from('thread_participants').insert(participants);

    return { data: thread, error: null };
  },

  markAsRead: async (threadId: string) => {
    const userId = (await auth.getUser()).user?.id;
    const { error } = await supabase
      .from('thread_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('user_id', userId);
    return { error };
  },
};

// Roles
export const roles = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions(permission_id, permissions(key, name))
      `)
      .order('name');
    return { data, error };
  },

  create: async (role: { name: string; color?: string; permissions: string[] }) => {
    const org = await organizations.getCurrent();
    const { data: newRole, error: roleError } = await supabase
      .from('roles')
      .insert({
        name: role.name,
        color: role.color,
        organization_id: org.data?.id,
      })
      .select()
      .single();

    if (roleError || !newRole) return { data: null, error: roleError };

    // Get permission IDs
    const { data: perms } = await supabase
      .from('permissions')
      .select('id')
      .in('key', role.permissions);

    if (perms && perms.length > 0) {
      const rolePerms = perms.map(p => ({
        role_id: newRole.id,
        permission_id: p.id,
      }));
      await supabase.from('role_permissions').insert(rolePerms);
    }

    return { data: newRole, error: null };
  },

  updatePermissions: async (roleId: string, permissionKeys: string[]) => {
    // Delete existing
    await supabase.from('role_permissions').delete().eq('role_id', roleId);

    // Get permission IDs
    const { data: perms } = await supabase
      .from('permissions')
      .select('id')
      .in('key', permissionKeys);

    if (perms && perms.length > 0) {
      const rolePerms = perms.map(p => ({
        role_id: roleId,
        permission_id: p.id,
      }));
      const { error } = await supabase.from('role_permissions').insert(rolePerms);
      return { error };
    }
    return { error: null };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// Audit Logs
export const auditLogs = {
  getAll: async (filters?: { type?: string; resourceType?: string; limit?: number }) => {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('action_type', filters.type);
    }
    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    return { data, error };
  },

  log: async (action: string, type: string, resourceType?: string, resourceId?: string, details?: string) => {
    const org = await organizations.getCurrent();
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_organization_id: org.data?.id,
      p_action: action,
      p_action_type: type,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details,
    });
    return { data, error };
  },
};

// Social Accounts
export const socialAccounts = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .order('platform');
    return { data, error };
  },

  connect: async (platform: string, accessToken: string, handle: string) => {
    const org = await organizations.getCurrent();
    const { data, error } = await supabase
      .from('social_accounts')
      .upsert({
        organization_id: org.data?.id,
        platform,
        handle,
        access_token_encrypted: accessToken, // Should be encrypted in production
        status: 'connected',
        connected_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,platform,handle' })
      .select()
      .single();
    return { data, error };
  },

  disconnect: async (id: string) => {
    const { data, error } = await supabase
      .from('social_accounts')
      .update({ status: 'disconnected' })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },
};

// Scheduled Posts
export const scheduledPosts = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .order('scheduled_for');
    return { data, error };
  },

  create: async (post: {
    content: string;
    platforms: string[];
    scheduled_for: string;
    image_url?: string;
    trigger_type?: string;
    program_id?: string;
  }) => {
    const org = await organizations.getCurrent();
    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert({
        ...post,
        organization_id: org.data?.id,
      })
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<{
    content: string;
    scheduled_for: string;
    status: string;
  }>) => {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id);
    return { error };
  },
};

// ============================================================================
// CMS / MARKETING CONTENT (Public data)
// ============================================================================

export const cms = {
  // Testimonials
  getTestimonials: async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    return { data, error };
  },

  // Pricing Tiers
  getPricingTiers: async () => {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    return { data, error };
  },

  // Features
  getFeatures: async () => {
    const { data, error } = await supabase
      .from('features')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    return { data, error };
  },

  // Use Cases
  getUseCases: async () => {
    const { data, error } = await supabase
      .from('use_cases')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    return { data, error };
  },

  // How It Works Steps
  getHowItWorksSteps: async () => {
    const { data, error } = await supabase
      .from('how_it_works_steps')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    return { data, error };
  },

  // Case Studies
  getCaseStudies: async () => {
    const { data, error } = await supabase
      .from('case_studies')
      .select('*')
      .eq('is_active', true)
      .order('published_at', { ascending: false });
    return { data, error };
  },

  getCaseStudyBySlug: async (slug: string) => {
    const { data, error } = await supabase
      .from('case_studies')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    return { data, error };
  },

  // FAQs
  getFaqs: async (category?: string) => {
    let query = supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Event Types
  getEventTypes: async () => {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .order('name');
    return { data, error };
  },

  // Program Templates
  getProgramTemplates: async () => {
    const { data, error } = await supabase
      .from('program_templates')
      .select('*, event_types(name, icon)')
      .eq('is_active', true)
      .order('sort_order');
    return { data, error };
  },

  // Campaign Templates
  getCampaignTemplates: async () => {
    const { data, error } = await supabase
      .from('campaign_templates')
      .select('*')
      .order('title');
    return { data, error };
  },
};

// ============================================================================
// STORAGE HELPERS
// ============================================================================

export const storage = {
  uploadAvatar: async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (data) {
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      return { url: urlData.publicUrl, error: null };
    }
    return { url: null, error };
  },

  uploadSubmissionFile: async (file: File, submissionId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${submissionId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('submissions')
      .upload(fileName, file);

    if (data) {
      return { path: data.path, error: null };
    }
    return { path: null, error };
  },

  getSignedUrl: async (bucket: string, path: string, expiresIn = 3600) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    return { url: data?.signedUrl, error };
  },

  deleteFile: async (bucket: string, path: string) => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    return { error };
  },
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export const realtime = {
  subscribeToSubmissions: (programId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`submissions:${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `program_id=eq.${programId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToMessages: (threadId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        callback
      )
      .subscribe();
  },

  unsubscribe: (channel: any) => {
    supabase.removeChannel(channel);
  },
};

// Export the main client
export default supabase;
