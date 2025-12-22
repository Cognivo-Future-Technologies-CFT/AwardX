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
// HELPER FUNCTIONS FOR USER/ORG CONTEXT
// ============================================================================

// Get current user ID (cached for performance)
let cachedUserId: string | null = null;
let cachedOrgId: string | null = null;

// Helper to get current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  if (cachedUserId) return cachedUserId;
  if (!supabase) return null;
  const { user } = await auth.getUser();
  if (user) {
    cachedUserId = user.id;
    return user.id;
  }
  return null;
};

// Helper to get current organization ID
export const getCurrentOrgId = async (): Promise<string | null> => {
  if (cachedOrgId) return cachedOrgId;
  const org = await organizations.getCurrent();
  if (org.data?.id) {
    cachedOrgId = org.data.id;
    return org.data.id;
  }
  return null;
};

// Clear cache (call on logout or when user changes)
export const clearUserCache = () => {
  cachedUserId = null;
  cachedOrgId = null;
};

// Refresh cache (call after login or when org changes)
export const refreshUserCache = async () => {
  cachedUserId = null;
  cachedOrgId = null;
  await getCurrentUserId();
  await getCurrentOrgId();
};

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
    
    // Ensure profile is created (trigger should handle this, but we verify)
    if (data?.user && !error) {
      // Check if profile exists, if not create it
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();
      
      if (!existingProfile) {
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: metadata?.full_name || email.split('@')[0],
          });
      }
    }
    
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
    if (data && !error) {
      // Refresh cache after successful login
      await refreshUserCache();
    }
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
    clearUserCache(); // Clear cached user/org data
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

    // First get the profile to get organization_id - use maybeSingle to handle missing profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    // If profile doesn't exist, create it
    if (profileError || !profile) {
      // Try to create profile if it doesn't exist
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        })
        .select('organization_id')
        .single();
      
      if (!newProfile || !newProfile.organization_id) {
        return { data: null, error: null };
      }
      
      // If new profile has organization_id, get the org
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, website, industry, plan')
        .eq('id', newProfile.organization_id)
        .single();
      
      if (org) {
        cachedOrgId = org.id;
        return { data: org as { id: string }, error: null };
      }
      
      return { data: null, error: null };
    }

    // If no organization_id, return null (user not assigned to org yet)
    if (!profile.organization_id) {
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

    cachedOrgId = org.id;
    return { data: org as { id: string }, error: null };
  },

  create: async (name: string, slug: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    
    const { user } = await auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };
    
    // Check if organization with this slug already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle();
    
    if (existingOrg) {
      // Organization exists, just link user to it
      await supabase
        .from('profiles')
        .update({ organization_id: existingOrg.id })
        .eq('id', user.id);
      
      cachedOrgId = existingOrg.id;
      return { data: existingOrg, error: null };
    }
    
    // Try RPC first, fallback to direct insert
    try {
      const { data, error } = await supabase.rpc('setup_new_organization', {
        p_org_name: name,
        p_org_slug: slug,
        p_owner_user_id: user.id,
      });
      if (data && !error) {
        // Get the created organization
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (org) {
          cachedOrgId = org.id;
          return { data: org, error: null };
        }
      }
    } catch (rpcError) {
      console.warn('RPC setup_new_organization not available, using direct insert');
    }
    
    // Fallback: Create organization directly
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
      })
      .select()
      .single();
    
    // Handle 409 conflict (slug already exists)
    if (orgError) {
      if (orgError.code === '23505' || orgError.message?.includes('duplicate') || orgError.message?.includes('unique')) {
        // Slug conflict, try to get existing org
        const { data: existing } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (existing) {
          // Link user to existing org
          await supabase
            .from('profiles')
            .update({ organization_id: existing.id })
            .eq('id', user.id);
          
          cachedOrgId = existing.id;
          return { data: existing, error: null };
        }
      }
      return { data: null, error: orgError };
    }
    
    if (!org) {
      return { data: null, error: { message: 'Failed to create organization' } };
    }
    
    // Ensure profile exists and update it to link to organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (!profile) {
      // Create profile if it doesn't exist
      await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          organization_id: org.id,
        });
    } else {
      // Update existing profile
      await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('id', user.id);
    }
    
    // Clear cache
    cachedOrgId = org.id;
    
    return { data: org, error: null };
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('programs')
      .select(`
        *,
        event_types(name, icon),
        categories(count),
        rounds(count)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getById: async (id: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
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
      .eq('organization_id', orgId)
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
    const org = await organizations.getCurrent();
    const orgId = org.data?.id;
    
    if (!orgId) {
      return { 
        data: null, 
        error: { message: 'Organization not found. Please ensure you are logged in and have an organization set up.' } 
      };
    }
    
    const { data, error } = await supabase
      .from('programs')
      .insert({
        ...program,
        organization_id: orgId,
      })
      .select(`
        *,
        event_types(name, icon)
      `)
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabase
      .from('programs')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select(`
        *,
        event_types(name, icon)
      `)
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: { message: 'Not authenticated' } };
    
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);
    return { error };
  },

  getStats: async (programId?: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    if (programId) {
      // Verify program belongs to org
      const { data: program } = await supabase
        .from('programs')
        .select('id')
        .eq('id', programId)
        .eq('organization_id', orgId)
        .single();
      
      if (!program) return { data: null, error: { message: 'Program not found' } };
      
      const { data, error } = await supabase
        .from('program_stats')
        .select('*')
        .eq('id', programId)
        .single();
      return { data, error };
    }
    // Get stats for all org programs
    const { data: programs } = await supabase
      .from('programs')
      .select('id')
      .eq('organization_id', orgId);
    
    if (!programs || programs.length === 0) return { data: [], error: null };
    
    const programIds = programs.map(p => p.id);
    const { data, error } = await supabase
      .from('program_stats')
      .select('*')
      .in('id', programIds);
    return { data, error };
  },
};

// Categories
export const categories = {
  getByProgram: async (programId: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: { message: 'Not authenticated' } };
    
    // Verify program belongs to org
    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('id', programId)
      .eq('organization_id', orgId)
      .single();
    
    if (!program) return { data: [], error: { message: 'Program not found' } };
    
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    // Verify program belongs to org
    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('id', category.program_id)
      .eq('organization_id', orgId)
      .single();
    
    if (!program) return { data: null, error: { message: 'Program not found' } };
    
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<{ title: string; description: string }>) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    // Verify category's program belongs to org
    const { data: category } = await supabase
      .from('categories')
      .select('program_id, programs!inner(organization_id)')
      .eq('id', id)
      .single();
    
    if (!category || (category as any).programs?.organization_id !== orgId) {
      return { data: null, error: { message: 'Category not found' } };
    }
    
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: { message: 'Not authenticated' } };
    
    // Verify category's program belongs to org
    const { data: category } = await supabase
      .from('categories')
      .select('program_id, programs!inner(organization_id)')
      .eq('id', id)
      .single();
    
    if (!category || (category as any).programs?.organization_id !== orgId) {
      return { error: { message: 'Category not found' } };
    }
    
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: { message: 'Not authenticated' } };
    
    // Verify program belongs to org
    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('id', programId)
      .eq('organization_id', orgId)
      .single();
    
    if (!program) return { data: [], error: { message: 'Program not found' } };
    
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };
    
    // Get all programs for this org
    const { data: orgPrograms } = await supabase
      .from('programs')
      .select('id')
      .eq('organization_id', orgId);
    
    if (!orgPrograms || orgPrograms.length === 0) return { data: [], error: null };
    
    const programIds = orgPrograms.map(p => p.id);
    let query = supabase
      .from('submissions')
      .select(`
        *,
        programs!inner(organization_id),
        categories(title),
        submission_files(*)
      `)
      .in('program_id', programIds)
      .order('submitted_at', { ascending: false });

    if (filters?.programId) {
      // Verify program belongs to org
      if (programIds.includes(filters.programId)) {
        query = query.eq('program_id', filters.programId);
      } else {
        return { data: [], error: null };
      }
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        programs!inner(organization_id, title),
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
      .eq('programs.organization_id', orgId)
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
    const orgId = await getCurrentOrgId();
    const userId = await getCurrentUserId();
    if (!orgId || !userId) return { data: null, error: { message: 'Not authenticated' } };
    
    // Verify program belongs to org
    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('id', submission.program_id)
      .eq('organization_id', orgId)
      .single();
    
    if (!program) return { data: null, error: { message: 'Program not found' } };
    
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        ...submission,
        applicant_id: userId,
      })
      .select()
      .single();
    return { data, error };
  },

  updateStatus: async (id: string, status: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    // Verify submission belongs to org
    const { data: submission } = await supabase
      .from('submissions')
      .select('program_id, programs!inner(organization_id)')
      .eq('id', id)
      .single();
    
    if (!submission || (submission as any).programs?.organization_id !== orgId) {
      return { data: null, error: { message: 'Submission not found' } };
    }
    
    const { data, error } = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  bulkUpdateStatus: async (ids: string[], status: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    // Get all org programs
    const { data: orgPrograms } = await supabase
      .from('programs')
      .select('id')
      .eq('organization_id', orgId);
    
    if (!orgPrograms || orgPrograms.length === 0) return { data: [], error: null };
    
    const programIds = orgPrograms.map(p => p.id);
    
    // Only update submissions that belong to org programs
    const { data, error } = await supabase
      .from('submissions')
      .update({ status })
      .in('id', ids)
      .in('program_id', programIds)
      .select();
    return { data, error };
  },

  delete: async (id: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: { message: 'Not authenticated' } };
    
    // Verify submission belongs to org
    const { data: submission } = await supabase
      .from('submissions')
      .select('program_id, programs!inner(organization_id)')
      .eq('id', id)
      .single();
    
    if (!submission || (submission as any).programs?.organization_id !== orgId) {
      return { error: { message: 'Submission not found' } };
    }
    
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('judges')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    return { data, error };
  },

  getById: async (id: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
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
      .eq('organization_id', orgId)
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabase
      .from('judges')
      .update({ status })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();
    return { data, error };
  },
};

// Judging Criteria
export const judgingCriteria = {
  getByProgram: async (programId: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: { message: 'Not authenticated' } };
    
    // Verify program belongs to org
    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('id', programId)
      .eq('organization_id', orgId)
      .single();
    
    if (!program) return { data: [], error: { message: 'Program not found' } };
    
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };
    
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', orgId)
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*, contact_custom_fields(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: { message: 'Not authenticated' } };
    
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);
    return { error };
  },
};

// Messages
export const messages = {
  getThreads: async () => {
    const orgId = await getCurrentOrgId();
    const userId = await getCurrentUserId();
    if (!orgId || !userId) return { data: [], error: null };
    
    // Get threads where user is a participant and thread belongs to org
    const { data, error } = await supabase
      .from('message_threads')
      .select(`
        *,
        thread_participants!inner(user_id, last_read_at),
        messages(content, sent_at, sender_name)
      `)
      .eq('organization_id', orgId)
      .eq('thread_participants.user_id', userId)
      .order('updated_at', { ascending: false });
    return { data, error };
  },

  getByThread: async (threadId: string) => {
    const orgId = await getCurrentOrgId();
    const userId = await getCurrentUserId();
    if (!orgId || !userId) return { data: [], error: { message: 'Not authenticated' } };
    
    // Verify thread belongs to org and user is participant
    const { data: thread } = await supabase
      .from('message_threads')
      .select('id, organization_id, thread_participants!inner(user_id)')
      .eq('id', threadId)
      .eq('organization_id', orgId)
      .eq('thread_participants.user_id', userId)
      .single();
    
    if (!thread) return { data: [], error: { message: 'Thread not found' } };
    
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({ 
        subject,
        organization_id: orgId
      })
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions(permission_id, permissions(key, name))
      `)
      .eq('organization_id', orgId)
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: { message: 'Not authenticated' } };
    
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);
    return { error };
  },
};

// Audit Logs
export const auditLogs = {
  getAll: async (filters?: { type?: string; resourceType?: string; limit?: number }) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };
    
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', orgId)
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('organization_id', orgId)
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabase
      .from('social_accounts')
      .update({ status: 'disconnected' })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();
    return { data, error };
  },
};

// Scheduled Posts
export const scheduledPosts = {
  getAll: async () => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('organization_id', orgId)
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabase
      .from('scheduled_posts')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: { message: 'Not authenticated' } };
    
    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);
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
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };
    
    // Get both system templates and org-specific templates
    const { data, error } = await supabase
      .from('campaign_templates')
      .select('*')
      .or(`is_system.eq.true,organization_id.eq.${orgId}`)
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
