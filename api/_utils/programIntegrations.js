import { getEffectivePaymentProgramId, normalizeIntegrationSources } from '../../lib/programIntegrations';
export async function resolveEffectivePaymentProgramId(supabase, programId) {
    const { data } = await supabase
        .from('programs')
        .select('id, integration_sources')
        .eq('id', programId)
        .maybeSingle();
    if (!data)
        return programId;
    return getEffectivePaymentProgramId(data.id, normalizeIntegrationSources(data.integration_sources));
}
