export const INVITE_TTL_DAYS = 30;

export const RESEND_NOT_CONFIGURED_MESSAGE =
  'Resend is not connected for this organization. Connect Resend under Settings → Integrations.';

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getSiteUrl(): string {
  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VITE_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export function formatDeadlineText(deadline?: string | null): string {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function resolveSafeInviteUrl(siteUrl: string, inviteUrl: string | undefined, token: string) {
  const fallbackUrl = `${siteUrl}/team-invite/${token}`;
  if (!inviteUrl) return fallbackUrl;

  try {
    const candidate = new URL(inviteUrl);
    const trustedSite = new URL(siteUrl);
    if (candidate.origin !== trustedSite.origin) return fallbackUrl;

    const normalizedPath = candidate.pathname.replace(/\/+$/, '');
    if (normalizedPath === '/team-invite') {
      return `${candidate.origin}${normalizedPath}/${token}`;
    }

    if (normalizedPath.startsWith('/team-invite/')) {
      const currentToken = normalizedPath.split('/').pop();
      if (currentToken === token) return candidate.toString();
      return fallbackUrl;
    }

    if (normalizedPath === '/signup') {
      const queryToken = candidate.searchParams.get('teamInviteToken');
      if (queryToken === token) return candidate.toString();
      candidate.searchParams.set('teamInviteToken', token);
      return candidate.toString();
    }
  } catch {
    // Use fallback when caller-provided URL is malformed.
  }

  return fallbackUrl;
}

export function judgePortalUrl(siteUrl: string, token: string, inviteUrl?: string) {
  return inviteUrl || `${siteUrl}/judge/${encodeURIComponent(token)}`;
}

export function systemMailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}
