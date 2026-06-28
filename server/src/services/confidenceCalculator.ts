/**
 * Confidence Calculator
 *
 * Multi-factor confidence scoring for claim verifications.
 * Combines semantic similarity, source authority, corroboration, and recency
 * into a single 0-1 confidence score.
 */

export interface VerificationFactor {
  label: string;
  weight: number;
  score: number;
  details: string;
}

export interface ConfidenceResult {
  confidence: number;
  factors: VerificationFactor[];
  label: string;
}

/** Authority scores by domain suffix/pattern */
const AUTHORITY_SCORES: Record<string, number> = {
  '.gov.in': 0.98,
  '.gov': 0.98,
  '.edu': 0.95,
  '.ac.in': 0.95,
  '.org': 0.70,
  '.io': 0.60,
};

const HIGH_AUTHORITY_DOMAINS = new Set([
  'wikipedia.org',
  'linkedin.com',
  'github.com',
  'reuters.com',
  'bbc.com',
  'bbc.co.uk',
  'theguardian.com',
  'timesofindia.indiatimes.com',
  'thehindu.com',
  'espn.com',
  'sportskeeda.com',
]);

const MEDIUM_AUTHORITY_DOMAINS = new Set([
  'medium.com',
  'dev.to',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'youtube.com',
]);

interface VerificationInput {
  relevanceScore: number;
  sourceUrl: string | null;
  supportsClaim: boolean | null;
  createdAt: string;
}

/**
 * Score a domain's authority (0-1).
 * .gov/.edu domains get highest, then known authoritative sources, then general.
 */
function scoreAuthority(url: string | null): number {
  if (!url) return 0.3;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Check known high-authority domains
    if (HIGH_AUTHORITY_DOMAINS.has(hostname)) return 0.90;
    if (MEDIUM_AUTHORITY_DOMAINS.has(hostname)) return 0.60;

    // Check TLD-based scoring
    for (const [suffix, score] of Object.entries(AUTHORITY_SCORES)) {
      if (hostname.endsWith(suffix)) return score;
    }

    // Default: moderate for established sites
    return 0.50;
  } catch {
    return 0.3;
  }
}

/**
 * Calculate recency score (0-1). Sources within last year get high scores,
 * older sources decay logarithmically.
 */
function scoreRecency(createdAt: string, now: Date = new Date()): number {
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays < 30) return 1.0;
  if (ageDays < 90) return 0.95;
  if (ageDays < 365) return 0.85;
  if (ageDays < 730) return 0.70;
  // Logarithmic decay after 2 years
  return Math.max(0.1, 1.0 - Math.log10(ageDays / 365 + 1) * 0.4);
}

/**
 * Calculate confidence from a set of verifications.
 *
 * Factors (with weights):
 * - SemanticOverlap (0.35): avg cosine similarity of verifications
 * - SourceAuthority (0.30): avg domain authority
 * - Corroboration   (0.20): number of independent sources (diminishing returns)
 * - Recency         (0.15): how recent the sources are
 */
export function calculateConfidence(
  verifications: VerificationInput[],
  now?: Date,
): ConfidenceResult {
  if (verifications.length === 0) {
    return {
      confidence: 0,
      factors: [
        { label: 'Semantic Overlap', weight: 0.35, score: 0, details: 'No verifications' },
        { label: 'Source Authority', weight: 0.30, score: 0, details: 'No verifications' },
        { label: 'Corroboration', weight: 0.20, score: 0, details: 'No sources found' },
        { label: 'Recency', weight: 0.15, score: 0, details: 'No verifications' },
      ],
      label: 'No Evidence Found',
    };
  }

  // Filter to supporting verifications (or include neutral if no supporting ones)
  const supporting = verifications.filter((v) => v.supportsClaim !== false);
  const relevant = supporting.length > 0 ? supporting : verifications;

  // 1. Semantic overlap
  const avgRelevance =
    relevant.reduce((sum, v) => sum + (v.relevanceScore || 0), 0) / relevant.length;

  // 2. Authority
  const avgAuthority =
    relevant.reduce((sum, v) => sum + scoreAuthority(v.sourceUrl), 0) / relevant.length;

  // 3. Corroboration — logarithmic diminishing returns
  const corroborationScore = Math.min(1, Math.log10(verifications.length + 1) / Math.log10(11));

  // 4. Recency — average of most recent 3
  const recencyScores = verifications.map((v) => scoreRecency(v.createdAt, now));
  const avgRecency = recencyScores.sort((a, b) => b - a).slice(0, 3).reduce((s, v) => s + v, 0) /
    Math.min(3, recencyScores.length);

  const factors: VerificationFactor[] = [
    {
      label: 'Semantic Overlap',
      weight: 0.35,
      score: avgRelevance,
      details: `${(avgRelevance * 100).toFixed(0)}% avg similarity across ${relevant.length} sources`,
    },
    {
      label: 'Source Authority',
      weight: 0.30,
      score: avgAuthority,
      details: `${(avgAuthority * 100).toFixed(0)}% avg domain authority`,
    },
    {
      label: 'Corroboration',
      weight: 0.20,
      score: corroborationScore,
      details: `${verifications.length} sources found`,
    },
    {
      label: 'Recency',
      weight: 0.15,
      score: avgRecency,
      details: `${(avgRecency * 100).toFixed(0)}% recency score`,
    },
  ];

  const confidence = factors.reduce((sum, f) => sum + f.weight * f.score, 0);

  const label = getConfidenceLabel(confidence);

  return { confidence: Math.round(confidence * 100) / 100, factors, label };
}

/**
 * Map a confidence score (0-1) to a human-readable label.
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.90) return 'Verified (Official)';
  if (confidence >= 0.70) return 'Verified (Strong)';
  if (confidence >= 0.50) return 'Likely';
  if (confidence >= 0.25) return 'Possible';
  if (confidence >= 0.10) return 'Unsubstantiated';
  return 'No Evidence Found';
}

/**
 * Get a display color for the confidence level.
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.70) return 'green';
  if (confidence >= 0.50) return 'yellow';
  if (confidence >= 0.25) return 'orange';
  if (confidence >= 0.10) return 'red';
  return 'gray';
}
