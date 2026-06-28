import type { EmailIntelligenceProvider } from './types.js';
import type { EmailIntelligenceResult } from '../types.js';
import { isHoleheRuntimeAvailable, runHoleheScan } from '../holeheRunner.js';
import { mapHolehePayload } from '../mappers/holeheMapper.js';

export const holeheProvider: EmailIntelligenceProvider = {
  id: 'holehe',

  async isAvailable(): Promise<boolean> {
    return isHoleheRuntimeAvailable();
  },

  async enrich(email: string): Promise<EmailIntelligenceResult> {
    try {
      const payload = await runHoleheScan(email);
      const result = mapHolehePayload(payload);
      console.log(
        `[holehe] ${email}: ${result.dossier?.stats.totalFound ?? 0} accounts found ` +
        `(${result.dossier?.stats.totalChecked ?? 0} sites checked)`,
      );
      return result;
    } catch (err) {
      console.warn('[holehe] Scan failed:', err);
      return {
        footprints: [],
        dossier: {
          provider: 'holehe',
          status: 'unavailable',
          searchedAt: new Date().toISOString(),
          registeredAccounts: [],
          recoveryHints: [],
          stats: { totalChecked: 0, totalFound: 0, rateLimited: 0, errors: 1 },
          unavailableReason: err instanceof Error ? err.message : 'Holehe scan failed',
        },
      };
    }
  },
};
