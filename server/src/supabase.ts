import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export const supabaseAdmin: SupabaseClient | null = isSupabaseConfigured
	? createClient(supabaseUrl, supabaseServiceRoleKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		})
	: null;

export function getSupabaseAdmin(): SupabaseClient {
	if (!supabaseAdmin) {
		throw new Error('Supabase server client is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
	}
	return supabaseAdmin;
}
