import { auth } from './supabase';

const envBackendUrl = (import.meta.env.VITE_BACKEND_URL || '').trim();
const normalizedBackendUrl = envBackendUrl.replace(/\/$/, '');

export interface OverviewApiRequestTrace {
  path: string;
  url: string;
  method: 'GET';
  requireAuth: boolean;
  attempt: number;
  startedAt: string;
  finishedAt: string;
  status: number | null;
  ok: boolean;
  error: string | null;
}

type TraceCallback = (trace: OverviewApiRequestTrace) => void;

async function fetchJson(path: string, requireAuth = false, onTrace?: TraceCallback) {
  const candidateUrls = normalizedBackendUrl
    ? [`${normalizedBackendUrl}${path}`, path]
    : [path];

  let authToken: string | undefined;
  if (requireAuth) {
    const { session } = await auth.getSession();
    authToken = session?.access_token;
  }

  let lastError: Error | null = null;
  for (const [index, url] of candidateUrls.entries()) {
    const startedAt = new Date().toISOString();
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(requireAuth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        const errorMessage = body.error || `Overview API returned ${resp.status}`;
        onTrace?.({
          path,
          url,
          method: 'GET',
          requireAuth,
          attempt: index + 1,
          startedAt,
          finishedAt: new Date().toISOString(),
          status: resp.status,
          ok: false,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }

      onTrace?.({
        path,
        url,
        method: 'GET',
        requireAuth,
        attempt: index + 1,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: resp.status,
        ok: true,
        error: null,
      });

      return resp.json();
    } catch (error: any) {
      if (!(error instanceof Error && /^Overview API returned /.test(error.message))) {
        onTrace?.({
          path,
          url,
          method: 'GET',
          requireAuth,
          attempt: index + 1,
          startedAt,
          finishedAt: new Date().toISOString(),
          status: null,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error('Overview API request failed');
}

export async function getPublicOverviewBySlug(slug: string) {
  const response = await fetchJson(`/api/overview/public/by-slug/${encodeURIComponent(slug)}`);
  return response?.data || null;
}

export async function getPublicOverviewByProgramId(programId: string) {
  const response = await fetchJson(`/api/overview/public/${encodeURIComponent(programId)}`);
  return response?.data || null;
}

export async function getProgramMediaAssets(
  programId: string,
  options?: { onTrace?: TraceCallback },
) {
  const response = await fetchJson(`/api/overview/${encodeURIComponent(programId)}/media`, true, options?.onTrace);
  return response?.data || [];
}
