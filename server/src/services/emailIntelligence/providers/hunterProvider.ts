import { hunterEmailLookup } from '../../sources/hunterSource.js';
import type { EmailIntelligenceProvider } from './types.js';
import type { EmailIntelligenceResult, FootprintCandidate } from '../types.js';

export const hunterProvider: EmailIntelligenceProvider = {
  id: 'hunter',

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env.HUNTER_API_KEY?.trim());
  },

  async enrich(email: string): Promise<EmailIntelligenceResult> {
    const hunterResults = await hunterEmailLookup(email);
    const footprints: FootprintCandidate[] = hunterResults.map((r) => ({
      url: r.url,
      title: r.title,
      snippet: r.snippet,
      sourceType: 'email_lookup',
      sourceName: 'hunter',
      confidence: r.confidence,
      data: { ...r.data, category: 'social_profile' },
    }));

    return { footprints, dossier: null };
  },
};
