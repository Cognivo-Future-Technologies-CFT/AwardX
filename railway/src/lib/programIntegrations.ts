import { getSupabaseAdmin } from '../supabase.js';

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

export function mergeIntegrationSources(
  current: ProgramIntegrationSources,
  patch: Partial<Record<IntegrationProvider, string | null>>,
): ProgramIntegrationSources {
  const next: ProgramIntegrationSources = { ...current };

  for (const provider of ['resend', 'didit', 'payment'] as const) {
    if (!(provider in patch)) continue;
    const value = patch[provider];
    if (value) {
      next[provider] = value;
    } else {
      delete next[provider];
    }
  }

  return next;
}

export async function getProgramIntegrationContext(programId: string) {
  const supabase = getSupabaseAdmin();
  const { data: program } = await supabase
    .from('programs')
    .select('id, title, organization_id, integration_sources')
    .eq('id', programId)
    .maybeSingle();

  if (!program) return null;

  return {
    id: program.id as string,
    title: program.title as string,
    organizationId: program.organization_id as string,
    sources: normalizeIntegrationSources(program.integration_sources),
  };
}

export async function getProgramTitle(programId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('programs')
    .select('title')
    .eq('id', programId)
    .maybeSingle();
  return data?.title || null;
}

export function getIntegrationSourceProgramId(
  sources: ProgramIntegrationSources,
  provider: IntegrationProvider,
): string | null {
  const value = sources[provider];
  return typeof value === 'string' && value ? value : null;
}

export async function getEffectivePaymentProgramId(programId: string): Promise<string> {
  const context = await getProgramIntegrationContext(programId);
  if (!context) return programId;
  return getIntegrationSourceProgramId(context.sources, 'payment') || programId;
}

export async function buildIntegrationStatusEntry(input: {
  provider: IntegrationProvider;
  sources: ProgramIntegrationSources;
  programTitle: string;
  orgConnected: boolean;
  orgPayload: Record<string, unknown>;
  selfPayload?: Record<string, unknown>;
}) {
  const sourceProgramId = getIntegrationSourceProgramId(input.sources, input.provider);
  const sourceProgramTitle = sourceProgramId ? await getProgramTitle(sourceProgramId) : null;

  if (input.provider === 'payment') {
    const effectiveProgramId = sourceProgramId || undefined;
    return {
      connected: Boolean(input.selfPayload?.connected),
      source: sourceProgramId ? 'program' : 'self',
      sourceProgramId,
      sourceProgramTitle,
      effectiveProgramId: effectiveProgramId || null,
      ...input.selfPayload,
    };
  }

  return {
    connected: input.orgConnected,
    source: sourceProgramId ? 'program' : input.orgConnected ? 'organization' : null,
    sourceProgramId,
    sourceProgramTitle,
    ...input.orgPayload,
  };
}
