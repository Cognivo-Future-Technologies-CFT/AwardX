/**
 * DIDIT KYC — uses organization integration from Settings → Integrations.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabase.js';
import { getDiditForProgram } from '../lib/orgDidit.js';
import { resolveDiditApiBaseUrl } from '../lib/diditUrl.js';
import { canAccessProgram } from '../middleware/programAccess.js';
import { sanitizeRedirectPath } from '../lib/safeRedirect.js';

const router = Router();

function getSiteUrl(req: { headers?: Record<string, string | string[] | undefined> }) {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : '';
  return (process.env.SITE_URL || process.env.VITE_SITE_URL || origin || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
}

router.post('/didit/start', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { program_id: programId, return_url: returnUrl } = req.body || {};
  const userId = req.userId;

  if (!programId || !userId) {
    return res.status(400).json({ error: 'program_id is required' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: program } = await supabase
      .from('programs')
      .select('id, title, kyc_enabled, organization_id')
      .eq('id', programId)
      .single();

    if (!program) return res.status(404).json({ error: 'Program not found' });
    if (!program.kyc_enabled) {
      return res.status(400).json({ error: 'KYC is not enabled for this program' });
    }

    const permitted = await canAccessProgram(userId, programId);
    if (!permitted) {
      return res.status(403).json({ error: 'You do not have access to this program' });
    }

    const didit = await getDiditForProgram(programId);
    if (!didit.connected || !didit.apiKey) {
      return res.status(400).json({
        error: 'DIDIT is not connected. Set up DIDIT in Settings → Integrations first.',
      });
    }

    const sessionId = crypto.randomBytes(16).toString('hex');
    const callbackUrl = `${getSiteUrl(req)}/api/kyc/didit/callback?session=${sessionId}`;

    let verificationUrl: string | null = null;

    try {
      const apiBaseUrl = resolveDiditApiBaseUrl(didit.apiBaseUrl);
      const response = await fetch(`${apiBaseUrl}/v2/session/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': didit.apiKey,
        },
        body: JSON.stringify({
          vendor_data: userId,
          callback: callbackUrl,
          features: ['OCR', 'LIVENESS'],
        }),
      });

      if (response.ok) {
        const body = (await response.json()) as { url?: string; session_id?: string };
        verificationUrl = body.url || null;
        if (body.session_id) {
          await supabase.from('kyc_verifications').upsert(
            {
              program_id: programId,
              user_id: userId,
              provider: 'didit',
              status: 'pending',
              provider_session_id: body.session_id,
              metadata: { return_url: returnUrl || null },
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'program_id,user_id' },
          );
        }
      }
    } catch (err) {
      console.warn('[kyc] DIDIT session create failed:', err);
    }

    if (!verificationUrl) {
      await supabase.from('kyc_verifications').upsert(
        {
          program_id: programId,
          user_id: userId,
          provider: 'didit',
          status: 'pending',
          provider_session_id: sessionId,
          metadata: { return_url: returnUrl || null, demo_mode: true },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'program_id,user_id' },
      );
      verificationUrl = `${getSiteUrl(req)}/api/kyc/didit/demo-complete?session=${sessionId}&program_id=${programId}`;
    }

    return res.json({
      data: {
        verification_url: verificationUrl,
        session_id: sessionId,
        provider: 'didit',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.get('/didit/demo-complete', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_KYC_DEMO !== 'true') {
    return res.status(404).send('Not found');
  }

  const session = String(req.query.session || '');
  const programId = String(req.query.program_id || '');
  const userId = req.userId;

  if (!session || !programId || !userId) {
    return res.status(400).send('Invalid session');
  }

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('kyc_verifications').upsert(
      {
        program_id: programId,
        user_id: userId,
        provider: 'didit',
        status: 'verified',
        provider_session_id: session,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { demo_mode: true },
      },
      { onConflict: 'program_id,user_id' },
    );

    const { data: row } = await supabase
      .from('kyc_verifications')
      .select('metadata')
      .eq('program_id', programId)
      .eq('user_id', userId)
      .single();

    const returnTarget = sanitizeRedirectPath(
      (row?.metadata as { return_url?: string })?.return_url,
      `${getSiteUrl(req)}/dashboard`,
    );

    return res.redirect(`${returnTarget}${returnTarget.includes('?') ? '&' : '?'}kyc=verified`);
  } catch (error: any) {
    return res.status(500).send(error?.message || 'KYC completion failed');
  }
});

router.get('/status/:programId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { programId } = req.params;
  const userId = req.userId;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const permitted = await canAccessProgram(userId, programId);
    if (!permitted) {
      return res.status(403).json({ error: 'You do not have access to this program' });
    }

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('kyc_verifications')
      .select('status, verified_at, provider')
      .eq('program_id', programId)
      .eq('user_id', userId)
      .maybeSingle();

    return res.json({
      data: data || { status: 'none', provider: 'didit' },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected server error' });
  }
});

router.post('/didit/webhook', async (req, res) => {
  const payload = req.body || {};
  const sessionId = payload.session_id || payload.id;
  const status = String(payload.status || '').toLowerCase();

  if (!sessionId) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from('kyc_verifications')
      .select('id, program_id')
      .eq('provider_session_id', sessionId)
      .maybeSingle();

    if (!existing?.program_id) {
      return res.status(404).json({ error: 'Unknown verification session' });
    }

    const didit = await getDiditForProgram(existing.program_id);
    const webhookSecret = didit.webhookSecret;
    const signatureHeader =
      (typeof req.headers['x-signature'] === 'string' && req.headers['x-signature']) ||
      (typeof req.headers['x-didit-signature'] === 'string' && req.headers['x-didit-signature']) ||
      (typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '');

    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'Webhook verification is not configured' });
      }
    } else if (signatureHeader !== webhookSecret) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const mappedStatus =
      status === 'approved' || status === 'verified' || status === 'completed'
        ? 'verified'
        : status === 'declined' || status === 'rejected'
          ? 'failed'
          : 'pending';

    if (existing) {
      await supabase
        .from('kyc_verifications')
        .update({
          status: mappedStatus,
          verified_at: mappedStatus === 'verified' ? new Date().toISOString() : null,
          metadata: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Webhook processing failed' });
  }
});

export default router;
