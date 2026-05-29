import { getSupabaseAdmin } from '../supabase.js';

export type DiditIntegration = {
  connected: boolean;
  apiKey: string | null;
  apiBaseUrl: string;
  webhookSecret: string | null;
};

export async function getOrgDiditIntegration(organizationId: string): Promise<DiditIntegration> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('organization_integrations')
    .select('api_key_encrypted, config, connected')
    .eq('organization_id', organizationId)
    .eq('provider', 'didit')
    .maybeSingle();

  const config = (data?.config || {}) as Record<string, string>;
  const envKey = process.env.DIDIT_API_KEY || process.env.DIDIT_CLIENT_SECRET || '';
  const apiKey =
    data?.connected && data?.api_key_encrypted
      ? data.api_key_encrypted
      : envKey || null;

  return {
    connected: !!(data?.connected && data?.api_key_encrypted) || !!envKey,
    apiKey,
    apiBaseUrl: config.apiBaseUrl || process.env.DIDIT_API_BASE_URL || 'https://verification.didit.me',
    webhookSecret: config.webhookSecret || process.env.DIDIT_WEBHOOK_SECRET || null,
  };
}

export async function getDiditForProgram(programId: string): Promise<DiditIntegration & { organizationId: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data: program } = await supabase
    .from('programs')
    .select('organization_id')
    .eq('id', programId)
    .maybeSingle();

  if (!program?.organization_id) {
    const envKey = process.env.DIDIT_API_KEY || '';
    return {
      organizationId: null,
      connected: !!envKey,
      apiKey: envKey || null,
      apiBaseUrl: process.env.DIDIT_API_BASE_URL || 'https://verification.didit.me',
      webhookSecret: process.env.DIDIT_WEBHOOK_SECRET || null,
    };
  }

  const didit = await getOrgDiditIntegration(program.organization_id);
  return { ...didit, organizationId: program.organization_id };
}
