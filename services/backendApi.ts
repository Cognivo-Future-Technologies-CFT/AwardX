import { getAccessToken } from './userContext';

const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/$/, '');

/** URLs to try: absolute backend (if configured), then same-origin relative path. */
export function getBackendCandidateUrls(path: string): string[] {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return envBackendUrl
    ? [`${envBackendUrl}${normalizedPath}`, normalizedPath]
    : [normalizedPath];
}

export async function getAuthToken(): Promise<string | undefined> {
  return getAccessToken();
}

export type FetchBackendOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  requireAuth?: boolean;
  headers?: Record<string, string>;
  errorPrefix?: string;
};

export async function fetchBackendJson<T = unknown>(
  path: string,
  options: FetchBackendOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    requireAuth = false,
    headers: extraHeaders = {},
    errorPrefix = 'API',
  } = options;

  const candidateUrls = getBackendCandidateUrls(path);

  let authToken: string | undefined;
  if (requireAuth) {
    authToken = await getAuthToken();
    if (!authToken) {
      throw new Error('Authentication required');
    }
  }

  let lastError: Error | null = null;

  for (const url of candidateUrls) {
    try {
      const resp = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...extraHeaders,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (!resp.ok) {
        const parsed = await resp.json().catch(() => ({}));
        let message =
          (parsed as { error?: string })?.error || `${errorPrefix} returned ${resp.status}`;
        if (parsed && typeof parsed === 'object' && parsed.fields && typeof parsed.fields === 'object') {
          const fieldMsgs = Object.values(parsed.fields).join(', ');
          if (fieldMsgs) {
            message = `${message}: ${fieldMsgs}`;
          }
        }
        lastError = new Error(message);
        continue;
      }

      const responseText = await resp.text();
      if (!responseText.trim()) {
        return {} as T;
      }

      return JSON.parse(responseText) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error(`${errorPrefix} request failed`);
}

/** Build a single URL for callers that only need one attempt (prefer relative in dev). */
export function resolveBackendPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return envBackendUrl ? `${envBackendUrl}${normalizedPath}` : normalizedPath;
}
