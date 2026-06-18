import React, { useEffect, useState } from 'react';
import { Copy, Check, ExternalLink, Globe, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../../../services/supabase';
import { resolveBackendPath } from '../../../services/backendApi';
import { getIntegrationStatus } from '../../../services/integrations';

export type VotingAccessMode = 'open' | 'org_only' | 'authenticated';

export interface RoundVotingConfig {
  votes_per_user: number;
  votes_per_submission: number;
  require_auth: boolean;
  allow_anonymous: boolean;
  show_results_publicly: boolean;
  show_leaderboard: boolean;
  access_mode: VotingAccessMode;
  public_voting_slug?: string;
}

const defaultConfig: RoundVotingConfig = {
  votes_per_user: 5,
  votes_per_submission: 1,
  require_auth: false,
  allow_anonymous: true,
  show_results_publicly: true,
  show_leaderboard: true,
  access_mode: 'open',
};

interface PublicVotingRoundSectionProps {
  roundId: string;
  roundName: string;
  programId: string;
  kycEnabled?: boolean;
  onKycEnabledChange?: (enabled: boolean) => void;
  /** Called whenever local config changes so parent can persist on save */
  configRef: React.MutableRefObject<RoundVotingConfig | null>;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { session } = await auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

export const PublicVotingRoundSection: React.FC<PublicVotingRoundSectionProps> = ({
  roundId,
  roundName,
  programId,
  kycEnabled = false,
  onKycEnabledChange,
  configRef,
}) => {
  const [config, setConfig] = useState<RoundVotingConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diditConnected, setDiditConnected] = useState(false);

  const isPersisted = roundId && !roundId.startsWith('round-');

  useEffect(() => {
    configRef.current = config;
  }, [config, configRef]);

  useEffect(() => {
    getIntegrationStatus()
      .then((s) => setDiditConnected(!!s.didit?.connected))
      .catch(() => setDiditConnected(false));
  }, []);

  useEffect(() => {
    if (!isPersisted) {
      setConfig(defaultConfig);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(resolveBackendPath(`/api/voting/${roundId}/config`), {
          headers: await authHeaders(),
        });
        if (!res.ok) {
          if (!cancelled) setConfig(defaultConfig);
          return;
        }
        const json = await res.json();
        const row = json.data;
        if (!cancelled && row) {
          setConfig({
            votes_per_user: row.votes_per_user ?? 5,
            votes_per_submission: row.votes_per_submission ?? 1,
            require_auth: row.require_auth ?? false,
            allow_anonymous: row.allow_anonymous ?? true,
            show_results_publicly: row.show_results_publicly ?? true,
            show_leaderboard: row.show_leaderboard ?? true,
            access_mode: row.access_mode || 'open',
            public_voting_slug: row.public_voting_slug,
          });
        } else if (!cancelled) {
          setConfig(defaultConfig);
        }
      } catch {
        if (!cancelled) setConfig(defaultConfig);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roundId, isPersisted]);

  const publicUrl = config.public_voting_slug
    ? `${window.location.origin}/vote/${config.public_voting_slug}`
    : isPersisted
      ? `${window.location.origin}/voting/${roundId}`
      : null;

  const patch = (partial: Partial<RoundVotingConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      if (partial.access_mode) {
        if (partial.access_mode === 'open') {
          next.require_auth = false;
          next.allow_anonymous = true;
        } else if (partial.access_mode === 'authenticated') {
          next.require_auth = true;
          next.allow_anonymous = false;
        } else if (partial.access_mode === 'org_only') {
          next.require_auth = true;
          next.allow_anonymous = false;
        }
      }
      return next;
    });
  };

  const copyLink = async () => {
    if (!publicUrl) {
      toast.error('Save this round first to generate a public voting link.');
      return;
    }
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Voting link copied');
  };

  return (
    <section className="space-y-4">
      <h4 className="px-1 text-[11px] font-bold uppercase tracking-widest text-indigo-500">
        Public voting
      </h4>
      <div className="space-y-4 rounded-[20px] border border-indigo-100/80 bg-indigo-50/40 p-4">
        <p className="text-xs leading-relaxed text-slate-600">
          Configure how the public votes on nominations enrolled in this round. Share the link below
          when the round is active.
        </p>

        {loading ? (
          <p className="text-sm text-slate-400">Loading voting settings…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200/60 bg-white p-3">
              <Globe className="h-4 w-4 flex-shrink-0 text-indigo-600" />
              <code className="min-w-0 flex-1 truncate text-xs text-slate-700">
                {publicUrl || 'Link available after you save this round'}
              </code>
              <button
                type="button"
                onClick={() => void copyLink()}
                disabled={!publicUrl}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold hover:bg-slate-50 disabled:opacity-40"
              >
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                Copy
              </button>
              {publicUrl && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold hover:bg-slate-50"
                >
                  <ExternalLink className="h-3 w-3" />
                  Preview
                </a>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 block text-[11px] font-semibold text-slate-500">Who can vote</label>
              <select
                value={config.access_mode}
                onChange={(e) => patch({ access_mode: e.target.value as VotingAccessMode })}
                className="w-full rounded-xl border border-slate-200/60 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="open">Open to everyone</option>
                <option value="authenticated">Signed-in users only</option>
                <option value="org_only">Organization members only</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="ml-1 block text-[11px] font-semibold text-slate-500">Votes per voter</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.votes_per_user}
                  onChange={(e) => patch({ votes_per_user: parseInt(e.target.value, 10) || 1 })}
                  className="w-full rounded-xl border border-slate-200/60 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 block text-[11px] font-semibold text-slate-500">Votes per entry</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.votes_per_submission}
                  onChange={(e) => patch({ votes_per_submission: parseInt(e.target.value, 10) || 1 })}
                  className="w-full rounded-xl border border-slate-200/60 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              {[
                { key: 'show_leaderboard' as const, label: 'Show leaderboard', default: true },
                { key: 'show_results_publicly' as const, label: 'Show vote counts on cards', default: true },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => patch({ [opt.key]: !config[opt.key] })}
                  className={`flex w-full items-center justify-between rounded-xl border p-3.5 transition-all ${
                    config[opt.key]
                      ? 'border-indigo-200 bg-white text-indigo-700'
                      : 'border-slate-200/60 bg-white text-slate-600'
                  }`}
                >
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <div
                    className={`relative h-5 w-10 rounded-full ${config[opt.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                        config[opt.key] ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>

            {onKycEnabledChange && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                      <ShieldCheck className="h-4 w-4" />
                      Require DIDIT KYC to vote
                    </p>
                    <p className="mt-1 text-xs text-violet-700">
                      Voters complete identity verification before casting votes in this program.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onKycEnabledChange(!kycEnabled)}
                    className={`relative h-5 w-10 flex-shrink-0 rounded-full transition-colors ${
                      kycEnabled ? 'bg-violet-600' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                        kycEnabled ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
                {!diditConnected && (
                  <p className="text-xs text-violet-800">
                    Connect DIDIT in{' '}
                    <a href={`/dashboard/events/${programId}/settings/integrations`} className="font-semibold underline">
                      Settings → Integrations
                    </a>{' '}
                    to finalize setup.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

/** Persist voting config after round is saved (real UUID). */
export async function saveRoundVotingConfig(roundId: string, config: RoundVotingConfig) {
  const res = await fetch(resolveBackendPath(`/api/voting/${roundId}/config`), {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save public voting settings');
  }
  return res.json();
}
