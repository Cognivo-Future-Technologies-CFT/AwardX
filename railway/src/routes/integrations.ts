import { Router } from 'express';
import crypto from 'crypto';
import { Resend } from 'resend';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { canAccessProgram } from '../middleware/programAccess.js';
import { ensureCanManageProgram } from '../middleware/programManagement.js';
import { getSupabaseAdmin } from '../supabase.js';
import {
  buildIntegrationStatusEntry,
  getProgramIntegrationContext,
  mergeIntegrationSources,
  normalizeIntegrationSources,
  type IntegrationProvider,
} from '../lib/programIntegrations.js';

const router = Router();

const SESSION_TTL_MS = 30 * 60 * 1000;

function getSiteUrl(req: { headers?: Record<string, string | string[] | undefined> }): string {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : '';
  return (process.env.SITE_URL || process.env.VITE_SITE_URL || origin || 'http://localhost:3000').replace(/\/$/, '');
}

function getRazorpayRedirectUri(siteUrl: string): string {
  return process.env.RAZORPAY_OAUTH_REDIRECT_URI || `${siteUrl}/api/integrations/razorpay/oauth/callback`;
}

/** Sending-only keys cannot call domains.list(); that is expected for provisioned AwardX keys. */
async function verifyResendApiKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = new Resend(apiKey);
  const { error } = await resend.domains.list();

  if (!error) {
    return { ok: true };
  }

  const message = error.message || 'Invalid Resend API key';
  if (/restricted to only send/i.test(message)) {
    return { ok: true };
  }

  return { ok: false, error: message };
}

async function getUserOrganizationId(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();
  return profile?.organization_id || null;
}

async function createConnectSession(input: {
  userId: string;
  organizationId: string | null;
  provider: 'razorpay' | 'resend';
  programId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const state = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { error } = await supabase.from('integration_connect_sessions').insert({
    user_id: input.userId,
    organization_id: input.organizationId,
    provider: input.provider,
    state,
    program_id: input.programId || null,
    step: 'started',
    payload: input.payload || {},
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message || 'Failed to create connect session');
  }

  return state;
}

async function getConnectSession(state: string, provider: 'razorpay' | 'resend') {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('integration_connect_sessions')
    .select('*')
    .eq('state', state)
    .eq('provider', provider)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load connect session');
  }
  if (!data) {
    return null;
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }
  return data;
}

function redirectToSettings(
  res: any,
  siteUrl: string,
  params: Record<string, string>,
) {
  const search = new URLSearchParams({
    view: 'settings',
    tab: 'integrations',
    ...params,
  });
  res.redirect(`${siteUrl}/dashboard?${search.toString()}`);
}

