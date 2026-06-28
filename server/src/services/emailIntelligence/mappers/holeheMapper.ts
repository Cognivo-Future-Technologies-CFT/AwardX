import type {
  EmailIntelligenceDossier,
  EmailIntelligenceResult,
  FootprintCandidate,
  RecoveryHint,
  RegisteredAccount,
} from '../types.js';
import type { HoleheRawResult, HoleheScanPayload } from '../holeheRunner.js';

const PLATFORM_URLS: Record<string, (domain: string) => string> = {
  github: () => 'https://github.com',
  twitter: () => 'https://twitter.com',
  instagram: () => 'https://instagram.com',
  spotify: () => 'https://open.spotify.com',
  gravatar: (domain) => `https://${domain}`,
};

function profileUrlFor(platform: string, domain: string, others: unknown): string | null {
  if (others && typeof others === 'object') {
    const profile = (others as Record<string, unknown>).ProfileUrl
      || (others as Record<string, unknown>).profileUrl
      || (others as Record<string, unknown>).uri;
    if (typeof profile === 'string' && profile.startsWith('http')) return profile;
  }

  const builder = PLATFORM_URLS[platform.toLowerCase()];
  return builder ? builder(domain) : (domain ? `https://${domain}` : null);
}

function extractFullName(others: unknown): string | null {
  if (!others || typeof others !== 'object') return null;
  const record = others as Record<string, unknown>;
  const name = record.FullName || record.fullName || record.name;
  return typeof name === 'string' ? name : null;
}

export function mapHolehePayload(payload: HoleheScanPayload): EmailIntelligenceResult {
  const registeredAccounts: RegisteredAccount[] = [];
  const recoveryHints: RecoveryHint[] = [];
  const footprints: FootprintCandidate[] = [];
  const seenHints = new Set<string>();

  for (const row of payload.results) {
    const account = mapRow(payload.email, row);
    if (!account) continue;

    if (account.exists) {
      registeredAccounts.push(account);

      footprints.push({
        url: account.profileUrl || '',
        title: `${capitalize(account.platform)} account`,
        snippet: buildSnippet(account),
        sourceType: 'email_lookup',
        sourceName: 'holehe',
        confidence: account.rateLimited ? 0.7 : 0.95,
        data: {
          email: payload.email,
          category: 'registered_account',
          platform: account.platform,
          domain: account.domain,
          rateLimited: account.rateLimited,
        },
      });

      for (const hint of hintsFromAccount(account)) {
        const key = `${hint.kind}:${hint.value}:${hint.platform}`;
        if (seenHints.has(key)) continue;
        seenHints.add(key);
        recoveryHints.push(hint);
      }
    }
  }

  const status = registeredAccounts.length > 0 ? 'found' : 'not_found';
  const dossier: EmailIntelligenceDossier = {
    provider: 'holehe',
    status,
    searchedAt: new Date().toISOString(),
    registeredAccounts,
    recoveryHints,
    stats: payload.stats,
  };

  return { footprints, dossier };
}

function mapRow(email: string, row: HoleheRawResult): (RegisteredAccount & { exists: boolean }) | null {
  const platform = String(row.name || 'unknown');
  const domain = String(row.domain || platform);
  const exists = Boolean(row.exists);
  const fullName = extractFullName(row.others);

  return {
    platform,
    domain,
    profileUrl: exists ? profileUrlFor(platform, domain, row.others) : null,
    recoveryEmail: row.emailrecovery || null,
    recoveryPhone: row.phoneNumber || null,
    fullName,
    rateLimited: Boolean(row.rateLimit),
    metadata: {
      email,
      error: Boolean(row.error),
      others: row.others ?? null,
    },
    exists,
  };
}

function hintsFromAccount(account: RegisteredAccount): RecoveryHint[] {
  const hints: RecoveryHint[] = [];

  if (account.fullName) {
    hints.push({
      value: account.fullName,
      source: 'holehe',
      platform: account.platform,
      kind: 'name',
    });
  }
  if (account.recoveryEmail) {
    hints.push({
      value: account.recoveryEmail,
      source: account.domain,
      platform: account.platform,
      kind: 'email',
    });
  }
  if (account.recoveryPhone) {
    hints.push({
      value: account.recoveryPhone,
      source: account.domain,
      platform: account.platform,
      kind: 'phone',
    });
  }

  return hints;
}

function buildSnippet(account: RegisteredAccount): string {
  const parts = [
    `Registered on ${account.domain}`,
    account.fullName ? `Name hint: ${account.fullName}` : null,
    account.recoveryEmail ? `Recovery email: ${account.recoveryEmail}` : null,
    account.recoveryPhone ? `Recovery phone: ${account.recoveryPhone}` : null,
    account.rateLimited ? 'Rate limited — verify manually' : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
