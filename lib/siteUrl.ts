/** Public production origin used in outbound emails when local/dev URLs would be useless. */
export const PUBLIC_SITE_URL = 'https://www.awardx.one';

export function isLocalDevHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return /localhost|127\.0\.0\.1|\[::1\]/i.test(url);
  }
}

/**
 * Canonical app origin for OAuth redirects, emails, and absolute links.
 * Local dev always uses http:// — Vite does not serve HTTPS on localhost.
 */
export function resolveSiteUrl(): string {
  // Prefer the live browser origin so password-reset emails match how the user opened the app.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeLocalDevProtocol(window.location.origin);
  }

  const configured = (import.meta.env.VITE_SITE_URL || '').trim().replace(/\/$/, '');
  if (configured) {
    return normalizeLocalDevProtocol(configured);
  }

  return 'http://localhost:3000';
}

/**
 * Origin for links that must work for recipients (invite/certificate emails).
 * Never returns localhost — uses VITE_SITE_URL when non-local, else production.
 */
export function resolvePublicSiteUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL || '').trim().replace(/\/$/, '');
  if (configured && !isLocalDevHost(configured)) {
    return forceHttpsPublicOrigin(configured);
  }

  if (typeof window !== 'undefined' && window.location?.origin && !isLocalDevHost(window.location.origin)) {
    return forceHttpsPublicOrigin(window.location.origin);
  }

  return PUBLIC_SITE_URL;
}

function forceHttpsPublicOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    if (!isLocalDevHost(parsed.origin) && parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }
    return parsed.origin;
  } catch {
    return url.replace(/\/$/, '');
  }
}

export function resolveAuthCallbackUrl(): string {
  return `${resolveSiteUrl()}/auth/callback`;
}

/** Password recovery emails redirect through the auth callback (same allowlist as OAuth). */
export function resolvePasswordResetUrl(): string {
  return resolveAuthCallbackUrl();
}

export function normalizeLocalDevProtocol(url: string): string {
  try {
    const parsed = new URL(url);
    const isLocalDev =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]';

    if (isLocalDev && parsed.protocol === 'https:') {
      parsed.protocol = 'http:';
      return parsed.origin;
    }

    return parsed.origin;
  } catch {
    return url.replace(/\/$/, '').replace(/^https:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i, 'http://$1');
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

  return (
    window.location.pathname === '/auth/callback' ||
    window.location.pathname === '/auth/reset-password'
  );
}