router.get('/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const programId = typeof req.query.programId === 'string' ? req.query.programId : null;

    const emptyStatus = {
      resend: { connected: false, source: null, sourceProgramId: null, sourceProgramTitle: null },
      didit: { connected: false, source: null, sourceProgramId: null, sourceProgramTitle: null },
      payment: { connected: false, source: 'self', sourceProgramId: null, sourceProgramTitle: null, provider: null },
    };

    let organizationId: string | null = null;

    if (programId) {
      const permitted = await canAccessProgram(userId, programId);
      if (!permitted) {
        return res.status(403).json({ error: 'You do not have access to this program' });
      }
      const programContext = await getProgramIntegrationContext(programId);
      if (!programContext) {
        return res.json(emptyStatus);
      }
      organizationId = programContext.organizationId;
    } else {
      organizationId = await getUserOrganizationId(userId);
    }

    if (!organizationId) {
      return res.json(emptyStatus);
    }

    const supabase = getSupabaseAdmin();
    const { data: resendRow } = await supabase
      .from('organization_integrations')
      .select('connected, config, connected_at, api_key_encrypted')
      .eq('organization_id', organizationId)
      .eq('provider', 'resend')
      .maybeSingle();

    const { data: diditRow } = await supabase
      .from('organization_integrations')
      .select('connected, config, connected_at, api_key_encrypted')
      .eq('organization_id', organizationId)
      .eq('provider', 'didit')
      .maybeSingle();

    const orgResendConnected = !!resendRow?.connected && !!resendRow?.api_key_encrypted;
    const resendConfig = (resendRow?.config || {}) as Record<string, string>;
    const diditConfig = (diditRow?.config || {}) as Record<string, string>;
    const orgDiditConnected = !!diditRow?.connected && !!diditRow?.api_key_encrypted;

    let sources = normalizeIntegrationSources({});
    let programTitle = '';

    if (programId) {
      const context = await getProgramIntegrationContext(programId);
      if (!context || context.organizationId !== organizationId) {
        return res.json(emptyStatus);
      }
      sources = context.sources;
      programTitle = context.title;
    }

    let paymentSelfPayload: Record<string, unknown> = {
      connected: false,
      provider: null,
      publicKey: null,
    };

    if (programId) {
      const paymentSourceProgramId = sources.payment || programId;
      const { data: paymentConfig } = await supabase
        .from('program_payment_configs')
        .select('provider, connected, public_key, enabled')
        .eq('program_id', paymentSourceProgramId)
        .maybeSingle();

      paymentSelfPayload = {
        connected: !!paymentConfig?.connected && !!paymentConfig?.enabled,
        provider: paymentConfig?.provider || null,
        publicKey: paymentConfig?.public_key || null,
      };
    }

    const [resend, didit, payment] = await Promise.all([
      buildIntegrationStatusEntry({
        provider: 'resend',
        sources,
        programTitle,
        orgConnected: orgResendConnected,
        orgPayload: {
          from: resendConfig.from || null,
          fromEmail: resendConfig.fromEmail || null,
          fromName: resendConfig.fromName || null,
          connectedAt: resendRow?.connected_at || null,
          projectName: resendConfig.domainName || null,
        },
      }),
      buildIntegrationStatusEntry({
        provider: 'didit',
        sources,
        programTitle,
        orgConnected: orgDiditConnected,
        orgPayload: {
          apiBaseUrl: diditConfig.apiBaseUrl || process.env.DIDIT_API_BASE_URL || 'https://verification.didit.me',
          connectedAt: diditRow?.connected_at || null,
          hasWebhookSecret: !!diditConfig.webhookSecret,
        },
      }),
      buildIntegrationStatusEntry({
        provider: 'payment',
        sources,
        programTitle,
        orgConnected: false,
        orgPayload: {},
        selfPayload: paymentSelfPayload,
      }),
    ]);

    return res.json({ resend, didit, payment });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to load integration status' });
  }
});

router.put('/program/:programId/sources', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const { programId } = req.params;
    if (!userId || !programId) {
      return res.status(400).json({ error: 'programId is required' });
    }

    const manageCheck = await ensureCanManageProgram(userId, programId);
    if (!manageCheck.ok) {
      return res.status(manageCheck.status).json({ error: manageCheck.error });
    }

    const supabase = getSupabaseAdmin();
    const context = await getProgramIntegrationContext(programId);
    if (!context) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const organizationId = context.organizationId;

    const patch = req.body?.integration_sources;
    if (!patch || typeof patch !== 'object') {
      return res.status(400).json({ error: 'integration_sources object is required' });
    }

    const providers: IntegrationProvider[] = ['resend', 'didit', 'payment'];
    const normalizedPatch: Partial<Record<IntegrationProvider, string | null>> = {};

    for (const provider of providers) {
      if (!(provider in patch)) continue;
      const value = patch[provider];
      if (value === null || value === '') {
        normalizedPatch[provider] = null;
        continue;
      }
      if (typeof value !== 'string') {
        return res.status(400).json({ error: `Invalid source for ${provider}` });
      }
      if (value === programId) {
        return res.status(400).json({ error: 'A program cannot inherit integrations from itself' });
      }

      const { data: sourceProgram } = await supabase
        .from('programs')
        .select('id, organization_id')
        .eq('id', value)
        .maybeSingle();

      if (!sourceProgram || sourceProgram.organization_id !== organizationId) {
        return res.status(400).json({ error: 'Source program must belong to the same organization' });
      }

      normalizedPatch[provider] = value;
    }

    const nextSources = mergeIntegrationSources(context.sources, normalizedPatch);

    const { data, error } = await supabase
      .from('programs')
      .update({ integration_sources: nextSources })
      .eq('id', programId)
      .select('id, integration_sources')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || 'Failed to update integration sources' });
    }

    return res.json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to update integration sources' });
  }
});

