import { fetchBackendJson } from './backendApi';

export type IntegrationStatus = {
  resend: {
    connected: boolean;
    source: 'organization' | null;
    from?: string | null;
    fromEmail?: string | null;
    fromName?: string | null;
    connectedAt?: string | null;
    projectName?: string | null;
  };
  didit: {
    connected: boolean;
    source: 'organization' | null;
    apiBaseUrl?: string | null;
    connectedAt?: string | null;
    hasWebhookSecret?: boolean;
  };
};

export type ResendDomain = {
  id: string;
  name: string;
  status: string;
};

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  return fetchBackendJson<IntegrationStatus>('/api/integrations/status', {
    requireAuth: true,
    errorPrefix: 'Integrations',
  });
}

export async function startRazorpayOAuth(programId: string): Promise<{ authUrl: string }> {
  return fetchBackendJson<{ authUrl: string }>(
    `/api/integrations/razorpay/oauth/start?programId=${encodeURIComponent(programId)}`,
    { requireAuth: true, errorPrefix: 'Razorpay OAuth' },
  );
}

export async function startResendConnectSession(): Promise<{
  state: string;
  loginUrl: string;
  apiKeysUrl: string;
}> {
  return fetchBackendJson('/api/integrations/resend/session', {
    method: 'POST',
    requireAuth: true,
    errorPrefix: 'Resend session',
  });
}

export async function listResendDomains(
  state: string,
  bootstrapKey: string,
): Promise<{ domains: ResendDomain[] }> {
  return fetchBackendJson('/api/integrations/resend/domains', {
    method: 'POST',
    body: { state, bootstrapKey },
    requireAuth: true,
    errorPrefix: 'Resend domains',
  });
}

export async function provisionResendApiKey(input: {
  state: string;
  bootstrapKey: string;
  domainId: string;
  domainName: string;
}): Promise<{ apiKey: string; apiKeyId: string; domainName: string }> {
  return fetchBackendJson('/api/integrations/resend/provision', {
    method: 'POST',
    body: input,
    requireAuth: true,
    errorPrefix: 'Resend provision',
  });
}

export async function connectResend(payload: {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  domainName?: string;
  state?: string;
}): Promise<{ ok: boolean; resend: IntegrationStatus['resend'] }> {
  return fetchBackendJson('/api/integrations/resend/connect', {
    method: 'POST',
    body: payload,
    requireAuth: true,
    errorPrefix: 'Resend connect',
  });
}

export async function disconnectResend(): Promise<{
  ok: boolean;
  resend: IntegrationStatus['resend'];
}> {
  return fetchBackendJson('/api/integrations/resend/disconnect', {
    method: 'POST',
    requireAuth: true,
    errorPrefix: 'Resend disconnect',
  });
}

export async function connectDidit(payload: {
  apiKey: string;
  apiBaseUrl?: string;
  webhookSecret?: string;
}): Promise<{ ok: boolean; didit: IntegrationStatus['didit'] }> {
  return fetchBackendJson('/api/integrations/didit/connect', {
    method: 'POST',
    body: payload,
    requireAuth: true,
    errorPrefix: 'DIDIT connect',
  });
}

export async function disconnectDidit(): Promise<{
  ok: boolean;
  didit: IntegrationStatus['didit'];
}> {
  return fetchBackendJson('/api/integrations/didit/disconnect', {
    method: 'POST',
    requireAuth: true,
    errorPrefix: 'DIDIT disconnect',
  });
}
