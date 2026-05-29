import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../Button';
import { Program } from '../../services/models';
import {
  connectDidit,
  connectResend,
  disconnectDidit,
  disconnectResend,
  getIntegrationStatus,
  listResendDomains,
  provisionResendApiKey,
  startRazorpayOAuth,
  startResendConnectSession,
  type IntegrationStatus,
  type ResendDomain,
} from '../../services/integrations';
import { CheckCircle2, ExternalLink, Loader2, Mail, ShieldCheck, X } from 'lucide-react';

type ConnectTarget = 'razorpay' | 'resend' | 'didit' | null;
type ResendStep = 'login' | 'bootstrap' | 'project' | 'sender';

interface IntegrationsPanelProps {
  programs: Program[];
  selectedProgramId: string;
  onProgramChange: (programId: string) => void;
  loading: boolean;
  onError: (message: string | null) => void;
  onSuccess: (message: string | null) => void;
  onProgramsUpdated?: () => Promise<void>;
}

export const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({
  programs,
  selectedProgramId,
  onProgramChange,
  loading,
  onError,
  onSuccess,
  onProgramsUpdated,
}) => {
  const [connectTarget, setConnectTarget] = useState<ConnectTarget>(null);
  const [saving, setSaving] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [razorpayProgramId, setRazorpayProgramId] = useState(selectedProgramId);

  const [resendStep, setResendStep] = useState<ResendStep>('login');
  const [resendSessionState, setResendSessionState] = useState('');
  const [resendLoginUrl, setResendLoginUrl] = useState('https://resend.com/login');
  const [resendApiKeysUrl, setResendApiKeysUrl] = useState('https://resend.com/api-keys');
  const [resendBootstrapKey, setResendBootstrapKey] = useState('');
  const [resendDomains, setResendDomains] = useState<ResendDomain[]>([]);
  const [resendSelectedDomainId, setResendSelectedDomainId] = useState('');
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [resendFromName, setResendFromName] = useState('AwardX');
  const [resendKeyAutofilled, setResendKeyAutofilled] = useState(false);

  const [diditApiKey, setDiditApiKey] = useState('');
  const [diditApiBaseUrl, setDiditApiBaseUrl] = useState('https://verification.didit.me');
  const [diditWebhookSecret, setDiditWebhookSecret] = useState('');

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId),
    [programs, selectedProgramId],
  );

  const razorpayConnected = useMemo(() => {
    const config = selectedProgram?.paymentConfig;
    return config?.provider === 'Razorpay' && !!config.connected && !!config.publicKey;
  }, [selectedProgram]);

  const refreshStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await getIntegrationStatus();
      setIntegrationStatus(status);
    } catch (e: any) {
      onError(e?.message || 'Failed to load integration status');
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    setRazorpayProgramId(selectedProgramId);
  }, [selectedProgramId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const razorpay = params.get('razorpay');
    const message = params.get('message');

    if (razorpay === 'connected') {
      const programId = params.get('programId');
      if (programId) {
        onProgramChange(programId);
      }
      void onProgramsUpdated?.();
      onSuccess('Razorpay account connected successfully.');
      params.delete('razorpay');
      params.delete('programId');
      params.delete('message');
      const next = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
    } else if (razorpay === 'error') {
      onError(message ? decodeURIComponent(message.replace(/\+/g, ' ')) : 'Razorpay connection was cancelled or failed.');
      params.delete('razorpay');
      params.delete('message');
      const next = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
    }
  }, [onError, onSuccess, onProgramChange, onProgramsUpdated]);

  const resetResendFlow = () => {
    setResendStep('login');
    setResendSessionState('');
    setResendBootstrapKey('');
    setResendDomains([]);
    setResendSelectedDomainId('');
    setResendApiKey('');
    setResendFromEmail('');
    setResendFromName('AwardX');
    setResendKeyAutofilled(false);
  };

  const closeModal = () => {
    setConnectTarget(null);
    resetResendFlow();
  };

  const openRazorpayConnect = () => {
    onError(null);
    onSuccess(null);
    setRazorpayProgramId(selectedProgramId || programs[0]?.id || '');
    setConnectTarget('razorpay');
  };

  const openResendConnect = async () => {
    onError(null);
    onSuccess(null);
    resetResendFlow();
    setConnectTarget('resend');
    setSaving(true);
    try {
      const session = await startResendConnectSession();
      setResendSessionState(session.state);
      setResendLoginUrl(session.loginUrl);
      setResendApiKeysUrl(session.apiKeysUrl);
    } catch (e: any) {
      onError(e?.message || 'Failed to start Resend connection');
      setConnectTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const handleRazorpayOAuth = async () => {
    if (!razorpayProgramId) {
      onError('Select a program before connecting Razorpay.');
      return;
    }

    setSaving(true);
    onError(null);
    try {
      const { authUrl } = await startRazorpayOAuth(razorpayProgramId);
      window.location.href = authUrl;
    } catch (e: any) {
      onError(e?.message || 'Failed to start Razorpay login');
      setSaving(false);
    }
  };

  const openResendLogin = () => {
    window.open(resendLoginUrl, '_blank', 'noopener,noreferrer');
  };

  const loadResendDomains = async () => {
    if (!resendBootstrapKey.trim()) {
      onError('Paste the API key from your Resend dashboard to continue.');
      return;
    }

    setSaving(true);
    onError(null);
    try {
      const { domains } = await listResendDomains(resendSessionState, resendBootstrapKey.trim());
      if (!domains.length) {
        onError('No domains found. Add and verify a domain in Resend first.');
        return;
      }
      setResendDomains(domains);
      const verified = domains.find((d) => d.status === 'verified') || domains[0];
      setResendSelectedDomainId(verified.id);
      if (verified.name.includes('.')) {
        setResendFromEmail((prev) => prev || `no-reply@${verified.name}`);
      }
      setResendStep('project');
    } catch (e: any) {
      onError(e?.message || 'Failed to load Resend projects');
    } finally {
      setSaving(false);
    }
  };

  const provisionResendKey = async () => {
    const domain = resendDomains.find((d) => d.id === resendSelectedDomainId);
    if (!domain) {
      onError('Select a Resend project (domain) to continue.');
      return;
    }

    setSaving(true);
    onError(null);
    try {
      const result = await provisionResendApiKey({
        state: resendSessionState,
        bootstrapKey: resendBootstrapKey.trim(),
        domainId: domain.id,
        domainName: domain.name,
      });
      setResendApiKey(result.apiKey);
      setResendKeyAutofilled(true);
      if (domain.name.includes('.')) {
        setResendFromEmail((prev) => prev || `no-reply@${domain.name}`);
      }
      setResendStep('sender');
    } catch (e: any) {
      onError(e?.message || 'Failed to generate Resend API key');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectResend = async () => {
    if (!resendApiKey.trim() || !resendFromEmail.trim()) {
      onError('Resend API key and from email are required.');
      return;
    }

    const domain = resendDomains.find((d) => d.id === resendSelectedDomainId);

    setSaving(true);
    onError(null);
    try {
      const result = await connectResend({
        apiKey: resendApiKey.trim(),
        fromEmail: resendFromEmail.trim(),
        fromName: resendFromName.trim() || 'AwardX',
        domainName: domain?.name,
        state: resendSessionState,
      });
      setIntegrationStatus({ resend: result.resend });
      onSuccess('Resend connected for your organization.');
      closeModal();
    } catch (e: any) {
      onError(e?.message || 'Failed to connect Resend');
    } finally {
      setSaving(false);
    }
  };

  const resendConnected =
    integrationStatus?.resend?.connected && integrationStatus?.resend?.source === 'organization';

  const diditConnected =
    integrationStatus?.didit?.connected && integrationStatus?.didit?.source === 'organization';

  const openDiditConnect = () => {
    onError(null);
    onSuccess(null);
    setDiditApiKey('');
    setDiditApiBaseUrl(integrationStatus?.didit?.apiBaseUrl || 'https://verification.didit.me');
    setDiditWebhookSecret('');
    setConnectTarget('didit');
  };

  const handleConnectDidit = async () => {
    if (!diditApiKey.trim()) {
      onError('DIDIT API key is required.');
      return;
    }
    setSaving(true);
    onError(null);
    try {
      const result = await connectDidit({
        apiKey: diditApiKey.trim(),
        apiBaseUrl: diditApiBaseUrl.trim(),
        webhookSecret: diditWebhookSecret.trim() || undefined,
      });
      setIntegrationStatus((prev) => ({
        resend: prev?.resend || { connected: false, source: null },
        didit: result.didit,
      }));
      onSuccess('DIDIT connected. Enable KYC on public voting rounds in Schedule & Rounds.');
      setConnectTarget(null);
    } catch (e: any) {
      onError(e?.message || 'Failed to connect DIDIT');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectDidit = async () => {
    if (!diditConnected) return;
    setSaving(true);
    onError(null);
    try {
      const result = await disconnectDidit();
      setIntegrationStatus((prev) => ({
        resend: prev?.resend || { connected: false, source: null },
        didit: result.didit,
      }));
      onSuccess('DIDIT disconnected.');
    } catch (e: any) {
      onError(e?.message || 'Failed to disconnect DIDIT');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectResend = async () => {
    if (!resendConnected) {
      return;
    }

    setSaving(true);
    onError(null);
    onSuccess(null);
    try {
      const result = await disconnectResend();
      setIntegrationStatus({ resend: result.resend });
      onSuccess('Resend disconnected. Connect again anytime from Integrations.');
    } catch (e: any) {
      onError(e?.message || 'Failed to disconnect Resend');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <div className="space-y-2 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900">Integrations</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          Connect your organization&apos;s Razorpay, Resend, and DIDIT accounts. DIDIT powers optional identity
          verification on public voting rounds (configured per round in Schedule &amp; Rounds).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <IntegrationCard
          title="Razorpay"
          description="Sign in on Razorpay and authorize AwardX to accept payments for a program."
          accentClass="from-[#0C2451] to-[#3395FF]"
          logoLabel="R"
          connected={razorpayConnected}
          connectedDetail={razorpayConnected ? selectedProgram?.title : undefined}
          statusLoading={loading}
          actionLabel="Connect with Razorpay"
          onConnect={openRazorpayConnect}
        />

        <IntegrationCard
          title="Resend"
          description="Sign in on Resend, choose a sending domain, and we will create an API key for you."
          accentClass="from-slate-900 to-slate-700"
          logoLabel={<Mail className="w-5 h-5" />}
          connected={resendConnected}
          connectedDetail={
            integrationStatus?.resend?.from ||
            integrationStatus?.resend?.projectName ||
            undefined
          }
          statusLoading={statusLoading}
          actionLabel="Connect with Resend"
          disconnectLabel="Disconnect Resend"
          saving={saving}
          onConnect={() => void openResendConnect()}
          onDisconnect={() => void handleDisconnectResend()}
        />

        <IntegrationCard
          title="DIDIT"
          description="Identity verification (KYC) for public voters. Add your DIDIT API key from the DIDIT console."
          accentClass="from-violet-700 to-indigo-600"
          logoLabel={<ShieldCheck className="w-5 h-5" />}
          connected={diditConnected}
          connectedDetail={integrationStatus?.didit?.apiBaseUrl || undefined}
          statusLoading={statusLoading}
          actionLabel="Connect DIDIT"
          disconnectLabel="Disconnect DIDIT"
          saving={saving}
          onConnect={openDiditConnect}
          onDisconnect={() => void handleDisconnectDidit()}
        />
      </div>

      {connectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="integration-connect-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
              <h3 id="integration-connect-title" className="text-lg font-bold text-slate-900">
                {connectTarget === 'razorpay'
                  ? 'Connect Razorpay'
                  : connectTarget === 'didit'
                    ? 'Connect DIDIT'
                    : 'Connect Resend'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {connectTarget === 'razorpay' && (
                <>
                  <p className="text-sm text-slate-600">
                    You will be redirected to Razorpay to sign in and approve access. When finished, you will return here automatically.
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Program</label>
                    <select
                      value={razorpayProgramId}
                      onChange={(e) => setRazorpayProgramId(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                      disabled={loading || programs.length === 0 || saving}
                    >
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {connectTarget === 'didit' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Paste your DIDIT API key from the{' '}
                    <a
                      href="https://docs.didit.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      DIDIT console
                    </a>
                    . Use the webhook URL below in DIDIT for verification status updates.
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">API key</label>
                    <input
                      type="password"
                      value={diditApiKey}
                      onChange={(e) => setDiditApiKey(e.target.value)}
                      placeholder="Your DIDIT API key"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">API base URL</label>
                    <input
                      type="url"
                      value={diditApiBaseUrl}
                      onChange={(e) => setDiditApiBaseUrl(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Webhook secret (optional)
                    </label>
                    <input
                      type="password"
                      value={diditWebhookSecret}
                      onChange={(e) => setDiditWebhookSecret(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-xs text-slate-500 rounded-lg bg-slate-50 p-3 font-mono break-all">
                    Webhook:{' '}
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/api/kyc/didit/webhook`
                      : '/api/kyc/didit/webhook'}
                  </p>
                </div>
              )}

              {connectTarget === 'resend' && (
                <>
                  <ResendStepIndicator current={resendStep} />

                  {resendStep === 'login' && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Step 1: Sign in to your Resend account in a new tab. When you are logged in, return here and continue.
                      </p>
                      <Button variant="outline" className="w-full gap-2" onClick={openResendLogin}>
                        <ExternalLink className="w-4 h-4" />
                        Sign in to Resend
                      </Button>
                    </div>
                  )}

                  {resendStep === 'bootstrap' && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Step 2: Open your Resend API keys page and copy an existing key (or create one with full access). We use it once to list your projects and generate an AwardX key.
                      </p>
                      <a
                        href={resendApiKeysUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Resend API keys
                      </a>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Temporary Resend API key
                        </label>
                        <input
                          type="password"
                          value={resendBootstrapKey}
                          onChange={(e) => setResendBootstrapKey(e.target.value)}
                          placeholder="re_xxx"
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  )}

                  {resendStep === 'project' && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Step 3: Select the Resend project (verified sending domain) AwardX should use.
                      </p>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Project / domain</label>
                        <select
                          value={resendSelectedDomainId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setResendSelectedDomainId(id);
                            const domain = resendDomains.find((d) => d.id === id);
                            if (domain?.name.includes('.')) {
                              setResendFromEmail(`no-reply@${domain.name}`);
                            }
                          }}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                          disabled={saving}
                        >
                          {resendDomains.map((domain) => (
                            <option key={domain.id} value={domain.id}>
                              {domain.name} ({domain.status})
                            </option>
                          ))}
                        </select>
                      </div>
                      {saving && (
                        <p className="text-sm text-indigo-600 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating AwardX API key…
                        </p>
                      )}
                    </div>
                  )}

                  {resendStep === 'sender' && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Step 4: Your Resend API key has been created. Confirm sender details below.
                      </p>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Resend API key</label>
                        <input
                          type="text"
                          value={resendApiKey}
                          readOnly={resendKeyAutofilled}
                          onChange={(e) => !resendKeyAutofilled && setResendApiKey(e.target.value)}
                          className={`w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm ${
                            resendKeyAutofilled ? 'bg-emerald-50 text-emerald-900' : ''
                          }`}
                        />
                        {resendKeyAutofilled && (
                          <p className="text-xs text-emerald-700 mt-1">Auto-filled from your Resend account</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">From email</label>
                        <input
                          type="email"
                          value={resendFromEmail}
                          onChange={(e) => setResendFromEmail(e.target.value)}
                          placeholder="no-reply@yourdomain.com"
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">From name</label>
                        <input
                          type="text"
                          value={resendFromName}
                          onChange={(e) => setResendFromName(e.target.value)}
                          placeholder="AwardX"
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>

              {connectTarget === 'razorpay' && (
                <Button onClick={handleRazorpayOAuth} disabled={saving || loading || !razorpayProgramId}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Redirecting…
                    </>
                  ) : (
                    'Sign in with Razorpay'
                  )}
                </Button>
              )}

              {connectTarget === 'didit' && (
                <Button onClick={() => void handleConnectDidit()} disabled={saving}>
                  {saving ? 'Saving…' : 'Connect DIDIT'}
                </Button>
              )}

              {connectTarget === 'resend' && (
                <div className="flex gap-2">
                  {resendStep !== 'login' && (
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        if (resendStep === 'bootstrap') setResendStep('login');
                        else if (resendStep === 'project') setResendStep('bootstrap');
                        else if (resendStep === 'sender') setResendStep('project');
                      }}
                    >
                      Back
                    </Button>
                  )}
                  {resendStep === 'login' && (
                    <Button onClick={() => setResendStep('bootstrap')} disabled={saving}>
                      I&apos;m signed in
                    </Button>
                  )}
                  {resendStep === 'bootstrap' && (
                    <Button onClick={loadResendDomains} disabled={saving}>
                      {saving ? 'Loading…' : 'Continue'}
                    </Button>
                  )}
                  {resendStep === 'project' && (
                    <Button onClick={provisionResendKey} disabled={saving || !resendSelectedDomainId}>
                      {saving ? 'Generating…' : 'Generate API key'}
                    </Button>
                  )}
                  {resendStep === 'sender' && (
                    <Button onClick={handleConnectResend} disabled={saving}>
                      {saving ? 'Saving…' : 'Connect with Resend'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ResendStepIndicator = ({ current }: { current: ResendStep }) => {
  const steps: { id: ResendStep; label: string }[] = [
    { id: 'login', label: 'Sign in' },
    { id: 'bootstrap', label: 'Authorize' },
    { id: 'project', label: 'Project' },
    { id: 'sender', label: 'Sender' },
  ];
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <ol className="flex gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={`flex-1 text-center py-1 rounded-md ${
            index <= currentIndex ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50'
          }`}
        >
          {step.label}
        </li>
      ))}
    </ol>
  );
};

const IntegrationCard = ({
  title,
  description,
  accentClass,
  logoLabel,
  connected,
  connectedDetail,
  statusLoading,
  actionLabel,
  disconnectLabel,
  saving,
  onConnect,
  onDisconnect,
}: {
  title: string;
  description: string;
  accentClass: string;
  logoLabel: React.ReactNode;
  connected: boolean;
  connectedDetail?: string;
  statusLoading?: boolean;
  actionLabel: string;
  disconnectLabel?: string;
  saving?: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
    <div className="flex items-start gap-4">
      <div
        className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${accentClass} text-white flex items-center justify-center font-bold text-lg`}
      >
        {logoLabel}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-slate-900">{title}</h3>
          {!statusLoading && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {connected && <CheckCircle2 className="w-3.5 h-3.5" />}
              {connected ? 'Connected' : 'Not connected'}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
        {connected && connectedDetail && (
          <p className="text-xs text-slate-400 mt-2 truncate" title={connectedDetail}>
            {connectedDetail}
          </p>
        )}
      </div>
    </div>
    <Button
      size="lg"
      className="w-full"
      variant={connected && onDisconnect ? 'outline' : 'primary'}
      disabled={!!saving || !!statusLoading}
      onClick={connected && onDisconnect ? onDisconnect : onConnect}
    >
      {connected && onDisconnect
        ? saving
          ? 'Disconnecting…'
          : disconnectLabel || `Disconnect ${title}`
        : connected
          ? `Reconnect ${title}`
          : actionLabel}
    </Button>
  </div>
);
