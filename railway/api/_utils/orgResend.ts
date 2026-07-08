import { Resend } from 'resend';
import { createSupabaseAdmin } from './supabaseAdmin.js';

export type OrgResendConfig = {
  apiKey: string;
  from: string;
  fromEmail: string;
  fromName: string;
  domainName?: string;
};

export const RESEND_NOT_CONFIGURED_MESSAGE =
  'Resend is not connected for this organization. Connect Resend under Settings → Integrations.';

export async function getOrgResendConfig(organizationId: string): Promise<OrgResendConfig | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('api_key_encrypted, config, connected')
    .eq('organization_id', organizationId)
    .eq('provider', 'resend')
    .maybeSingle();

  if (error || !data?.connected || !data.api_key_encrypted) {
    return null;
  }

  const config = (data.config || {}) as Record<string, string>;
  const fromEmail = config.fromEmail || '';
  const fromName = config.fromName || 'Platform';
  const from =
    config.from ||
    (fromEmail ? (fromName ? `${fromName} <${fromEmail}>` : fromEmail) : '');

  if (!from) {
    return null;
  }

  return {
    apiKey: data.api_key_encrypted,
    from,
    fromEmail,
    fromName,
    domainName: config.domainName,
  };
}

export async function getOrgResendMailer(
  organizationId: string | null | undefined,
): Promise<{ resend: Resend; from: string; config: OrgResendConfig } | null> {
  const config = organizationId ? await getOrgResendConfig(organizationId) : null;
  if (!config) {
    const systemApiKey = process.env.RESEND_API_KEY;
    const systemFrom = process.env.RESEND_FROM;
    if (systemApiKey && systemFrom) {
      const fromEmail = systemFrom.includes('<') ? systemFrom.match(/<([^>]+)>/)?.[1] || '' : systemFrom;
      const fromName = systemFrom.includes('<') ? systemFrom.split('<')[0].trim() : 'Platform';
      return {
        resend: new Resend(systemApiKey),
        from: systemFrom,
        config: {
          apiKey: systemApiKey,
          from: systemFrom,
          fromEmail,
          fromName,
        },
      };
    }
    return null;
  }

  return {
    resend: new Resend(config.apiKey),
    from: config.from,
    config,
  };
}

export function formatOrgFromAddress(config: OrgResendConfig, overrideFromName?: string): string {
  const name = overrideFromName?.trim();
  if (!name) {
    return config.from;
  }

  const email = config.fromEmail || extractEmailFromFrom(config.from);
  if (!email) {
    return config.from;
  }

  return `${name} <${email}>`;
}

function extractEmailFromFrom(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match?.[1]) {
    return match[1].trim();
  }
  if (from.includes('@')) {
    return from.trim();
  }
  return '';
}