// ── Razorpay OAuth ───────────────────────────────────────────────────────────

router.get('/razorpay/oauth/start', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const programId = typeof req.query.programId === 'string' ? req.query.programId : '';
    const clientId = (process.env.RAZORPAY_OAUTH_CLIENT_ID || '').trim();
    const clientSecret = (process.env.RAZORPAY_OAUTH_CLIENT_SECRET || '').trim();

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!programId) {
      return res.status(400).json({ error: 'programId is required' });
    }
    if (!clientId || !clientSecret) {
      return res.status(503).json({
        error: 'Razorpay OAuth is not configured. Add RAZORPAY_OAUTH_CLIENT_ID and RAZORPAY_OAUTH_CLIENT_SECRET.',
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: program } = await supabase
      .from('programs')
      .select('id, organization_id')
      .eq('id', programId)
      .maybeSingle();

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId || organizationId !== program.organization_id) {
      return res.status(403).json({ error: 'You do not have access to this program' });
    }

    const siteUrl = getSiteUrl(req);
    const state = await createConnectSession({
      userId,
      organizationId,
      provider: 'razorpay',
      programId,
    });

    const redirectUri = encodeURIComponent(getRazorpayRedirectUri(siteUrl));
    const scopes = ['read_write'];
    const mode = (process.env.RAZORPAY_OAUTH_MODE || 'test').trim();
    const authUrl =
      `https://auth.razorpay.com/authorize?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${redirectUri}` +
      `&scope[]=${scopes.map((s) => encodeURIComponent(s)).join('&scope[]=')}` +
      `&state=${encodeURIComponent(state)}` +
      `&mode=${encodeURIComponent(mode)}`;

    if (req.query.redirect === '1') {
      return res.redirect(authUrl);
    }

    return res.json({ authUrl, state });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to start Razorpay OAuth' });
  }
});

router.get('/razorpay/oauth/callback', async (req, res) => {
  const siteUrl = getSiteUrl(req);
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

  if (oauthError) {
    redirectToSettings(res, siteUrl, { razorpay: 'error', message: oauthError });
    return;
  }

  if (!code || !state) {
    redirectToSettings(res, siteUrl, { razorpay: 'error', message: 'missing_code_or_state' });
    return;
  }

  try {
    const session = await getConnectSession(state, 'razorpay');
    if (!session?.program_id) {
      redirectToSettings(res, siteUrl, { razorpay: 'error', message: 'invalid_session' });
      return;
    }

    const clientId = (process.env.RAZORPAY_OAUTH_CLIENT_ID || '').trim();
    const clientSecret = (process.env.RAZORPAY_OAUTH_CLIENT_SECRET || '').trim();
    const mode = (process.env.RAZORPAY_OAUTH_MODE || 'test').trim();

    const tokenResponse = await fetch('https://auth.razorpay.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: getRazorpayRedirectUri(siteUrl),
        code: decodeURIComponent(code),
        mode,
      }),
    });

    const tokenPayload = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) {
      const message = (tokenPayload as { error?: { description?: string } })?.error?.description
        || (tokenPayload as { error_description?: string })?.error_description
        || 'token_exchange_failed';
      redirectToSettings(res, siteUrl, { razorpay: 'error', message });
      return;
    }

    const accessToken = (tokenPayload as { access_token?: string }).access_token || '';
    const publicToken = (tokenPayload as { public_token?: string }).public_token || '';
    const refreshToken = (tokenPayload as { refresh_token?: string }).refresh_token || '';
    const razorpayAccountId = (tokenPayload as { razorpay_account_id?: string }).razorpay_account_id || '';
    const expiresIn = Number((tokenPayload as { expires_in?: number }).expires_in || 0);

    if (!accessToken || !publicToken) {
      redirectToSettings(res, siteUrl, { razorpay: 'error', message: 'missing_tokens' });
      return;
    }

    const supabase = getSupabaseAdmin();
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { error: upsertError } = await supabase.from('program_payment_configs').upsert(
      {
        program_id: session.program_id,
        enabled: true,
        provider: 'razorpay',
        currency: 'INR',
        public_key: publicToken,
        secret_key_encrypted: accessToken,
        connected: true,
        provider_account_id: razorpayAccountId || null,
        provider_metadata: {
          oauth: true,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          razorpay_account_id: razorpayAccountId,
          connected_at: new Date().toISOString(),
        },
      },
      { onConflict: 'program_id' },
    );

    if (upsertError) {
      redirectToSettings(res, siteUrl, { razorpay: 'error', message: upsertError.message });
      return;
    }

    await supabase.from('integration_connect_sessions').delete().eq('state', state);

    redirectToSettings(res, siteUrl, {
      razorpay: 'connected',
      programId: session.program_id,
    });
  } catch (error: any) {
    redirectToSettings(res, siteUrl, {
      razorpay: 'error',
      message: error?.message || 'unexpected_error',
    });
  }
});

