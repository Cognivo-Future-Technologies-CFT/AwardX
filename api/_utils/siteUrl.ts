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

export function resolveServerPasswordResetUrl(origin?: string | null): string {
  return `${resolveServerSiteUrl(origin)}/auth/callback`;
}
