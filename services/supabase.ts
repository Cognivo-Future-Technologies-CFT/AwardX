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

// Helper to get current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { user } = await auth.getUser();
  return user?.id || null;
};

// Helper to get current organization ID
export const getCurrentOrgId = async (): Promise<string | null> => {
  const org = await organizations.getCurrent();
  return org.data?.id || null;
};

// Clear cache (call on logout or when user changes)
export const clearUserCache = () => {
  // No-op: cache removed.
};

export const resolveMediaPublicUrl = (value?: string | null): string => {
  const raw = (value || '').trim();
  if (!raw) return '';

  // Already a directly loadable URL/data URI.
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  const base = supabaseUrl.replace(/\/$/, '');
  if (!base) return raw;

  // Support values stored as absolute storage paths without host.
  if (raw.startsWith('/storage/v1/object/')) {
    return `${base}${raw}`;
  }

  let path = raw.replace(/^\/+/, '');
  if (path.startsWith('media/')) {
    path = path.slice('media/'.length);
  }

  const isKnownMediaPath =
    path.startsWith('avatars/') ||
    path.startsWith('submissions/') ||
    path.startsWith('program-pages/');

  // Backward compatibility: old avatar values were sometimes persisted as only filename.
  const isLikelyAvatarFilename = /^[0-9a-f-]{36}-\d+\.[a-z0-9]+$/i.test(path);

  if (isLikelyAvatarFilename) {
    path = `avatars/${path}`;
  }

  if (isKnownMediaPath || isLikelyAvatarFilename) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    return `${base}/storage/v1/object/public/media/${encodedPath}`;
  }

  return raw;
};

const extractStorageBucketAndPath = (value?: string | null): { bucket: string; path: string } | null => {
  const raw = (value || '').trim();
  if (!raw) return null;

  const parseStorageRoute = (input: string): { bucket: string; path: string } | null => {
    const match = input.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/i);
    if (!match) return null;
    const bucket = decodeURIComponent(match[1] || '').trim();
    const path = decodeURIComponent(match[2] || '').trim();
    if (!bucket || !path) return null;
    return { bucket, path };
  };

  const fromUrl = parseStorageRoute(raw);
  if (fromUrl) return fromUrl;

  if (raw.startsWith('/storage/v1/object/')) {
    return parseStorageRoute(raw);
  }

  const normalized = raw.replace(/^\/+/, '');
  const avatarsBucket = import.meta.env.VITE_STORAGE_BUCKET_AVATARS || 'media';
  const submissionsBucket = import.meta.env.VITE_STORAGE_BUCKET_SUBMISSIONS || 'media';
  const assetsBucket = import.meta.env.VITE_STORAGE_BUCKET_PROGRAM_ASSETS || 'media';

  if (normalized.startsWith('avatars/')) return { bucket: avatarsBucket, path: normalized };
  if (normalized.startsWith('submissions/')) return { bucket: submissionsBucket, path: normalized };
  if (normalized.startsWith('program-pages/')) return { bucket: assetsBucket, path: normalized };

  return null;
};

export const resolveMediaUrl = async (value?: string | null, expiresIn = 60 * 60 * 24 * 7): Promise<string> => {
  const raw = (value || '').trim();
  if (!raw) return '';

  const parsed = extractStorageBucketAndPath(raw);
  if (!parsed || !supabase) {
    return resolveMediaPublicUrl(raw);
  }

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn);

  if (error || !data?.signedUrl) {
    return resolveMediaPublicUrl(raw);
  }

  return data.signedUrl;
};