// ── Resend connect (login → domain/project → auto API key) ───────────────────

router.post('/resend/session', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found for your account' });
    }

    const state = await createConnectSession({
      userId,
      organizationId,
      provider: 'resend',
      payload: { resendLoginUrl: 'https://resend.com/login' },
    });

    return res.json({
      state,
      loginUrl: 'https://resend.com/login',
      apiKeysUrl: 'https://resend.com/api-keys',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to start Resend connect session' });
  }
});

router.post('/resend/domains', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const sessionState = typeof req.body?.state === 'string' ? req.body.state.trim() : '';
    const bootstrapKey = typeof req.body?.bootstrapKey === 'string' ? req.body.bootstrapKey.trim() : '';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!sessionState) {
      return res.status(400).json({ error: 'Connect session state is required' });
    }
    if (!bootstrapKey) {
      return res.status(400).json({ error: 'Resend API key is required to list domains' });
    }

    const session = await getConnectSession(sessionState, 'resend');
    if (!session || session.user_id !== userId) {
      return res.status(400).json({ error: 'Connect session expired. Please start again.' });
    }

    const resend = new Resend(bootstrapKey);
    const { data, error } = await resend.domains.list();
    if (error) {
      return res.status(400).json({ error: error.message || 'Invalid Resend API key' });
    }

    const domains = (data?.data || []).map((domain) => ({
      id: domain.id,
      name: domain.name,
      status: domain.status,
    }));

    const supabase = getSupabaseAdmin();
    await supabase
      .from('integration_connect_sessions')
      .update({
        step: 'domains_loaded',
        payload: {
          ...(session.payload as object),
          bootstrap_key_hint: `${bootstrapKey.slice(0, 6)}…`,
        },
        expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      })
      .eq('state', sessionState);

    return res.json({ domains });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to load Resend domains' });
  }
});

router.post('/resend/provision', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const sessionState = typeof req.body?.state === 'string' ? req.body.state.trim() : '';
    const bootstrapKey = typeof req.body?.bootstrapKey === 'string' ? req.body.bootstrapKey.trim() : '';
    const domainId = typeof req.body?.domainId === 'string' ? req.body.domainId.trim() : '';
    const domainName = typeof req.body?.domainName === 'string' ? req.body.domainName.trim() : '';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!sessionState || !bootstrapKey || !domainId) {
      return res.status(400).json({ error: 'state, bootstrapKey, and domainId are required' });
    }

    const session = await getConnectSession(sessionState, 'resend');
    if (!session || session.user_id !== userId) {
      return res.status(400).json({ error: 'Connect session expired. Please start again.' });
    }

    const organizationId = session.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const resend = new Resend(bootstrapKey);
    const keyName = `Platform — ${domainName || 'integration'}`;
    const { data: createdKey, error: createError } = await resend.apiKeys.create({
      name: keyName,
      permission: 'sending_access',
      domain_id: domainId,
    });

    if (createError || !createdKey?.token) {
      return res.status(400).json({
        error: createError?.message || 'Failed to create Resend API key',
      });
    }

    const supabase = getSupabaseAdmin();
    await supabase
      .from('integration_connect_sessions')
      .update({
        step: 'provisioned',
        payload: {
          domainId,
          domainName,
          apiKeyId: createdKey.id,
          provisionedAt: new Date().toISOString(),
        },
        expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      })
      .eq('state', sessionState);

    return res.json({
      apiKey: createdKey.token,
      apiKeyId: createdKey.id,
      domainName,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to provision Resend API key' });
  }
});

