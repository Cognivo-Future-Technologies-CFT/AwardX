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

/** Site origin for email CTAs — skips localhost env values. */
export function resolveEmailSiteUrl(): string {
  for (const raw of [process.env.SITE_URL, process.env.VITE_SITE_URL, process.env.FRONTEND_URL]) {
    const configured = (raw || '').split(',')[0].trim().replace(/\/$/, '');
    if (configured && !isLocalDevHost(configured)) {
      return configured;
    }
  }
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
