import { fetchBackendJson, resolveBackendPath } from './backendApi';

export async function createCheckoutSession(body: Record<string, unknown>): Promise<unknown> {
  return fetchBackendJson('/api/payments/create-checkout', {
    method: 'POST',
    body,
    errorPrefix: 'Payments API',
  });
}

export async function verifyStripePayment(body: Record<string, unknown>): Promise<unknown> {
  return fetchBackendJson('/api/payments/stripe-verify', {
    method: 'POST',
    body,
    errorPrefix: 'Payments API',
  });
}

export async function verifyRazorpayPayment(body: Record<string, unknown>): Promise<unknown> {
  return fetchBackendJson('/api/payments/razorpay-verify', {
    method: 'POST',
    body,
    errorPrefix: 'Payments API',
  });
}

export async function getStripeConnectStatus(programId: string): Promise<unknown> {
  return fetchBackendJson(
    `/api/payments/stripe-connect-status?programId=${encodeURIComponent(programId)}`,
    { errorPrefix: 'Payments API' },
  );
}

export function getStripeConnectStartUrl(programId: string): string {
  return resolveBackendPath(
    `/api/payments/stripe-connect-start?programId=${encodeURIComponent(programId)}`,
  );
}
