import { useState, useEffect } from 'react';
import {
  getSubmissionProcessing,
  getSimilarSubmissions,
  type SubmissionProcessingData,
  type SimilarSubmission,
} from '../services/submissionProcessingApi';
import type { Submission } from '../services/models';

interface UseSubmissionSummaryOpts {
  /** Fetch similar submissions within the organization */
  includeSimilar?: boolean;
  similarLimit?: number;
  /** Judge portal invite token (bypasses org auth) */
  judgeToken?: string;
}

interface SummaryState {
  processing: SubmissionProcessingData | null;
  similar: SimilarSubmission[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches server-processed submission intelligence (summary, AI detection,
 * embeddings metadata). Results are computed once on the server and stored —
 * never recomputed on the client.
 */
export function useSubmissionSummary(
  submission: Submission | null,
  opts: UseSubmissionSummaryOpts = {},
): SummaryState {
  const { includeSimilar = true, similarLimit = 5, judgeToken } = opts;
  const [state, setState] = useState<SummaryState>({
    processing: null,
    similar: [],
    isLoading: false,
    error: null,
  });

  const submissionId = submission?.id;

  useEffect(() => {
    if (!submissionId) {
      setState({ processing: null, similar: [], isLoading: false, error: null });
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const processing = await getSubmissionProcessing(submissionId, { judgeToken });
        if (cancelled) return;

        let similar: SimilarSubmission[] = [];
        if (
          includeSimilar &&
          processing.status === 'completed' &&
          processing.summary
        ) {
          try {
            similar = await getSimilarSubmissions(submissionId, {
              limit: similarLimit,
              scope: 'org',
              judgeToken,
            });
          } catch {
            // Similarity is optional — don't fail the whole hook
          }
        }

        if (cancelled) return;

        setState({ processing, similar, isLoading: false, error: null });

        if (
          processing.status === 'pending' ||
          processing.status === 'processing'
        ) {
          pollTimer = setTimeout(load, 4000);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load processing data';
        setState({ processing: null, similar: [], isLoading: false, error: msg });
      }
    };

    load();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [submissionId, includeSimilar, similarLimit, judgeToken]);

  return state;
}
