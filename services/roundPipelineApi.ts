import type { AdvancementCriteria } from '../types/scheduleRounds';
import { fetchBackendJson } from './backendApi';

export type AdvancementPreviewParticipant = {
  submissionId: string;
  title: string;
  applicantName: string;
  score: number;
  rank: number;
  voteCount?: number;
};

export type AdvancementPreview = {
  paused?: boolean;
  reason?: string;
  advancing: AdvancementPreviewParticipant[];
  eliminated: AdvancementPreviewParticipant[];
  ties: AdvancementPreviewParticipant[];
  hasEmptyScores?: boolean;
  totalParticipants?: number;
};

async function postRoundAction(path: string) {
  return fetchBackendJson<{ ok: boolean; error?: string }>(path, {
    method: 'POST',
    requireAuth: true,
    errorPrefix: 'Round API',
  });
}

export async function activateRound(roundId: string) {
  return postRoundAction(`/api/execution/rounds/${encodeURIComponent(roundId)}/activate`);
}

export async function completeRound(roundId: string) {
  return postRoundAction(`/api/execution/rounds/${encodeURIComponent(roundId)}/complete`);
}

export async function promoteRound(roundId: string) {
  return fetchBackendJson<{ ok: boolean; enrolled?: number; error?: string }>(
    `/api/execution/rounds/${encodeURIComponent(roundId)}/promote`,
    { method: 'POST', requireAuth: true, errorPrefix: 'Round API' },
  );
}

export async function previewAdvancement(roundId: string, criteriaOverride?: AdvancementCriteria) {
  const response = await fetchBackendJson<{ data: AdvancementPreview }>(
    `/api/advancement/rounds/${encodeURIComponent(roundId)}/preview`,
    {
      method: 'POST',
      requireAuth: true,
      body: criteriaOverride ? { criteriaOverride } : {},
      errorPrefix: 'Advancement API',
    },
  );
  return response.data;
}

export async function executeAdvancement(
  roundId: string,
  options?: {
    criteriaOverride?: AdvancementCriteria;
    overrides?: Array<{ submissionId: string; action: 'advance' | 'eliminate'; reason?: string }>;
    tieResolutions?: Array<{ submissionId: string; action: 'advance' | 'eliminate' }>;
    targetRoundId?: string;
  },
) {
  const response = await fetchBackendJson<{ data: { ok: boolean; error?: string } }>(
    `/api/advancement/rounds/${encodeURIComponent(roundId)}/execute`,
    {
      method: 'POST',
      requireAuth: true,
      body: {
        criteriaOverride: options?.criteriaOverride,
        overrides: options?.overrides,
        tieResolutions: options?.tieResolutions,
        targetRoundId: options?.targetRoundId,
      },
      errorPrefix: 'Advancement API',
    },
  );
  return response.data;
}
