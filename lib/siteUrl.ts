/**
 * Canonical app origin for OAuth redirects, emails, and absolute links.
 * Local dev always uses http:// — Vite does not serve HTTPS on localhost.
 */
export function resolveSiteUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL || '').trim().replace(/\/$/, '');
  if (configured) {
    return normalizeLocalDevProtocol(configured);
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeLocalDevProtocol(window.location.origin);
  }

  return 'http://localhost:3000';
}

export function resolveAuthCallbackUrl(): string {
  return `${resolveSiteUrl()}/auth/callback`;
}

function normalizeLocalDevProtocol(url: string): string {
  try {
    const parsed = new URL(url);
    const isLocalhost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]';

    if (isLocalhost && parsed.protocol === 'https:') {
      parsed.protocol = 'http:';
      return parsed.origin;
    }

    return parsed.origin;
  } catch {
    return url.replace(/\/$/, '');
  }
}

export function hasPendingAuthCallback(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = window.location.hash || '';
  const search = window.location.search || '';

  if (hash.includes('access_token=') || hash.includes('refresh_token=') || hash.includes('error=')) {
    return true;
  }

  if (search.includes('code=') || search.includes('error=')) {
    return true;
  }

  return window.location.pathname === '/auth/callback';
}
