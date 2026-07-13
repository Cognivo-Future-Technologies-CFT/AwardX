/** Public production origin used in outbound emails when local/dev URLs would be useless. */
export const PUBLIC_SITE_URL = 'https://www.awardx.one';

function normalizeLocalDevProtocol(url: string): string {
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

export function isLocalDevHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return /localhost|127\.0\.0\.1|\[::1\]/i.test(url);
  }
}

export function resolveServerSiteUrl(origin?: string | null): string {
  const configured = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').trim().replace(/\/$/, '');
  if (configured) {
    return normalizeLocalDevProtocol(configured);
  }

  if (origin && typeof origin === 'string') {
    return normalizeLocalDevProtocol(origin);
  }

  return 'http://localhost:3000';
}

/** Site origin for email CTAs — skips localhost env values and request origins. */
export function resolveEmailSiteUrl(): string {
  const configured = (process.env.SITE_URL || '').trim().replace(/\/$/, '');
  if (configured && !isLocalDevHost(configured)) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === 'http:') parsed.protocol = 'https:';
      return parsed.origin;
    } catch {
      return configured;
    }
  }
  // ponytail: hard default so misconfigured deploy envs cannot leak localhost into mail
  return PUBLIC_SITE_URL;
}

/** Prefer a caller-provided URL unless it points at local/dev; rewrite path onto the public site. */
export function resolveEmailActionUrl(passedUrl: string | undefined | null, fallbackPath = ''): string {
  const siteUrl = resolveEmailSiteUrl();
  if (passedUrl) {
    try {
      const parsed = new URL(passedUrl);
      if (!isLocalDevHost(passedUrl)) {
        return passedUrl;
      }
      return `${siteUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      // fall through to site + path
    }
  }
  const path = fallbackPath.startsWith('/') || !fallbackPath ? fallbackPath : `/${fallbackPath}`;
  return `${siteUrl}${path}`;
}

export function resolveServerPasswordResetUrl(origin?: string | null): string {
  return `${resolveServerSiteUrl(origin)}/auth/callback`;
}
