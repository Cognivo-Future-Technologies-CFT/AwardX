/** Public production origin used in outbound emails. */
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
 * Site origin for email CTAs.
 * Only trusts SITE_URL when it is a real public host — never VITE_SITE_URL/FRONTEND_URL
 * (those are often left as localhost in deploy envs).
 */
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
  // ponytail: hard default so misconfigured Railway envs cannot leak localhost into mail
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
