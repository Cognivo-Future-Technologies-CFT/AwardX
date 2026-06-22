import { fetchBackendJson } from './backendApi';

export interface BroadcastLog {
  id: string;
  recipient_email: string;
  template_key: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed';
  error_message: string | null;
  resend_message_id: string | null;
  created_at: string;
  context_json: {
    roundTitle?: string;
    segment?: string;
    submissionId?: string;
    subject?: string;
    body?: string;
    recipientName?: string;
    submissionTitle?: string;
    [key: string]: any;
  };
}

export async function fetchBroadcastHistory(programId: string) {
  return fetchBackendJson<{ ok: boolean; logs: BroadcastLog[] }>(
    `/api/mass-email/${encodeURIComponent(programId)}/history`,
    { method: 'GET', requireAuth: true, errorPrefix: 'Broadcast History API' }
  );
}

export interface CustomBroadcastPayload {
  recipients: Array<{ email: string; name?: string; submissionTitle?: string }>;
  subject: string;
  template: string;
  fromName?: string;
  headerGradient?: string;
}

export async function sendCustomBroadcast(programId: string, payload: CustomBroadcastPayload) {
  return fetchBackendJson<{ ok: boolean; sent: number; failed: number; error?: string }>(
    `/api/mass-email/${encodeURIComponent(programId)}/send-custom`,
    {
      method: 'POST',
      requireAuth: true,
      body: payload,
      errorPrefix: 'Custom Broadcast API',
    }
  );
}
