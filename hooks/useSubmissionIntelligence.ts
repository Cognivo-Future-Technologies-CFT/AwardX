import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSubmissionIntelligence,
  refreshSubmissionFootprints,
  type SubmissionIntelligence,
} from '../services/personIntelligenceApi';
import { queryKeys } from '../services/queryKeys';

interface UseSubmissionIntelligenceResult {
  data: SubmissionIntelligence | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSubmissionIntelligence(
  submissionId: string | null,
  options?: { enabled?: boolean; judgeToken?: string; pollWhileProcessing?: boolean },
): UseSubmissionIntelligenceResult {
  const enabled = options?.enabled !== false && !!submissionId;
  const judgeToken = options?.judgeToken;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.intelligence.submission(submissionId ?? '', judgeToken),
    queryFn: () => getSubmissionIntelligence(submissionId!, { judgeToken }),
    enabled,
    refetchInterval: (q) => {
      if (!options?.pollWhileProcessing) return false;
      const status = q.state.data?.processingStatus;
      return status === 'processing' || status === 'pending' ? 5000 : false;
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await refreshSubmissionFootprints(submissionId!, { judgeToken });
      return getSubmissionIntelligence(submissionId!, { judgeToken });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.intelligence.submission(submissionId ?? '', judgeToken),
        data,
      );
    },
  });

  const refresh = useCallback(async () => {
    if (!submissionId) return;
    await refreshMutation.mutateAsync();
  }, [submissionId, refreshMutation]);

  const activeError = refreshMutation.error ?? query.error;
  const errorMessage =
    activeError instanceof Error
      ? activeError.message
      : activeError
        ? 'Failed to load intelligence data'
        : null;

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isRefreshing: refreshMutation.isPending,
    error: errorMessage,
    refresh,
  };
}
