/** Person intelligence feature flags and rate limits. */

export function isPersonIntelligenceEnabled(): boolean {
  return process.env.PERSON_INTELLIGENCE_ENABLED !== 'false';
}

export function isHoleheEnabled(): boolean {
  return process.env.HOLEHE_ENABLED !== 'false';
}

export function getHolehePython(): string {
  return process.env.HOLEHE_PYTHON?.trim() || 'python3';
}

export function getHoleheScriptPath(): string | null {
  const value = process.env.HOLEHE_SCRIPT?.trim();
  return value || null;
}

export function getHoleheTimeoutMs(): number {
  const raw = Number(process.env.HOLEHE_TIMEOUT_MS || 180_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 180_000;
}

export function isHolehePasswordRecoveryEnabled(): boolean {
  return process.env.HOLEHE_PASSWORD_RECOVERY === 'true';
}

export function isEmailIntelligenceConfigured(): boolean {
  return (
    isHoleheEnabled()
    || Boolean(process.env.HUNTER_API_KEY?.trim())
  );
}

export const INTELLIGENCE_LIMITS = {
  maxSearchesPerClaim: 5,
  maxCrawlsPerClaim: 3,
  maxSearchesPerPerson: 10,
  footprintRefreshTtlDays: 30,
  documentCacheTtlDays: 7,
};
