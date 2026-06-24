import { fetchBackendJson } from './backendApi';

export async function submitJudgeScores(body: Record<string, unknown>): Promise<unknown> {
  return fetchBackendJson('/api/scores/judge-submit', {
    method: 'POST',
    body,
    errorPrefix: 'Scores API',
  });
}
