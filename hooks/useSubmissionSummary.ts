import { useQuery } from '@tanstack/react-query';
import {
  getSubmissionProcessing,
  getSimilarSubmissions,
  type SubmissionProcessingData,
  type SimilarSubmission,
} from '../services/submissionProcessingApi';
import type { Submission } from '../services/models';
import { queryKeys } from '../services/queryKeys';

interface UseSubmissionSummaryOpts {
  includeSimilar?: boolean;
  similarLimit?: number;
  judgeToken?: string;
}

interface SummaryState {
  processing: SubmissionProcessingData | null;
  similar: SimilarSubmission[];
  isLoading: boolean;
  error: string | null;
}

export function useSubmissionSummary(
  submission: Submission | null,
  opts: UseSubmissionSummaryOpts = {},
): SummaryState {
  const { includeSimilar = true, similarLimit = 5, judgeToken } = opts;
  const submissionId = submission?.id;

  const processingQuery = useQuery({
    queryKey: queryKeys.intelligence.processing(submissionId ?? '', judgeToken),
    queryFn: () => getSubmissionProcessing(submissionId!, { judgeToken }),
    enabled: !!submissionId,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === 'pending' || status === 'processing' ? 4000 : false;
    },
  });

  const processing = processingQuery.data ?? null;

  const similarQuery = useQuery({
    queryKey: queryKeys.intelligence.similar(submissionId ?? '', judgeToken, similarLimit),
    queryFn: () =>
      getSimilarSubmissions(submissionId!, {
        limit: similarLimit,
        scope: 'org',
        judgeToken,
      }),
    enabled:
      !!submissionId &&
      includeSimilar &&
      processing?.status === 'completed' &&
      !!processing?.summary,
    retry: false,
  });

  const isLoading =
    processingQuery.isLoading ||
    (!!submissionId && includeSimilar && processingQuery.isSuccess && similarQuery.isLoading);

  const error =
    processingQuery.error instanceof Error
      ? processingQuery.error.message
      : processingQuery.error
        ? 'Failed to load processing data'
        : null;

  return {
    processing,
    similar: similarQuery.data ?? [],
    isLoading,
    error,
  };
}
