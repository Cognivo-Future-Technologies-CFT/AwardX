import { getEffectivePaymentProgramId, normalizeIntegrationSources } from '../../lib/programIntegrations';

type SupabaseClient = {
  from: (table: string) => any;
};

export async function resolveEffectivePaymentProgramId(
  supabase: SupabaseClient,
  programId: string,
): Promise<string> {
  const { data } = await supabase
    .from('programs')
    .select('id, integration_sources')
    .eq('id', programId)
    .maybeSingle();

  if (!data) return programId;

  return getEffectivePaymentProgramId(
    data.id as string,
    normalizeIntegrationSources(data.integration_sources),
  );
}