// Refresh cache (call after login or when org changes)
export const refreshUserCache = async () => {
  // No-op beyond triggering fresh reads.
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
            email: email.toLowerCase(),
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
        redirectTo: `${siteUrl}/auth/callback`,
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
          email: (user.email || '').toLowerCase() || null,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        })
        .select('organization_id')
        .single();

      // If profile still has no org, fall back to org membership
      const fallbackOrgId = newProfile?.organization_id || (await (async () => {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id, joined_at')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return membership?.organization_id || null;
      })());

      if (!fallbackOrgId) {
        return { data: null, error: null };
      }

      // Best-effort: link profile to org for future calls
      try {
        await supabase.from('profiles').update({ organization_id: fallbackOrgId }).eq('id', user.id);
      } catch {
        // ignore
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, website, industry, plan')
        .eq('id', fallbackOrgId)
        .single();

      if (org) {
        return { data: org as { id: string }, error: null };
      }

      return { data: null, error: null };
    }

    // If no organization_id, return null (user not assigned to org yet)
    if (!profile.organization_id) {
      // Fallback: check organization_members
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, joined_at')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!membership?.organization_id) {
        return { data: null, error: null };
      }

      // Best-effort: persist org link on profile
      try {
        await supabase.from('profiles').update({ organization_id: membership.organization_id }).eq('id', user.id);
      } catch {
        // ignore
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, website, industry, plan')
        .eq('id', membership.organization_id)
        .single();

      if (org) {
        return { data: org as { id: string }, error: null };
      }

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
          email: (user.email || '').toLowerCase() || null,
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
        program_payment_configs(*),
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

  getPublicById: async (id: string) => {
    // No org check needed for public page
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    const { data, error } = await supabase
      .from('programs')
      .select(`
        *,
        event_types(*),
        categories(*),
        rounds(*),
        program_payment_configs(*),
        judging_criteria(*),
        organization:organizations(id, name, logo_url, industry, website)
      `)
      .eq('id', id)
      // .eq('visibility', 'public') // Optional: enforce public visibility
      .single();
    return { data, error };
  },

  getBySlug: async (slug: string) => {
    // No org check needed for public page
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    const { data, error } = await supabase
      .from('programs')
      .select(`
        *,
        event_types(*),
        categories(*),
        rounds(*),
        program_payment_configs(*),
        judging_criteria(*),
        organization:organizations(id, name, logo_url, industry, website)
      `)
      .eq('slug', slug)
      .single();

    // If not found, check slug_history for renamed slugs
    if (error && !data) {
      const { data: history } = await supabase
        .from('slug_history')
        .select('program_id, new_slug')
        .eq('old_slug', slug)
        .order('changed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (history?.new_slug) {
        // Recursive call with the new slug
        return programs.getBySlug(history.new_slug);
      }
    }

    return { data, error };
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
        .eq('program_id', programId)
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
      .in('program_id', programIds);
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

// Round edges
export const roundEdges = {
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
      .from('round_edges')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  create: async (edge: {
    program_id: string;
    source_round_id: string;
    target_round_id: string;
    condition: any;
    sort_order: number;
  }) => {
    const { data, error } = await supabase
      .from('round_edges')
      .insert(edge)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<{
    source_round_id: string;
    target_round_id: string;
    condition: any;
    sort_order: number;
  }>) => {
    const { data, error } = await supabase
      .from('round_edges')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('round_edges')
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
    page?: number;
    pageSize?: number;
    search?: string;
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
    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters?.pageSize || 0));
    const usePagination = pageSize > 0;
    const offset = (page - 1) * (usePagination ? pageSize : 1);

    let query = supabase
      .from('submissions')
      .select(`
        *,
        programs!inner(organization_id),
        categories(title),
        submission_files(*),
        submission_judges(judge_id)
      `, { count: usePagination ? 'exact' : undefined })
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

    if (filters?.search?.trim()) {
      const search = filters.search.trim();
      query = query.or(`title.ilike.%${search}%,applicant_name.ilike.%${search}%,applicant_email.ilike.%${search}%`);
    }

    if (usePagination) {
      const { data, error, count } = await query.range(offset, offset + pageSize - 1);
      return { data, error, count };
    }

    const { data, error } = await query;
    return { data, error, count: data?.length || 0 };
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
    payment_status?: string;
    payment_amount?: number;
    payment_id?: string;
    submission_data?: Record<string, any>;
    allowPublicSubmission?: boolean; // Flag for public form submissions (not a DB column)
  }) => {
    const orgId = await getCurrentOrgId();
    const userId = await getCurrentUserId();

    // Check if this is a public form submission (submission_data contains form_id)
    const isPublicFormSubmission = submission.submission_data?.form_id !== undefined;
    const isPublicSubmission = isPublicFormSubmission || submission.allowPublicSubmission;

    if (isPublicSubmission) {
      // For public form submissions, just verify the program exists
      const { data: program } = await supabase
        .from('programs')
        .select('id')
        .eq('id', submission.program_id)
        .single();

      if (!program) return { data: null, error: { message: 'Program not found' } };
    } else {
      // For internal submissions, verify program belongs to user's org
      if (!userId) return { data: null, error: { message: 'Not authenticated' } };
      if (!orgId) return { data: null, error: { message: 'Not authenticated' } };

      const { data: program } = await supabase
        .from('programs')
        .select('id')
        .eq('id', submission.program_id)
        .eq('organization_id', orgId)
        .single();

      if (!program) return { data: null, error: { message: 'Program not found' } };
    }

    // Extract allowPublicSubmission from submission object before inserting
    const { allowPublicSubmission, ...submissionData } = submission;

    const { data, error } = await supabase
      .from('submissions')
      .insert({
        ...submissionData,
        ...(userId ? { applicant_id: userId } : {}),
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

  assignJudges: async (submissionId: string, judgeIds: string[], replaceExisting = false) => {
    const assignments = judgeIds.map(judgeId => ({
      submission_id: submissionId,
      judge_id: judgeId,
    }));

    if (replaceExisting && judgeIds.length === 0) {
      const { error } = await supabase
        .from('submission_judges')
        .delete()
        .eq('submission_id', submissionId);
      return { data: [], error };
    }

    const { data, error } = assignments.length > 0
      ? await supabase
          .from('submission_judges')
          .upsert(assignments, { onConflict: 'submission_id,judge_id' })
          .select()
      : { data: [], error: null };

    if (!error && replaceExisting && judgeIds.length > 0) {
      const { data: existingRows, error: existingError } = await supabase
        .from('submission_judges')
        .select('id, judge_id')
        .eq('submission_id', submissionId);

      if (existingError) {
        return { data, error: existingError };
      }

      const keep = new Set(judgeIds);
      const idsToDelete = (existingRows || [])
        .filter((row: any) => !keep.has(row.judge_id))
        .map((row: any) => row.id);

      if (idsToDelete.length > 0) {
        const { error: cleanupError } = await supabase
          .from('submission_judges')
          .delete()
          .in('id', idsToDelete);

        if (cleanupError) {
          return { data, error: cleanupError };
        }
      }
    }

    return { data, error };
  },

  // Public Voting
  getPublic: async (programId: string) => {
    if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        categories(title)
      `)
      .eq('program_id', programId)
      .ilike('status', 'shortlisted') // Usually we only vote on shortlisted entries
      .order('submitted_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return { data, error };
    }

    // Fallback: fetch all for the program and filter client-side to ensure shortlist visibility.
    const { data: allData, error: allError } = await supabase
      .from('submissions')
      .select(`
        *,
        categories(title)
      `)
      .eq('program_id', programId);

    if (allError || !allData) return { data: [], error: allError };

    const shortlisted = allData.filter((s: any) => {
      const status = String(s.status || '').toLowerCase();
      const dataStatus = String(s.submission_data?.status || '').toLowerCase();
      const dataFlag = s.submission_data?.shortlisted === true;
      return status === 'shortlisted' || dataStatus === 'shortlisted' || dataFlag;
    });

    const idsToNormalize = shortlisted
      .filter((s: any) => String(s.status || '').toLowerCase() !== 'shortlisted')
      .map((s: any) => s.id);

    if (idsToNormalize.length > 0) {
      // Best-effort normalization so shortlisted status is stored in DB.
      await supabase
        .from('submissions')
        .update({ status: 'shortlisted' })
        .in('id', idsToNormalize);
    }

    return { data: shortlisted, error: null };
  },

  vote: async (id: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

    // Increment votes_count using rpc or manual increment
    // Since we don't have rpc yet, let's assume votes_count exists
    const { data, error } = await supabase.rpc('increment_vote', { submission_id: id });

    // Fallback if rpc fails (dev mode)
    if (error) {
      console.warn('RPC increment_vote failed, attempting manual update');
      const { data: sub, error: subError } = await supabase
        .from('submissions')
        .select('votes_count, submission_data')
        .eq('id', id)
        .single();

      if (!subError && sub && typeof sub.votes_count === 'number') {
        return supabase
          .from('submissions')
          .update({ votes_count: (sub.votes_count || 0) + 1 })
          .eq('id', id);
      }

      const currentVotes = Number(sub?.submission_data?.votes || 0);
      const nextSubmissionData = {
        ...(sub?.submission_data || {}),
        votes: currentVotes + 1,
      };

      return supabase
        .from('submissions')
        .update({ submission_data: nextSubmissionData })
        .eq('id', id);
    }

    return { data, error };
  },
};

// Judges
export const judges = {
  getAll: async (programId?: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };

    let query = supabase
      .from('judges')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');
    if (programId) {
      query = query.eq('program_id', programId);
    }
    const { data, error } = await query;
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
    programId?: string;
  }) => {
    const { programId, ...judgePayload } = judge;
    const org = await organizations.getCurrent();

    // Reuse existing judge in this organization when the email already exists.
    // This avoids duplicate-key errors and lets invite/add flows behave idempotently.
    const normalizedEmail = (judgePayload.email || '').trim().toLowerCase();
    if (org.data?.id && normalizedEmail) {
      const { data: existingJudge } = await supabase
        .from('judges')
        .select('*, invite_token')
        .eq('organization_id', org.data.id)
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (existingJudge) {
        // Reassign judge to the current program when needed.
        if (programId && existingJudge.program_id !== programId) {
          const { data: updatedJudge, error: updateError } = await supabase
            .from('judges')
            .update({
              program_id: programId,
              name: existingJudge.name || judgePayload.name,
            })
            .eq('id', existingJudge.id)
            .eq('organization_id', org.data.id)
            .select('*, invite_token')
            .single();

          if (updateError) return { data: null, error: updateError };
          return { data: { ...updatedJudge, reused_existing: true }, error: null };
        }

        return { data: { ...existingJudge, reused_existing: true }, error: null };
      }
    }

    const { data, error } = await supabase
      .from('judges')
      .insert({
        ...judgePayload,
        email: normalizedEmail || judgePayload.email,
        organization_id: org.data?.id,
        program_id: programId || null,
      })
      .select('*, invite_token')
      .single();
    return { data, error };
  },

  invite: async (email: string, name: string, programId?: string) => {
    // Create/reuse judge record first.
    const { data, error } = await judges.create({ name, email, programId });
    if (error || !data?.id) {
      return { data, error };
    }

    // Always rotate invite token on invite to guarantee a fresh valid link.
    const freshToken = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`) as string;
    const { data: rotated, error: rotateError } = await supabase
      .from('judges')
      .update({
        invite_token: freshToken,
        invite_token_used_at: null,
        status: 'invited',
        accepted_at: null,
      })
      .eq('id', data.id)
      .select('*, invite_token')
      .single();

    if (rotateError) {
      return { data, error: rotateError };
    }

    return { data: { ...rotated, reused_existing: (data as any).reused_existing === true }, error: null };
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

  delete: async (id: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: { message: 'Not authenticated' } };

    // Remove submission_judges assignments first
    await supabase.from('submission_judges').delete().eq('judge_id', id);

    const { error } = await supabase
      .from('judges')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);
    return { error };
  },

  deleteAll: async (programId?: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: { message: 'Not authenticated' } };

    // Get all judge IDs first to clean up submission_judges
    let query = supabase.from('judges').select('id').eq('organization_id', orgId);
    if (programId) query = query.eq('program_id', programId);
    const { data: judgeRows } = await query;
    const judgeIds = (judgeRows || []).map((j: any) => j.id);

    if (judgeIds.length > 0) {
      await supabase.from('submission_judges').delete().in('judge_id', judgeIds);
    }

    let deleteQuery = supabase.from('judges').delete().eq('organization_id', orgId);
    if (programId) deleteQuery = deleteQuery.eq('program_id', programId);
    const { error } = await deleteQuery;
    return { error };
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
    min_score?: number;
    max_score?: number;
    sort_order?: number;
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
    min_score: number;
    max_score: number;
    sort_order: number;
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





// Roles
export const roles = {
  getAll: async (programId?: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };

    let query = supabase
      .from('roles')
      .select(`
        *,
        role_permissions(permission_id, permissions(key, name))
      `)
      .eq('organization_id', orgId)
      .order('name');
    if (programId) {
      query = query.eq('program_id', programId);
    }
    const { data, error } = await query;
    return { data, error };
  },

  create: async (role: { name: string; color?: string; permissions: string[]; programId?: string }) => {
    const org = await organizations.getCurrent();
    const { data: newRole, error: roleError } = await supabase
      .from('roles')
      .insert({
        name: role.name,
        color: role.color,
        organization_id: org.data?.id,
        program_id: role.programId || null,
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

  update: async (id: string, updates: Partial<{ name: string; color: string }>) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();
    return { data, error };
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

  logEvent: async (payload: {
    action: string;
    actionType: string;
    resourceType?: string;
    resourceId?: string;
    details?: string;
    metadata?: Record<string, any>;
  }) => {
    const org = await organizations.getCurrent();
    const orgId = org.data?.id;
    if (!orgId) return { data: null, error: { message: 'Organization not found' } };

    const { user } = await auth.getUser();
    const userId = user?.id || null;

    // Try RPC first (nice centralized logging). Fallback to direct insert if RPC isn't present.
    try {
      const { data, error } = await supabase.rpc('log_audit_event', {
        p_organization_id: orgId,
        p_action: payload.action,
        p_action_type: payload.actionType,
        p_resource_type: payload.resourceType,
        p_resource_id: payload.resourceId,
        p_details: payload.details,
        p_metadata: payload.metadata || {},
      } as any);
      if (!error) return { data, error: null };
    } catch {
      // ignore and fallback
    }

    // Direct insert fallback
    let user_name: string | null = null;
    let user_avatar: string | null = null;
    try {
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', userId)
          .maybeSingle();
        user_name = (profile as any)?.full_name || user?.email || null;
        user_avatar = (profile as any)?.avatar_url || (user as any)?.user_metadata?.avatar_url || null;
      }
    } catch {
      // ignore
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        organization_id: orgId,
        user_id: userId,
        action: payload.action,
        action_type: payload.actionType,
        resource_type: payload.resourceType || null,
        resource_id: payload.resourceId || null,
        details: payload.details || null,
        metadata: payload.metadata || {},
        user_name,
        user_avatar,
      })
      .select()
      .single();

    return { data, error };
  },

  // Backwards-compatible wrapper
  log: async (action: string, type: string, resourceType?: string, resourceId?: string, details?: string) => {
    return auditLogs.logEvent({ action, actionType: type, resourceType, resourceId, details });
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
// TEAM / MEMBERS (Organization members, roles)
// ============================================================================

export const team = {
  getMembers: async (programId?: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: [], error: null };

    // Avoid relying on nested joins here (FK join syntax can vary and RLS can block joined tables).
    // Instead, load membership rows first, then hydrate profiles + roles in separate queries.
    let memberQuery = supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: false });
    
    // Include both program-specific members AND organization-wide members (where program_id is NULL)
    if (programId) {
      memberQuery = memberQuery.or(`program_id.eq.${programId},program_id.is.null`);
    }
    const { data: memberRows, error } = await memberQuery;

    if (error || !memberRows) return { data: [], error };

    const userIds = Array.from(new Set(memberRows.map((m: any) => m.user_id).filter(Boolean)));
    const roleIds = Array.from(new Set(memberRows.map((m: any) => m.role_id).filter(Boolean)));

    const [{ data: profiles, error: profilesError }, { data: rolesRows, error: rolesError }] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id, email, full_name, avatar_url, created_at, updated_at').in('id', userIds)
        : Promise.resolve({ data: [], error: null } as any),
      roleIds.length
        ? supabase.from('roles').select('id, name, color').in('id', roleIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (profilesError) return { data: [], error: profilesError };
    if (rolesError) return { data: [], error: rolesError };

    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
    const roleById = new Map((rolesRows || []).map((r: any) => [r.id, r]));

    const hydrated = (memberRows || []).map((m: any) => ({
      ...m,
      profiles: profileById.get(m.user_id) || null,
      roles: roleById.get(m.role_id) || null,
    }));

    return { data: hydrated, error: null };
  },

  updateMemberRole: async (memberId: string, roleId: string, programId?: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { data: null, error: { message: 'Not authenticated' } };

    let query = supabase
      .from('organization_members')
      .update({ role_id: roleId })
      .eq('id', memberId)
      .eq('organization_id', orgId);
    if (programId) {
      query = query.eq('program_id', programId);
    }
    const { data, error } = await query.select().single();

    return { data, error };
  },

  // Direct-add user to org by email (no invite flow).
  // Works only if the user already exists (i.e. they have signed up and have a profile row with email set).
  addMemberByEmail: async (email: string, roleId: string, programId?: string) => {
    const orgId = await getCurrentOrgId();
    const addedBy = await getCurrentUserId();
    if (!orgId || !addedBy) return { data: null, error: { message: 'Not authenticated' } };

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return { data: null, error: { message: 'Email is required' } };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) return { data: null, error: profileError };
    if (!profile?.id) {
      return { data: null, error: { message: 'User not found. Have them sign up first, then add them.' } };
    }

    const { data, error } = await supabase
      .from('organization_members')
      .upsert({
        organization_id: orgId,
        program_id: programId || null,
        user_id: profile.id,
        role_id: roleId,
        status: 'active',
        invited_by: null,
        invited_at: null,
        joined_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,user_id,program_id' })
      .select()
      .single();

    // Ensure the added user's profile is linked to this organization
    // (the rest of the app uses profiles.organization_id to discover "current org").
    try {
      await supabase
        .from('profiles')
        .update({ organization_id: orgId })
        .eq('id', profile.id);
    } catch {
      // ignore
    }

    return { data, error };
  },

  removeMember: async (memberId: string) => {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: { message: 'Not authenticated' } };
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', orgId);
    return { error };
  },
};

// ============================================================================
// SETTINGS (Profile + user preferences + organization)
// ============================================================================

export const settings = {
  getProfile: async () => {
    const { user, error: userError } = await auth.getUser();
    if (userError || !user) return { data: null, error: userError || { message: 'Not authenticated' } };

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Always provide email from auth (profiles may not store it)
    const merged = profile ? { ...profile, email: user.email } : { id: user.id, email: user.email };
    if (merged && typeof merged === 'object') {
      (merged as any).avatar_url = await resolveMediaUrl((merged as any).avatar_url);
    }

    // Best-effort: persist email into profiles so other features (like "Add User by email") can look it up.
    try {
      if (!profile?.email && user.email) {
        await supabase.from('profiles').update({ email: user.email.toLowerCase() }).eq('id', user.id);
      }
    } catch {
      // ignore
    }
    return { data: merged, error };
  },

  updateProfile: async (updates: Partial<{
    full_name: string;
    avatar_url: string;
    phone: string;
    timezone: string;
    job_title: string;
  }>) => {
    const { user } = await auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    // Ensure profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('profiles').insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    return { data, error };
  },

  getOrganization: async () => {
    const org = await organizations.getCurrent();
    return org;
  },

  updateOrganization: async (updates: Partial<{ name: string; logo_url: string; website: string; industry: string; plan: string }>) => {
    const org = await organizations.getCurrent();
    const orgId = org.data?.id;
    if (!orgId) return { data: null, error: { message: 'Organization not found' } };

    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();

    return { data, error };
  },

  getUserSettings: async () => {
    const userId = await getCurrentUserId();
    if (!userId) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return { data, error };
  },

  updateUserSettings: async (updates: Partial<{ notifications: any; preferences: any }>) => {
    const userId = await getCurrentUserId();
    if (!userId) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    return { data, error };
  },
};

// ============================================================================
// FORMS (Program submission forms)
// ============================================================================

export const forms = {
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
      .from('program_forms')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  getFields: async (formId: string) => {
    const { data, error } = await supabase
      .from('program_form_fields')
      .select('*')
      .eq('form_id', formId)
      .order('sort_order');
    return { data, error };
  },

  create: async (form: { program_id: string; title: string; description?: string; is_active?: boolean }) => {
    const { data, error } = await supabase
      .from('program_forms')
      .insert(form)
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, updates: Partial<{ title: string; description: string; is_active: boolean; pages: any; theme: any }>) => {
    const { data, error } = await supabase
      .from('program_forms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    // First delete all form fields to avoid foreign key constraint violation
    const { error: fieldsError } = await supabase
      .from('program_form_fields')
      .delete()
      .eq('form_id', id);

    if (fieldsError) {
      return { error: fieldsError };
    }

    // Then delete the form
    const { error } = await supabase.from('program_forms').delete().eq('id', id);
    return { error };
  },

  replaceFields: async (formId: string, fields: Array<{
    label: string;
    type: string;
    required?: boolean;
    config?: any;
    sort_order?: number;
  }>) => {
    // Delete existing then insert new (simple approach)
    await supabase.from('program_form_fields').delete().eq('form_id', formId);

    const payload = fields.map((f, idx) => ({
      form_id: formId,
      label: f.label,
      type: f.type,
      required: !!f.required,
      config: f.config ?? {},
      sort_order: f.sort_order ?? idx,
    }));

    const { data, error } = await supabase
      .from('program_form_fields')
      .insert(payload)
      .select();

    return { data, error };
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
    if (!supabase) {
      return { url: null, path: null, bucket: null, error: { message: 'Supabase is not configured.' } };
    }

    const bucket = import.meta.env.VITE_STORAGE_BUCKET_AVATARS || 'media';
    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: file.type || undefined,
      });

    if (data) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);

      return {
        url: signedData?.signedUrl || null,
        path: data.path,
        bucket,
        error: signedError || null,
      };
    }
    return { url: null, path: null, bucket, error };
  },

  uploadSubmissionFile: async (file: File, submissionId: string) => {
    if (!supabase) {
      return { path: null, bucket: null, error: { message: 'Supabase is not configured.' } };
    }

    const bucket = import.meta.env.VITE_STORAGE_BUCKET_SUBMISSIONS || 'media';
    const fileExt = file.name.split('.').pop();
    const fileName = `submissions/${submissionId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: file.type || undefined,
      });

    if (data) {
      return { path: data.path, bucket, error: null };
    }
    return { path: null, bucket, error };
  },

  uploadProgramPageAsset: async (file: File, programId: string, sectionType?: string, fieldKey?: string) => {
    if (!supabase) {
      return { url: null, path: null, bucket: null, error: { message: 'Supabase is not configured.' } };
    }

    const configuredBucket = import.meta.env.VITE_STORAGE_BUCKET_PROGRAM_ASSETS || 'media';
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const section = (sectionType || 'section').replace(/[^a-zA-Z0-9_-]/g, '_');
    const field = (fieldKey || 'asset').replace(/[^a-zA-Z0-9_-]/g, '_');
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filePath = `program-pages/${programId}/${section}/${field}/${unique}-${safeName}.${ext}`;

    const { data, error } = await supabase.storage
      .from(configuredBucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || undefined,
      });

    if (error || !data) {
      return { url: null, path: null, bucket: configuredBucket, error };
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(configuredBucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    return {
      url: signedData?.signedUrl || null,
      path: filePath,
      bucket: configuredBucket,
      error: signedError || null,
    };
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
    if (!supabase) return null as any;
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

  subscribeToJudgingProgress: (programId: string, callback: (payload: any) => void) => {
    if (!supabase) return null as any;

    return supabase
      .channel(`judging:${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submission_judges',
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
        },
        callback
      )
      .subscribe();
  },

  subscribeToAuditLogs: (callback: (payload: any) => void) => {
    if (!supabase) return null as any;
    return supabase
      .channel('audit-logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs',
        },
        callback
      )
      .subscribe();
  },

  subscribeToNotifications: (callback: (payload: any) => void) => {
    if (!supabase) return null as any;
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        callback
      )
      .subscribe();
  },

  subscribeToMessages: (threadId: string, callback: (payload: any) => void) => {
    if (!supabase) return null as any;
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
    if (supabase && channel) {
      supabase.removeChannel(channel);
    }
  },
};

