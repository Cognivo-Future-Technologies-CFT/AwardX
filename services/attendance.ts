import { fetchBackendJson } from './backendApi';

export interface AttendanceRecord {
  id: string;
  program_id: string;
  name: string;
  email: string;
  qr_code_token: string;
  status: 'pending' | 'present' | 'absent';
  marked_at: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanResult {
  ok: boolean;
  participant: {
    name: string;
    email: string;
    status: string;
    markedAt: string;
  };
  programTitle: string;
}

export async function getAttendanceList(programId: string): Promise<AttendanceRecord[]> {
  const resp = await fetchBackendJson<{ ok: boolean; data: AttendanceRecord[] }>(
    `/api/attendance/program/${programId}`,
    { requireAuth: true }
  );
  return resp.data || [];
}

export async function addParticipant(programId: string, name: string, email: string): Promise<AttendanceRecord> {
  const resp = await fetchBackendJson<{ ok: boolean; data: AttendanceRecord }>(
    `/api/attendance/program/${programId}/add`,
    {
      method: 'POST',
      body: { name, email },
      requireAuth: true
    }
  );
  return resp.data;
}

export async function syncFromSubmissions(programId: string): Promise<{ syncedCount: number; message: string }> {
  return fetchBackendJson<{ syncedCount: number; message: string }>(
    `/api/attendance/program/${programId}/sync`,
    {
      method: 'POST',
      requireAuth: true
    }
  );
}

export async function deleteParticipant(id: string): Promise<void> {
  await fetchBackendJson<void>(
    `/api/attendance/record/${id}`,
    {
      method: 'DELETE',
      requireAuth: true
    }
  );
}

export async function sendQrPass(id: string): Promise<void> {
  await fetchBackendJson<void>(
    `/api/attendance/record/${id}/send-qr`,
    {
      method: 'POST',
      requireAuth: true
    }
  );
}

export async function sendBulkQrPasses(programId: string): Promise<{ message: string }> {
  return fetchBackendJson<{ message: string }>(
    `/api/attendance/program/${programId}/send-qr-all`,
    {
      method: 'POST',
      requireAuth: true
    }
  );
}

export async function scanParticipantQr(token: string): Promise<ScanResult> {
  return fetchBackendJson<ScanResult>(
    `/api/attendance/scan`,
    {
      method: 'POST',
      body: { token },
      requireAuth: true
    }
  );
}
