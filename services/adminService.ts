import { getSupabaseClient } from './supabaseClient';

export interface AdminSystemUser {
  id: string;
  full_name: string | null;
  is_super_admin: boolean;
  created_at: string;
  organizations?: { organization: { name: string } }[];
}

export const adminService = {
  async getSystemUsers(): Promise<AdminSystemUser[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured');

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        is_super_admin,
        created_at,
        organizations:organization_members(organization:organizations(name))
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Type assertion because Supabase types might not perfectly map the join in all cases,
    // but this query is valid standard Supabase relational query.
    return (data as unknown) as AdminSystemUser[];
  },

  async setSuperAdminStatus(userId: string, isSuperAdmin: boolean): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured');

    const { error } = await supabase
      .from('profiles')
      .update({ is_super_admin: isSuperAdmin })
      .eq('id', userId);

    if (error) throw error;
  }
};
