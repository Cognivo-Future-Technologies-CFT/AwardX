const DEFAULT_DIDIT_BASE = 'https://verification.didit.me';

const ALLOWED_DIDIT_HOSTS = new Set([
  'verification.didit.me',
  'api.didit.me',
]);

export function resolveDiditApiBaseUrl(configured?: string | null): string {
  const raw = (configured || process.env.DIDIT_API_BASE_URL || DEFAULT_DIDIT_BASE).trim();
  if (!raw) return DEFAULT_DIDIT_BASE;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return DEFAULT_DIDIT_BASE;
    if (!ALLOWED_DIDIT_HOSTS.has(url.hostname.toLowerCase())) return DEFAULT_DIDIT_BASE;
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return DEFAULT_DIDIT_BASE;
  }
}
