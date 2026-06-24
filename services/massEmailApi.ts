import { fetchBackendJson } from './backendApi';

export type EmailRound = {
  id: string;
  title: string;
  status: string;
};

export type EmailRecipient = {
  submissionId: string;
  submissionTitle: string;
  applicantName: string;
  applicantEmail: string | null;
  status: string;
};

export type EmailSegmentData = {
  round: { id: string; title: string; type: string; status: string };
  segments: { winners: EmailRecipient[]; eliminated: EmailRecipient[]; active: EmailRecipient[] };
  counts: { winners: number; eliminated: number; active: number; total: number };
};

export async function getRoundsForEmail(programId: string): Promise<EmailRound[]> {
  const response = await fetchBackendJson<{ data?: EmailRound[]; rounds?: EmailRound[] }>(
    `/api/schedule-rounds/${encodeURIComponent(programId)}/rounds`,
    {
      requireAuth: true,
      errorPrefix: 'Rounds API',
    },
  );
  return response.data || response.rounds || [];
}

export async function getEmailSegments(programId: string, roundId: string): Promise<EmailSegmentData> {
  const response = await fetchBackendJson<{ data: EmailSegmentData }>(
    `/api/mass-email/${encodeURIComponent(programId)}/rounds/${encodeURIComponent(roundId)}/segments`,
    {
      requireAuth: true,
      errorPrefix: 'Segments API',
    },
  );
  return response.data;
}