router.post('/resend/connect', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    const fromEmail = typeof req.body?.fromEmail === 'string' ? req.body.fromEmail.trim() : '';
    const fromName = typeof req.body?.fromName === 'string' ? req.body.fromName.trim() : 'Platform';
    const domainName = typeof req.body?.domainName === 'string' ? req.body.domainName.trim() : '';
    const sessionState = typeof req.body?.state === 'string' ? req.body.state.trim() : '';

    if (!apiKey) {
      return res.status(400).json({ error: 'Resend API key is required' });
    }
    if (!fromEmail) {
      return res.status(400).json({ error: 'From email is required' });
    }

    const verification = await verifyResendApiKey(apiKey);
    if (!verification.ok) {
      return res.status(400).json({ error: verification.error });
    }

    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found for your account' });
    }

    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();

    const { error: upsertError } = await supabase.from('organization_integrations').upsert(
      {
        organization_id: organizationId,
        provider: 'resend',
        api_key_encrypted: apiKey,
        config: {
          from,
          fromEmail,
          fromName,
          domainName,
          resend_api_key: apiKey,
          resend_from: from,
        },
        connected: true,
        connected_at: now,
        updated_at: now,
      },
      { onConflict: 'organization_id,provider' },
    );

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message || 'Failed to save Resend integration' });
    }

    if (sessionState) {
      await supabase.from('integration_connect_sessions').delete().eq('state', sessionState);
    }

    return res.json({
      ok: true,
      resend: {
        connected: true,
        source: 'organization',
        from,
        projectName: domainName || null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to connect Resend' });
  }
});

router.post('/resend/disconnect', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found for your account' });
    }

    const supabase = getSupabaseAdmin();

    const { error: deleteError } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('provider', 'resend');

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message || 'Failed to disconnect Resend' });
    }

    await supabase
      .from('integration_connect_sessions')
      .delete()
      .eq('organization_id', organizationId)
      .eq('provider', 'resend');

    return res.json({
      ok: true,
      resend: {
        connected: false,
        source: null,
        from: null,
        fromEmail: null,
        fromName: null,
        connectedAt: null,
        projectName: null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to disconnect Resend' });
  }
});

// ── DIDIT KYC ────────────────────────────────────────────────────────────────

async function verifyDiditApiKey(apiKey: string, apiBaseUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = apiBaseUrl.replace(/\/$/, '');
  try {
    const response = await fetch(`${base}/v2/session/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        vendor_data: 'awardx-connection-test',
        callback: 'https://example.com/callback',
      }),
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: 'Invalid DIDIT API key' };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

router.post('/didit/connect', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    const apiBaseUrl =
      typeof req.body?.apiBaseUrl === 'string' && req.body.apiBaseUrl.trim()
        ? req.body.apiBaseUrl.trim()
        : process.env.DIDIT_API_BASE_URL || 'https://verification.didit.me';
    const webhookSecret =
      typeof req.body?.webhookSecret === 'string' ? req.body.webhookSecret.trim() : '';

    if (!apiKey) {
      return res.status(400).json({ error: 'DIDIT API key is required' });
    }

    const verification = await verifyDiditApiKey(apiKey, apiBaseUrl);
    if (!verification.ok) {
      return res.status(400).json({ error: verification.error });
    }

    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found for your account' });
    }

    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    const { error: upsertError } = await supabase.from('organization_integrations').upsert(
      {
        organization_id: organizationId,
        provider: 'didit',
        api_key_encrypted: apiKey,
        config: {
          apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
          webhookSecret: webhookSecret || null,
        },
        connected: true,
        connected_at: now,
        updated_at: now,
      },
      { onConflict: 'organization_id,provider' },
    );

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message || 'Failed to save DIDIT integration' });
    }

    return res.json({
      ok: true,
      didit: {
        connected: true,
        source: 'organization',
        apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
        hasWebhookSecret: !!webhookSecret,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to connect DIDIT' });
  }
});

router.post('/didit/disconnect', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found for your account' });
    }

    const supabase = getSupabaseAdmin();
    const { error: deleteError } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('provider', 'didit');

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message || 'Failed to disconnect DIDIT' });
    }

    return res.json({
      ok: true,
      didit: {
        connected: false,
        source: null,
        apiBaseUrl: null,
        hasWebhookSecret: false,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to disconnect DIDIT' });
  }
});

export default router;
