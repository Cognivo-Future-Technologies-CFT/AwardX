import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { trackSupabaseRequest } from './supabaseLoading';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let client: SupabaseClient | null | undefined;

const trackedSupabaseFetch: typeof fetch = (input, init) =>
  trackSupabaseRequest(() => fetch(input, init));

export const isSupabaseConfigured = (): boolean => Boolean(supabaseUrl && supabaseAnonKey);

/** Lazily create and reuse a single browser Supabase client. */
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }

  if (!isSupabaseConfigured()) {
    client = null;
    return client;
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: trackedSupabaseFetch,
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

/** @deprecated Prefer `getSupabaseClient()` for new code. */
export const supabase: SupabaseClient | null = getSupabaseClient();

export const isSupabaseReady = (): boolean => getSupabaseClient() !== null;
