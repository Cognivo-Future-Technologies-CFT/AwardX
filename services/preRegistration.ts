import { getSupabaseClient } from './supabaseClient';

export interface PreRegistrationData {
  id?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  admin_notes?: string;

  // Personal Details
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  organization?: string;
  role?: string;

  // Qualification
  interest_reason?: string;
  referral_source?: string;
  user_type?: string;

  // Product Questions
  use_case?: string;
  team_size?: string;
  estimated_users?: string;
  current_tool?: string;
  biggest_challenge?: string;

  // Organization Details
  org_name?: string;
  website?: string;
  industry?: string;
  employees_count?: string;

  // Award Program
  runs_awards?: boolean;
  award_categories?: string;
  estimated_nominations?: string;
  estimated_judges?: string;
  expected_launch_month?: string;
  current_workflow?: string;
  biggest_pain_point?: string;

  // Early Access
  join_beta?: boolean;
  lifetime_discount?: boolean;
  pilot_customer?: boolean;
  schedule_demo?: boolean;
  design_partner?: boolean;

  // Marketing
  referral_code?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device_type?: string;
  browser?: string;
  
  // Consent
  updates_consent?: boolean;
  privacy_consent?: boolean;
  
  // Meta
  ip_address?: string;
}

export const preRegistrationService = {
  async createRegistration(data: PreRegistrationData) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      throw new Error(`Database connection is not configured. URL: "${url}", KEY: "${key ? 'Present' : 'Missing'}". Please restart your dev server.`);
    }

    const { error } = await supabase
      .from('pre_registrations')
      .insert([data]);

    if (error) {
      if (error.code === '23505') {
        throw new Error('This email has already been registered.');
      }
      throw error;
    }
    return true;
  },

  async getRegistrations() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured');

    const { data, error } = await supabase
      .from('pre_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getRegistrationById(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured');

    const { data, error } = await supabase
      .from('pre_registrations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateRegistration(id: string, updates: Partial<PreRegistrationData>) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured');

    const { data, error } = await supabase
      .from('pre_registrations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteRegistration(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured');

    const { error } = await supabase
      .from('pre_registrations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async getStats() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('pre_registrations')
      .select('status, created_at, join_beta, schedule_demo');

    if (error) throw error;

    const stats = {
      totalRegistrations: data.length,
      todayRegistrations: 0,
      qualifiedLeads: 0,
      convertedLeads: 0,
      demoRequests: 0,
      betaSignups: 0
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data.forEach(item => {
      if (new Date(item.created_at) >= today) {
        stats.todayRegistrations++;
      }
      if (item.status === 'Qualified') stats.qualifiedLeads++;
      if (item.status === 'Converted') stats.convertedLeads++;
      if (item.schedule_demo) stats.demoRequests++;
      if (item.join_beta) stats.betaSignups++;
    });

    return stats;
  }
};
