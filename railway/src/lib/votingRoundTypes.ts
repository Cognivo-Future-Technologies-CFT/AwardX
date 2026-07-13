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

/** True when the public can still cast votes (status active, or open date window if status drifted). */
export function isVotingRoundOpen(round: {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
} | null | undefined): boolean {
  if (!round) return false;
  const status = String(round.status || '').toLowerCase().trim();
  if (status === 'cancelled' || status === 'draft') return false;
  if (status === 'active') return true;

  // ponytail: status can lag dates (e.g. marked completed while end_date is still ahead)
  const now = Date.now();
  const start = round.start_date ? Date.parse(round.start_date) : NaN;
  const end = round.end_date ? Date.parse(round.end_date) : NaN;
  if (Number.isFinite(start) && Number.isFinite(end)) {
    return now >= start && now <= end;
  }
  return false;
}
