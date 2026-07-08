import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export const isSupabaseConfigured = () =>
	Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export function getSupabaseAdmin(): SupabaseClient {
	if (_client) return _client;

	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		throw new Error('Supabase server client is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
	}

	_client = createClient(url, key, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});

	return _client;
}
