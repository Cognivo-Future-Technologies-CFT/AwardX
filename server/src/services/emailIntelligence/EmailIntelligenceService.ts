import type {
  EmailIntelligenceDossier,
  EmailIntelligenceResult,
  FootprintCandidate,
} from './types.js';
import { holeheProvider } from './providers/holeheProvider.js';
import { hunterProvider } from './providers/hunterProvider.js';
import type { EmailIntelligenceProvider } from './providers/types.js';

const JUNK_URL_PATTERNS = [/google\.com\/search/i];

function dedupeFootprints(footprints: FootprintCandidate[]): FootprintCandidate[] {
  const seen = new Set<string>();
  const out: FootprintCandidate[] = [];

  for (const fp of footprints) {
    if (fp.url && JUNK_URL_PATTERNS.some((p) => p.test(fp.url))) continue;
    const key = fp.url || `${fp.sourceName}:${fp.data.category}:${fp.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fp);
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}

function mergeDossiers(
  primary: EmailIntelligenceDossier | null,
  secondary: EmailIntelligenceDossier | null,
): EmailIntelligenceDossier | null {
  if (!primary) return secondary;
  if (!secondary) return primary;
  if (primary.status === 'found') return primary;
  return secondary.status === 'found' ? secondary : primary;
}

export class EmailIntelligenceService {
  constructor(private readonly providers: EmailIntelligenceProvider[]) {}

  async enrich(email: string): Promise<EmailIntelligenceResult> {
    const footprints: FootprintCandidate[] = [];
    let dossier: EmailIntelligenceDossier | null = null;

    for (const provider of this.providers) {
      if (!(await provider.isAvailable())) continue;

      const result = await provider.enrich(email);
      footprints.push(...result.footprints);
      dossier = mergeDossiers(dossier, result.dossier);
    }

    return {
      footprints: dedupeFootprints(footprints),
      dossier,
    };
  }
}

let defaultService: EmailIntelligenceService | null = null;

export function getEmailIntelligenceService(): EmailIntelligenceService {
  if (!defaultService) {
    defaultService = new EmailIntelligenceService([holeheProvider, hunterProvider]);
  }
  return defaultService;
}

/** Convenience entrypoint for footprint collection. */
export async function collectEmailIntelligence(email: string): Promise<EmailIntelligenceResult> {
  return getEmailIntelligenceService().enrich(email);
}

export { isHoleheRuntimeAvailable } from './holeheRunner.js';
