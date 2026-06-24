import { fetchBackendJson } from './backendApi';

export async function getPublicAnnouncements(programId: string): Promise<unknown> {
  return fetchBackendJson(
    `/api/announcements/programs/${encodeURIComponent(programId)}/public`,
    { errorPrefix: 'Announcements API' },
  );
}