// ============================================================================
// PAGE BUILDER HELPERS
// ============================================================================

export const programPages = {
  // Config
  getConfig: async (programId: string) => {
    // Try to get existing config
    const { data, error } = await supabase
      .from('program_page_configs')
      .select('*')
      .eq('program_id', programId)
      .maybeSingle();

    if (!data && !error) {
      // Return default if none exists (frontend should handle creation)
      return { data: null, error: null };
    }
    return { data, error };
  },

  createOrUpdateConfig: async (programId: string, updates: any) => {
    // Check if exists
    const { data: existing } = await supabase
      .from('program_page_configs')
      .select('id')
      .eq('program_id', programId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('program_page_configs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('program_id', programId)
        .select()
        .single();
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from('program_page_configs')
        .insert({ program_id: programId, ...updates })
        .select()
        .single();
      return { data, error };
    }
  },

  // Sections
  getSections: async (programId: string) => {
    const { data, error } = await supabase
      .from('program_page_sections')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order', { ascending: true });
    return { data, error };
  },

  saveSection: async (section: any) => {
    // If it has an ID, update, else insert
    if (section.id && !section.id.startsWith('temp-')) {
      const { data, error } = await supabase
        .from('program_page_sections')
        .update({
          ...section,
          updated_at: new Date().toISOString()
        })
        .eq('id', section.id)
        .select()
        .single();
      return { data, error };
    } else {
      const { id, ...newSection } = section; // Remove temp id
      const { data, error } = await supabase
        .from('program_page_sections')
        .insert(newSection)
        .select()
        .single();
      return { data, error };
    }
  },

  deleteSection: async (sectionId: string) => {
    const { error } = await supabase
      .from('program_page_sections')
      .delete()
      .eq('id', sectionId);
    return { error };
  },

  reorderSections: async (sections: { id: string, sort_order: number }[]) => {
    // Create updates promise array
    const updates = sections.map(s =>
      supabase
        .from('program_page_sections')
        .update({ sort_order: s.sort_order })
        .eq('id', s.id)
    );
    await Promise.all(updates);
    return { error: null };
  },

  // Sponsors
  getSponsors: async (programId: string) => {
    const { data, error } = await supabase
      .from('program_sponsors')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  saveSponsor: async (sponsor: any) => {
    // Simple upsert based on ID existence
    if (sponsor.id && !sponsor.id.startsWith('temp-')) {
      const { data, error } = await supabase
        .from('program_sponsors')
        .update(sponsor)
        .eq('id', sponsor.id)
        .select().single();
      return { data, error };
    } else {
      const { id, ...newSponsor } = sponsor;
      const { data, error } = await supabase
        .from('program_sponsors')
        .insert(newSponsor)
        .select().single();
      return { data, error };
    }
  },

  deleteSponsor: async (id: string) => {
    const { error } = await supabase.from('program_sponsors').delete().eq('id', id);
    return { error };
  },

  // FAQs
  getFAQs: async (programId: string) => {
    const { data, error } = await supabase
      .from('program_faqs')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  saveFAQ: async (faq: any) => {
    if (faq.id && !faq.id.startsWith('temp-')) {
      const { data, error } = await supabase
        .from('program_faqs')
        .update(faq)
        .eq('id', faq.id)
        .select().single();
      return { data, error };
    } else {
      const { id, ...newFaq } = faq;
      const { data, error } = await supabase
        .from('program_faqs')
        .insert(newFaq)
        .select().single();
      return { data, error };
    }
  },

  deleteFAQ: async (id: string) => {
    const { error } = await supabase.from('program_faqs').delete().eq('id', id);
    return { error };
  },

  // Milestones
  getMilestones: async (programId: string) => {
    const { data, error } = await supabase
      .from('program_timeline_milestones')
      .select('*')
      .eq('program_id', programId)
      .order('sort_order');
    return { data, error };
  },

  saveMilestone: async (milestone: any) => {
    if (milestone.id && !milestone.id.startsWith('temp-')) {
      const { data, error } = await supabase
        .from('program_timeline_milestones')
        .update(milestone)
        .eq('id', milestone.id)
        .select().single();
      return { data, error };
    } else {
      const { id, ...newMilestone } = milestone;
      const { data, error } = await supabase
        .from('program_timeline_milestones')
        .insert(newMilestone)
        .select().single();
      return { data, error };
    }
  },

  deleteMilestone: async (id: string) => {
    const { error } = await supabase.from('program_timeline_milestones').delete().eq('id', id);
    return { error };
  },
};

// ============================================================================
// ROUND SUBMISSIONS (Pipeline enrollment)
// ============================================================================

export const roundSubmissions = {
  getByRound: async (roundId: string) => {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('round_submissions')
      .select(`
        *,
        submissions(id, title, description, cover_image_url, status, average_score, votes_count, applicant_name, applicant_email, category_id, submission_data, submission_judges(judge_id))
      `)
      .eq('round_id', roundId)
      .order('enrolled_at', { ascending: true });
    return { data, error };
  },

  getBySubmission: async (submissionId: string) => {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('round_submissions')
      .select(`*, rounds(id, title, type, status)`)
      .eq('submission_id', submissionId)
      .order('enrolled_at', { ascending: true });
    return { data, error };
  },

  enroll: async (roundId: string, submissionId: string, sourceRoundId?: string, carriedScore?: number) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const { data, error } = await supabase
      .from('round_submissions')
      .upsert({
        round_id: roundId,
        submission_id: submissionId,
        status: 'active',
        source_round_id: sourceRoundId || null,
        carried_score: carriedScore ?? null,
      }, { onConflict: 'round_id,submission_id' })
      .select()
      .single();
    return { data, error };
  },

  enrollBulk: async (entries: Array<{ round_id: string; submission_id: string; source_round_id?: string; carried_score?: number }>) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const rows = entries.map(e => ({
      round_id: e.round_id,
      submission_id: e.submission_id,
      status: 'active',
      source_round_id: e.source_round_id || null,
      carried_score: e.carried_score ?? null,
    }));
    const { data, error } = await supabase
      .from('round_submissions')
      .upsert(rows, { onConflict: 'round_id,submission_id' })
      .select();
    return { data, error };
  },

  updateStatus: async (roundId: string, submissionId: string, status: string, reason?: string) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const updates: Record<string, any> = { status };
    if (status === 'advanced') updates.advanced_at = new Date().toISOString();
    if (status === 'eliminated') {
      updates.eliminated_at = new Date().toISOString();
      if (reason) updates.elimination_reason = reason;
    }
    const { data, error } = await supabase
      .from('round_submissions')
      .update(updates)
      .eq('round_id', roundId)
      .eq('submission_id', submissionId)
      .select()
      .single();
    return { data, error };
  },

  countByRound: async (roundId: string) => {
    if (!supabase) return { total: 0, active: 0, advanced: 0, eliminated: 0 };
    const { data, error } = await supabase
      .from('round_submissions')
      .select('status')
      .eq('round_id', roundId);
    if (error || !data) return { total: 0, active: 0, advanced: 0, eliminated: 0 };
    return {
      total: data.length,
      active: data.filter(r => r.status === 'active').length,
      advanced: data.filter(r => r.status === 'advanced').length,
      eliminated: data.filter(r => r.status === 'eliminated').length,
    };
  },
};

