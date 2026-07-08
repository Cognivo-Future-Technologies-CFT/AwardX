export type IntegrationProvider = 'resend' | 'didit' | 'payment';

export type ProgramIntegrationSources = Partial<Record<IntegrationProvider, string | null>>;

export function normalizeIntegrationSources(raw: unknown): ProgramIntegrationSources {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const next: ProgramIntegrationSources = {};

  for (const provider of ['resend', 'didit', 'payment'] as const) {
    const value = record[provider];
    if (typeof value === 'string' && value) {
      next[provider] = value;
    }
  }

  return next;
}

export function getIntegrationSourceProgramId(
  sources: ProgramIntegrationSources | undefined,
  provider: IntegrationProvider,
): string | null {
  const value = sources?.[provider];
  return typeof value === 'string' && value ? value : null;
}

export function getEffectivePaymentProgramId(
  programId: string,
  sources?: ProgramIntegrationSources,
): string {
  return getIntegrationSourceProgramId(sources, 'payment') || programId;
}
