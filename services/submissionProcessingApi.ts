import { fetchBackendJson } from './backendApi';

export interface SubmissionProcessingData {
  submissionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  summary: string | null;
  summaryConfidence: number | null;
  summaryMode: string | null;
  aiPercentage: number | null;
  aiConfidence: number | null;
  aiModel: string | null;
  metadata: Record<string, unknown>;
  error: string | null;
  processedAt: string | null;
}

export interface SimilarSubmission {
  submissionId: string;
  similarity: number;
  chunkText: string;
  title: string;
  applicantName: string;
  programId?: string;
}

export async function getSubmissionProcessing(
  submissionId: string,
  options?: { judgeToken?: string },
): Promise<SubmissionProcessingData> {
  const params = new URLSearchParams();
  if (options?.judgeToken) params.set('judgeToken', options.judgeToken);
  const qs = params.toString();

  const resp = await fetchBackendJson<{ data: SubmissionProcessingData }>(
    `/api/submissions/${encodeURIComponent(submissionId)}/processing${qs ? `?${qs}` : ''}`,
    { requireAuth: !options?.judgeToken, errorPrefix: 'Processing API' },
  );
  return resp.data;
}

export async function triggerSubmissionProcessing(
  submissionId: string,
): Promise<void> {
  await fetchBackendJson(
    `/api/submissions/${encodeURIComponent(submissionId)}/trigger`,
    { method: 'POST', errorPrefix: 'Processing API' },
  );
}

export async function getSimilarSubmissions(
  submissionId: string,
  options?: { limit?: number; scope?: 'org' | 'program'; judgeToken?: string },
): Promise<SimilarSubmission[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.scope) params.set('scope', options.scope);
  if (options?.judgeToken) params.set('judgeToken', options.judgeToken);
  const qs = params.toString();

  const resp = await fetchBackendJson<{ data: SimilarSubmission[] }>(
    `/api/submissions/${encodeURIComponent(submissionId)}/similar${qs ? `?${qs}` : ''}`,
    { requireAuth: !options?.judgeToken, errorPrefix: 'Similarity API' },
  );
  return resp.data || [];
}
