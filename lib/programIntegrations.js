export function normalizeIntegrationSources(raw) {
    if (!raw || typeof raw !== 'object')
        return {};
    const record = raw;
    const next = {};
    for (const provider of ['resend', 'didit', 'payment']) {
        const value = record[provider];
        if (typeof value === 'string' && value) {
            next[provider] = value;
        }
    }
    return next;
}
export function getIntegrationSourceProgramId(sources, provider) {
    const value = sources?.[provider];
    return typeof value === 'string' && value ? value : null;
}
export function getEffectivePaymentProgramId(programId, sources) {
    return getIntegrationSourceProgramId(sources, 'payment') || programId;
}
