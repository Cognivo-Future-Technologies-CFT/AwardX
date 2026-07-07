/** Recognize public voting rounds from column type, settings.type, or evaluationLogic. */
export function isPublicVotingRoundRecord(round: {
  type?: string | null;
  settings?: Record<string, unknown> | null;
} | null | undefined): boolean {
  if (!round) return false;

  const columnType = String(round.type || '').toLowerCase().trim();
  const settings =
    round.settings && typeof round.settings === 'object' && !Array.isArray(round.settings)
      ? round.settings
      : {};
  const settingsType = String(settings.type || '').toLowerCase().trim();
  const evaluationLogic = String(settings.evaluationLogic || '').toLowerCase().trim();

  const votingTypes = new Set(['public voting', 'public rating', 'public', 'voting']);

  if (votingTypes.has(columnType) || votingTypes.has(settingsType)) {
    return true;
  }

  return evaluationLogic === 'voting';
}
