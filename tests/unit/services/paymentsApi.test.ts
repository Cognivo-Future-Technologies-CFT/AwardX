import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCheckoutSession,
  getStripeConnectStartUrl,
  getStripeConnectStatus,
  verifyRazorpayPayment,
  verifyStripePayment,
} from '../../../services/paymentsApi';

const fetchBackendJson = vi.fn();
const resolveBackendPath = vi.fn();

vi.mock('../../../services/backendApi', () => ({
  fetchBackendJson: (...args: unknown[]) => fetchBackendJson(...args),
  resolveBackendPath: (path: string) => resolveBackendPath(path),
}));

describe('paymentsApi', () => {
  beforeEach(() => {
    fetchBackendJson.mockReset();
    resolveBackendPath.mockReset();
    resolveBackendPath.mockImplementation((path: string) => `https://api.test${path}`);
  });

  it('createCheckoutSession posts to payments create-checkout', async () => {
    const body = { submissionId: 'sub-1', programId: 'prog-1' };
    fetchBackendJson.mockResolvedValue({ provider: 'stripe', url: 'https://checkout' });

    await expect(createCheckoutSession(body)).resolves.toEqual({
      provider: 'stripe',
      url: 'https://checkout',
    });
    expect(fetchBackendJson).toHaveBeenCalledWith('/api/payments/create-checkout', {
      method: 'POST',
      body,
      errorPrefix: 'Payments API',
    });
  });

  it('verifyStripePayment posts verification payload', async () => {
    const body = { sessionId: 'sess_1', submissionId: 'sub-1' };
    fetchBackendJson.mockResolvedValue({ ok: true });

    await verifyStripePayment(body);

    expect(fetchBackendJson).toHaveBeenCalledWith('/api/payments/stripe-verify', {
      method: 'POST',
      body,
      errorPrefix: 'Payments API',
    });
  });

  it('verifyRazorpayPayment posts verification payload', async () => {
    const body = { submissionId: 'sub-1', razorpayPaymentId: 'pay_1' };
    fetchBackendJson.mockResolvedValue({ ok: true });

    await verifyRazorpayPayment(body);

    expect(fetchBackendJson).toHaveBeenCalledWith('/api/payments/razorpay-verify', {
      method: 'POST',
      body,
      errorPrefix: 'Payments API',
    });
  });

  it('getStripeConnectStatus encodes program id in query string', async () => {
    fetchBackendJson.mockResolvedValue({ connected: true });

    await getStripeConnectStatus('prog id');

    expect(fetchBackendJson).toHaveBeenCalledWith(
      '/api/payments/stripe-connect-status?programId=prog%20id',
      { errorPrefix: 'Payments API' },
    );
  });

  it('getStripeConnectStartUrl delegates to resolveBackendPath', () => {
    const url = getStripeConnectStartUrl('prog-1');

    expect(resolveBackendPath).toHaveBeenCalledWith(
      '/api/payments/stripe-connect-start?programId=prog-1',
    );
    expect(url).toBe('https://api.test/api/payments/stripe-connect-start?programId=prog-1');
  });
});
