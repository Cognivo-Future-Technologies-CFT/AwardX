import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Award,
  Briefcase,
  ExternalLink,
  Globe,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Trophy,
  User,
} from 'lucide-react';
import { useSubmissionIntelligence } from '../../hooks/useSubmissionIntelligence';
import { ClaimVerificationBadge } from './ClaimVerificationBadge';
import { ClaimEvidenceList } from './ClaimEvidenceList';
import type {
  ClaimWithVerifications,
  DigitalFootprint,
  EmailIntelligenceDossier,
} from '../../services/personIntelligenceApi';

interface ApplicantIntelligenceSidebarProps {
  submissionId: string | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
  enabled?: boolean;
  judgeToken?: string;
  className?: string;
}

type Tab = 'footprint' | 'claims' | 'profile';

const SOURCE_LABELS: Record<string, string> = {
  web_search: 'Web',
  email_lookup: 'Email',
  firecrawl: 'Firecrawl',
  hunter: 'Hunter.io',
  holehe: 'Holehe',
  google_cse: 'Google',
};

function sourceLabel(fp: DigitalFootprint): string {
  return SOURCE_LABELS[fp.sourceName] || SOURCE_LABELS[fp.sourceType] || fp.sourceName || 'Source';
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
}

export const ApplicantIntelligenceSidebar: React.FC<ApplicantIntelligenceSidebarProps> = ({
  submissionId,
  applicantName,
  applicantEmail,
  enabled = true,
  judgeToken,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('footprint');
  const { data, isLoading, isRefreshing, error, refresh } = useSubmissionIntelligence(
    submissionId,
    { enabled, judgeToken, pollWhileProcessing: true },
  );

  const [autoCollected, setAutoCollected] = useState(false);

  useEffect(() => {
    setAutoCollected(false);
  }, [submissionId]);

  // Auto-collect once when sidebar opens with no data and OSINT is configured
  useEffect(() => {
    if (!enabled || !submissionId || isLoading || isRefreshing || autoCollected) return;
    if (!data?.emailIntelligenceConfigured) return;
    const hasData = (data.footprintsTotal ?? 0) > 0 || data.emailIntelligence?.status === 'found';
    if (data && !hasData && !data.setupRequired) {
      setAutoCollected(true);
      void refresh();
    }
  }, [enabled, submissionId, isLoading, isRefreshing, autoCollected, data, refresh]);

  if (!submissionId) return null;

  const displayName = applicantName || data?.applicantName || 'Applicant';
  const displayEmail = applicantEmail || data?.applicantEmail;
  const dossierConfidence = data?.profile?.overallConfidence ?? 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'footprint', label: 'Footprint' },
    { id: 'claims', label: 'Claims' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <aside
      className={`flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-900">Person Intelligence</h2>
            </div>
            <p className="mt-1 truncate text-sm font-medium text-slate-800">{displayName}</p>
            {displayEmail && (
              <p className="truncate text-xs text-slate-500">{displayEmail}</p>
            )}
            {dossierConfidence > 0 && (
              <p className="mt-1 text-xs text-indigo-600">
                Dossier confidence: {Math.round(dossierConfidence * 100)}%
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isLoading || isRefreshing}
            className="shrink-0 rounded-full border border-slate-200 p-1.5 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 disabled:opacity-50"
            title="Refresh footprints"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1 rounded-lg bg-slate-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.id === 'footprint' && data && data.footprintsTotal > 0 && (
                <span className="ml-1 opacity-60">({data.footprintsTotal})</span>
              )}
              {tab.id === 'claims' && data && data.claims.length > 0 && (
                <span className="ml-1 opacity-60">({data.claims.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {(isLoading || isRefreshing) && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            {isRefreshing ? 'Scanning registered accounts…' : 'Loading intelligence…'}
          </div>
        )}

        {!isLoading && !isRefreshing && error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !isRefreshing && !error && data && data.holeheEnabled && !data.holeheAvailable && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Install Holehe to enable account discovery:{' '}
              <code className="text-[10px]">pip3 install -r server/requirements-holehe.txt</code>
              {' '}·{' '}
              <a
                href="https://github.com/megadose/holehe"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                megadose/holehe
              </a>
            </span>
          </div>
        )}

        {!isLoading && !isRefreshing && !error && data?.setupRequired && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Database setup required. Run migrations{' '}
              <strong>037</strong> and <strong>038</strong> in Supabase SQL Editor, then click Refresh.
            </span>
          </div>
        )}

        {!isLoading && !isRefreshing && !error && activeTab === 'claims' && (
          <ClaimsTab claims={data?.claims ?? []} />
        )}

        {!isLoading && !isRefreshing && !error && activeTab === 'footprint' && (
          <FootprintTab
            footprints={data?.footprints ?? []}
            intelligence={data?.emailIntelligence ?? null}
            hasEmail={!!displayEmail}
            holeheAvailable={data?.holeheAvailable ?? false}
          />
        )}

        {!isLoading && !isRefreshing && !error && activeTab === 'profile' && (
          <ProfileTab
            profile={data?.profile ?? null}
            intelligence={data?.emailIntelligence ?? null}
          />
        )}
      </div>
    </aside>
  );
};

function FootprintTab({
  footprints,
  intelligence,
  hasEmail,
  holeheAvailable,
}: {
  footprints: DigitalFootprint[];
  intelligence: EmailIntelligenceDossier | null;
  hasEmail: boolean;
  holeheAvailable: boolean;
}) {
  if (intelligence?.status === 'unavailable') {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <AlertCircle className="mb-2 h-7 w-7 text-amber-400" />
        <p className="text-sm font-medium text-slate-600">Holehe unavailable</p>
        <p className="mt-1 text-xs text-slate-400">{intelligence.unavailableReason || 'Install holehe and retry.'}</p>
      </div>
    );
  }

  if (intelligence?.status === 'found') {
    return <HoleheIntelligenceView intelligence={intelligence} />;
  }

  if (intelligence?.status === 'not_found') {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Search className="mb-2 h-7 w-7 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No registered accounts found</p>
        <p className="mt-1 text-xs text-slate-400">
          Holehe checked {intelligence.stats.totalChecked} sites — email not registered on known platforms.
        </p>
      </div>
    );
  }

  if (footprints.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Search className="mb-2 h-7 w-7 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No footprints yet</p>
        <p className="mt-1 text-xs text-slate-400">
          {!hasEmail
            ? 'Add an applicant email to enable collection.'
            : holeheAvailable
              ? 'Click refresh to scan registered accounts via Holehe.'
              : 'Install Holehe (pip3 install holehe) to enable account discovery.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {footprints.map((fp) => (
        <FootprintCard key={fp.id} fp={fp} />
      ))}
    </div>
  );
}

function HoleheIntelligenceView({ intelligence }: { intelligence: EmailIntelligenceDossier }) {
  const nameHints = intelligence.recoveryHints.filter((h) => h.kind === 'name');
  const emailHints = intelligence.recoveryHints.filter((h) => h.kind === 'email');
  const phoneHints = intelligence.recoveryHints.filter((h) => h.kind === 'phone');

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-indigo-50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Account discovery</p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          {intelligence.stats.totalFound} registered account{intelligence.stats.totalFound !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-slate-500">
          {intelligence.stats.totalChecked} sites checked
          {intelligence.stats.rateLimited > 0 ? ` · ${intelligence.stats.rateLimited} rate limited` : ''}
        </p>
      </div>

      {intelligence.registeredAccounts.length > 0 && (
        <DossierSection title="Registered accounts">
          {intelligence.registeredAccounts.map((account) => (
            <div key={`${account.platform}-${account.domain}`} className="rounded-lg border border-slate-100 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 capitalize">{account.platform}</p>
                  <p className="text-[10px] text-slate-500">{account.domain}</p>
                  {account.fullName && (
                    <p className="mt-0.5 text-[11px] text-slate-600">Name hint: {account.fullName}</p>
                  )}
                  {(account.recoveryEmail || account.recoveryPhone) && (
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {[account.recoveryEmail, account.recoveryPhone].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {account.rateLimited && (
                  <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">Rate limited</span>
                )}
              </div>
              {account.profileUrl && (
                <a
                  href={account.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
                >
                  Open {account.domain} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </DossierSection>
      )}

      {nameHints.length > 0 && (
        <DossierSection title="Name hints">
          {nameHints.map((hint) => (
            <DossierItem key={`${hint.value}-${hint.platform}`} label={hint.value} source={hint.platform} />
          ))}
        </DossierSection>
      )}

      {emailHints.length > 0 && (
        <DossierSection title="Recovery emails">
          {emailHints.map((hint) => (
            <DossierItem key={`${hint.value}-${hint.platform}`} label={hint.value} source={hint.platform} />
          ))}
        </DossierSection>
      )}

      {phoneHints.length > 0 && (
        <DossierSection title="Recovery phones">
          {phoneHints.map((hint) => (
            <DossierItem key={`${hint.value}-${hint.platform}`} label={hint.value} source={hint.platform} />
          ))}
        </DossierSection>
      )}

      <p className="text-[10px] text-slate-400">
        Powered by Holehe · {formatDate(intelligence.searchedAt)}
      </p>
    </div>
  );
}

function DossierSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DossierItem({
  label,
  source,
  url,
}: {
  label: string;
  source: string;
  url?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 p-2.5">
      <p className="text-xs font-medium text-slate-800">{label}</p>
      <p className="text-[10px] text-slate-500">{source}</p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function FootprintCard({ fp }: { fp: DigitalFootprint }) {
  return (
    <article className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:border-indigo-100">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-600 ring-1 ring-indigo-100">
          {sourceLabel(fp)}
        </span>
        {fp.confidence > 0 && (
          <span className="text-[10px] text-slate-400">
            {Math.round(fp.confidence * 100)}% verified
          </span>
        )}
        <span className="text-[10px] text-slate-400">{formatDate(fp.collectedAt)}</span>
      </div>
      <p className="text-xs font-semibold text-slate-800">{fp.title || 'Untitled'}</p>
      {fp.snippet && (
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{fp.snippet}</p>
      )}
      {fp.sourceUrl && (
        <a
          href={fp.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
        >
          View source <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </article>
  );
}

function ClaimsTab({ claims }: { claims: ClaimWithVerifications[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (claims.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Search className="mb-2 h-7 w-7 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No claims extracted</p>
        <p className="mt-1 text-xs text-slate-400">
          Verifiable achievements and credentials will appear here after processing.
        </p>
      </div>
    );
  }

  const typeIcon = (type: string) => {
    if (type === 'achievement') return <Trophy className="h-3 w-3" />;
    if (type === 'education') return <GraduationCap className="h-3 w-3" />;
    if (type === 'experience') return <Briefcase className="h-3 w-3" />;
    if (type === 'award') return <Award className="h-3 w-3" />;
    return <User className="h-3 w-3" />;
  };

  return (
    <div className="space-y-2.5">
      {claims.map((claim) => (
        <div key={claim.id} className="rounded-xl border border-slate-100 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-1.5">
              <span className="mt-0.5 text-indigo-400">{typeIcon(claim.claimType)}</span>
              <p className="text-xs leading-relaxed text-slate-700">{claim.claimText}</p>
            </div>
            <ClaimVerificationBadge
              confidence={claim.verificationConfidence}
              status={claim.verificationStatus}
              size="sm"
            />
          </div>
          {claim.claimSubject && (
            <p className="mt-1 pl-4.5 text-[10px] font-medium text-indigo-500">{claim.claimSubject}</p>
          )}
          {claim.claimVerifications && claim.claimVerifications.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === claim.id ? null : claim.id)}
                className="mt-1.5 pl-4.5 text-[10px] text-slate-400 hover:text-indigo-500"
              >
                {claim.claimVerifications.length} source{claim.claimVerifications.length !== 1 ? 's' : ''}
              </button>
              {expandedId === claim.id && (
                <div className="mt-1 pl-4.5">
                  <ClaimEvidenceList
                    sources={claim.claimVerifications.map((v) => ({
                      url: v.sourceUrl,
                      title: v.sourceTitle,
                      supportsClaim: v.supportsClaim,
                      confidence: v.confidence,
                    }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function ProfileTab({
  profile,
  intelligence,
}: {
  profile: import('../../services/personIntelligenceApi').PersonIntelligenceProfile | null;
  intelligence: EmailIntelligenceDossier | null;
}) {
  if (!profile && !intelligence) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <User className="mb-2 h-7 w-7 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">Profile not built yet</p>
        <p className="mt-1 text-xs text-slate-400">Refresh to scan registered accounts via Holehe.</p>
      </div>
    );
  }

  const sections = profile
    ? [
        { label: 'Achievements', items: profile.achievements },
        { label: 'Education', items: profile.education },
        { label: 'Experience', items: profile.experience },
        { label: 'Awards', items: profile.awards },
      ].filter((s) => s.items.length > 0)
    : [];

  const nameHint = intelligence?.recoveryHints.find((h) => h.kind === 'name');

  return (
    <div className="space-y-4">
      {intelligence?.status === 'found' && (
        <div className="rounded-xl bg-indigo-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Digital footprint</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {nameHint?.value || `${intelligence.stats.totalFound} accounts across ${intelligence.stats.totalChecked} sites`}
          </p>
          {intelligence.registeredAccounts.slice(0, 3).map((a) => (
            <p key={a.platform} className="text-xs text-slate-600 capitalize">
              {a.platform} · {a.domain}
            </p>
          ))}
        </div>
      )}

      {profile && (
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Digital presence</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {profile.digitalPresence.totalSources} verified source{profile.digitalPresence.totalSources !== 1 ? 's' : ''}
          </p>
          {profile.digitalPresence.topDomains.slice(0, 3).map((d) => (
            <p key={d.domain} className="text-xs text-slate-500">
              {d.domain} ({d.count})
            </p>
          ))}
        </div>
      )}

      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {section.label}
          </p>
          {section.items.slice(0, 3).map((item) => (
            <div key={item.id} className="mb-1.5 rounded-lg border border-slate-100 p-2">
              <p className="text-xs text-slate-700">{item.text}</p>
              {item.confidence > 0 && (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {Math.round(item.confidence * 100)}% confidence
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
