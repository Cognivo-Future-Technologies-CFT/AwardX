/**
 * Lightweight NER-style entity extraction for claim subjects.
 * Uses capitalization patterns and known entity keywords (no heavy model load).
 */

const SPORT_KEYWORDS = new Set([
  'badminton', 'cricket', 'football', 'soccer', 'tennis', 'basketball',
  'hockey', 'swimming', 'athletics', 'volleyball', 'table tennis',
]);

const LEVEL_KEYWORDS = ['state', 'national', 'international', 'regional', 'district', 'world'];

const EDU_KEYWORDS = ['university', 'college', 'institute', 'school', 'b.tech', 'm.tech', 'mba', 'phd'];

export interface ExtractedEntity {
  text: string;
  type: 'achievement' | 'education' | 'organization' | 'location' | 'skill';
  confidence: number;
}

/** Extract named entities from a sentence using pattern heuristics. */
export function extractEntities(sentence: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lower = sentence.toLowerCase();

  // Sport + level achievements
  for (const sport of SPORT_KEYWORDS) {
    if (lower.includes(sport)) {
      const level = LEVEL_KEYWORDS.find((l) => lower.includes(l));
      const text = level ? `${level} ${sport} player` : sport;
      entities.push({ text, type: 'achievement', confidence: 0.7 });
    }
  }

  // Capitalized proper nouns (simple NER proxy)
  const properNouns = sentence.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) || [];
  for (const noun of properNouns.slice(0, 3)) {
    if (noun.length < 3) continue;
    const nounLower = noun.toLowerCase();
    if (EDU_KEYWORDS.some((k) => nounLower.includes(k))) {
      entities.push({ text: noun, type: 'education', confidence: 0.65 });
    } else if (!['I', 'My', 'The', 'A', 'An'].includes(noun)) {
      entities.push({ text: noun, type: 'organization', confidence: 0.5 });
    }
  }

  return entities;
}

/** Build additional claims from NER entities not caught by regex. */
export function nerClaimsFromSentence(sentence: string): Array<{
  claimText: string;
  claimType: 'achievement' | 'education';
  claimSubject: string;
  confidence: number;
}> {
  const entities = extractEntities(sentence);
  const claims: Array<{
    claimText: string;
    claimType: 'achievement' | 'education';
    claimSubject: string;
    confidence: number;
  }> = [];

  for (const entity of entities) {
    if (entity.type === 'achievement' || entity.type === 'education') {
      claims.push({
        claimText: sentence.trim(),
        claimType: entity.type,
        claimSubject: entity.text,
        confidence: entity.confidence * 0.8,
      });
    }
  }

  return claims;
}