// ============================================================================
// VOTING CONFIGS
// ============================================================================

export const votingConfigs = {
  getByRound: async (roundId: string) => {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase
      .from('voting_configs')
      .select('*')
      .eq('round_id', roundId)
      .single();
    return { data, error };
  },

  upsert: async (config: {
    round_id: string;
    votes_per_user?: number;
    votes_per_submission?: number;
    require_auth?: boolean;
    allow_anonymous?: boolean;
    show_results_publicly?: boolean;
    show_leaderboard?: boolean;
  }) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const { data, error } = await supabase
      .from('voting_configs')
      .upsert({ ...config, updated_at: new Date().toISOString() }, { onConflict: 'round_id' })
      .select()
      .single();
    return { data, error };
  },
};

// ============================================================================
// ADVANCEMENT
// ============================================================================

export const advancement = {
  createEvent: async (event: {
    round_id: string;
    target_round_id?: string;
    trigger_type: string;
    criteria_used: any;
    total_participants: number;
    advanced_count: number;
    eliminated_count: number;
    had_ties?: boolean;
    tie_resolution?: any;
    executed_by?: string;
    status?: string;
  }) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const { data, error } = await supabase
      .from('advancement_events')
      .insert(event)
      .select()
      .single();
    return { data, error };
  },

  createDetails: async (details: Array<{
    advancement_event_id: string;
    submission_id: string;
    outcome: string;
    rank?: number;
    score?: number;
    vote_count?: number;
    was_at_cutoff_boundary?: boolean;
    override_reason?: string;
  }>) => {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
    const { data, error } = await supabase
      .from('advancement_details')
      .insert(details)
      .select();
    return { data, error };
  },

  getEventsByRound: async (roundId: string) => {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('advancement_events')
      .select(`*, advancement_details(*)`)
      .eq('round_id', roundId)
      .order('executed_at', { ascending: false });
    return { data, error };
  },

  getEventsByProgram: async (programId: string) => {
    if (!supabase) return { data: [], error: null };
    // Get all rounds for this program, then their advancement events
    const { data: roundsData } = await supabase
      .from('rounds')
      .select('id')
      .eq('program_id', programId);
    if (!roundsData || roundsData.length === 0) return { data: [], error: null };
    const roundIds = roundsData.map(r => r.id);
    const { data, error } = await supabase
      .from('advancement_events')
      .select(`*, advancement_details(*), rounds!advancement_events_round_id_fkey(title)`)
      .in('round_id', roundIds)
      .order('executed_at', { ascending: false });
    return { data, error };
  },
};

// Export the main client
export default supabase;
