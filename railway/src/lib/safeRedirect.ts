export function sanitizeRedirectPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || typeof raw !== 'string') return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('\\')) return fallback;

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (!path.startsWith('/') || path.startsWith('//')) return fallback;

  return path;
}
