/**
 * Claim Extractor
 *
 * NLP-based extraction of verifiable claims from submission text.
 * Uses pattern matching to classify claims into types (achievement, education, etc.)
 * and extracts the normalized claim subject.
 */

import { getSupabaseAdmin } from '../supabase.js';
import { nerClaimsFromSentence } from './nerExtractor.js';

export interface ExtractedClaim {
  claimText: string;
  claimType: ClaimType;
  claimSubject: string | null;
  confidence: number;
}

export type ClaimType = 'achievement' | 'education' | 'experience' | 'skill' | 'affiliation' | 'award';

// ─── Claim pattern definitions ────────────────────────────────────────────

interface ClaimPattern {
  type: ClaimType;
  patterns: RegExp[];
  weight: number;       // 0-1, how strongly this pattern indicates a claim
  subjectExtractor: (match: RegExpExecArray, sentence: string) => string | null;
}

const CLAIM_PATTERNS: ClaimPattern[] = [
  {
    type: 'achievement',
    patterns: [
      /\b(won|won the|won a|secured|secured the|secured a)\b.{0,40}(championship|champion|title|medal|trophy|award|prize|competition|tournament|race|match|game|gold|silver|bronze)/i,
      /\b(ranked|ranked as|ranked #|ranked no\.?)\b.{0,40}(top|#?\d|first|second|third)/i,
      /\b(selected|chosen|picked)\b.{0,30}\b(for|as|among)\b.{0,40}(team|represent|national|state|county|competition|program|scholarship)/i,
      /\b(received|awarded|honoured|honored|recognised|recognized)\b.{0,40}(award|prize|scholarship|fellowship|grant|recognition|honour|honor|medal)/i,
      /\b(champion|championship|title)\b.{0,60}\b(winner|won|winning|gold|silver|bronze)/i,
      /\b(achieved|accomplished|completed|successfully)\b.{0,40}(certification|certificate|qualification|milestone|target|goal)/i,
    ],
    weight: 0.85,
    subjectExtractor: (_match, sentence) => {
      // Extract the key achievement subject
      const subjMatch = sentence.match(/\b(state|national|regional|district|county|world|international|university|school|college)\s.{0,40}\b(champion|winner|player|rank|title|medal|award)\b/i);
      return subjMatch ? subjMatch[0].trim() : null;
    },
  },
  {
    type: 'education',
    patterns: [
      /\b(graduated|graduate)\b.{0,50}\b(from|with|in)\b.{0,60}(university|college|school|institute|academy|bachelor|master|phd|doctorate|diploma|degree)/i,
      /\b(bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|doctorate|mba|b\.?tech|m\.?tech|b\.?sc|m\.?sc|b\.?a|m\.?a)\b.{0,50}\b(in|of|from)\b/i,
      /\b(studied|pursued|pursuing|enrolled|attended)\b.{0,50}(university|college|school|institute|program|course)/i,
      /\b(certified|certification|certificate)\b.{0,60}\b(in|from|by|as)\b/i,
    ],
    weight: 0.80,
    subjectExtractor: (_match, sentence) => {
      const edu = sentence.match(/\b(Bachelor(?:'s)?|Master(?:'s)?|Ph\.?D\.?|MBA|B\.?Tech|M\.?Tech|Diploma|Degree|Certification|Certificate)\b.{0,60}/i);
      return edu ? edu[0].trim().slice(0, 120) : null;
    },
  },
  {
    type: 'experience',
    patterns: [
      /\b(worked at|worked for|employed at|employed by)\b.{0,60}(company|firm|startup|corp|inc|llc|ltd|organization|agency|studio|lab)/i,
      /\b(founded|co-founded|started|built|launched)\b.{0,60}(company|startup|venture|business|platform|product|project|initiative)/i,
      /\b(led|lead|managed|headed|directed)\b.{0,50}(team|department|division|project|program|initiative|unit)/i,
      /\b(years of experience|years experience)\b.{0,40}(in|with|as|at)/i,
    ],
    weight: 0.75,
    subjectExtractor: (_match, sentence) => {
      const exp = sentence.match(/\b(at|for|with|as)\s([A-Z][A-Za-z0-9\s.&]+?)(?:\s(?:where|and|\.|,))?/);
      return exp ? exp[2]?.trim().slice(0, 60) ?? null : null;
    },
  },
  {
    type: 'skill',
    patterns: [
      /\b(proficient in|proficient at|expert in|expert at|skilled in|skilled at|strong in)\b.{0,60}/i,
      /\b(experienced in|experienced with|knowledge of|knowledgeable about|familiar with)\b.{0,60}/i,
      /\b(specialize in|specialized in|specialises in|specialised in)\b.{0,60}/i,
      /\b(fluent in|native in|proficient in)\s{0,20}(language|languages|english|spanish|french|german|mandarin|hindi|japanese)/i,
    ],
    weight: 0.60,
    subjectExtractor: (_match, sentence) => {
      const skill = sentence.match(/(?:in|at|with|about)\s+([A-Za-z][A-Za-z0-9\s+#.]+?)(?:[,.]|and\s|where\s|$)/);
      return skill ? skill[1]?.trim().slice(0, 60) ?? null : null;
    },
  },
  {
    type: 'affiliation',
    patterns: [
      /\b(member of|member at|part of|active member)\b.{0,60}(organization|club|society|association|committee|board|council|group|team)/i,
      /\b(represent|representing|represented)\b.{0,50}(organization|company|university|college|school|club|team|country|state)/i,
      /\b(volunteer|volunteered|volunteering)\b.{0,50}(at|for|with|as)\b/i,
      /\b(intern|interned|internship)\b.{0,40}(at|with|for)\b/i,
    ],
    weight: 0.65,
    subjectExtractor: (_match, sentence) => {
      const aff = sentence.match(/(?:at|for|with|of)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s(?:where|and|\.|,))?/);
      return aff ? aff[1]?.trim().slice(0, 60) ?? null : null;
    },
  },
  {
    type: 'award',
    patterns: [
      /\b(received|won|awarded|honoured|honored|granted)\b.{0,30}(?:the\s)?([A-Z][A-Za-z\s]+(?:Award|Prize|Scholarship|Fellowship|Grant|Honour|Honor|Medal))/i,
      /\b(recipient|honoree|honouree|winner)\b.{0,40}(?:of\s)?(?:the\s)?([A-Z][A-Za-z\s]+(?:Award|Prize|Scholarship|Fellowship|Grant))/i,
      /\b(named|selected as|chosen as)\b.{0,40}(?:a\s)?([A-Z][A-Za-z\s]+(?:winner|finalist|recipient|scholar|fellow))/i,
    ],
    weight: 0.90,
    subjectExtractor: (_match, sentence) => {
      const award = sentence.match(/([A-Z][A-Za-z\s]+(?:Award|Prize|Scholarship|Fellowship|Grant|Honour|Honor|Medal|Winner|Finalist))/);
      return award ? award[1]?.trim().slice(0, 80) ?? null : null;
    },
  },
];

// ─── Sentence splitting (matches TextRank pattern in submissionSummarizer.ts) ───

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\n{2,}/g, '. ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const raw = cleaned.match(/[^.!?\n]+[.!?]*(\s|$)/g) || [cleaned];
  return raw.map((s) => s.trim()).filter((s) => s.length > 15 && s.length < 500);
}

// ─── Claim extraction logic ────────────────────────────────────────────────

/**
 * Extract verifiable claims from processed submission text.
 * Runs pattern-based classification on each sentence.
 */
export function extractClaimsFromText(text: string): ExtractedClaim[] {
  const sentences = splitSentences(text);
  const claims: ExtractedClaim[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    let matched = false;
    for (const patternDef of CLAIM_PATTERNS) {
      for (const regex of patternDef.patterns) {
        const match = regex.exec(sentence);
        if (match) {
          const normalized = sentence.toLowerCase().trim().slice(0, 100);
          if (seen.has(normalized)) { matched = true; break; }
          seen.add(normalized);

          const claimSubject = patternDef.subjectExtractor(match, sentence);
          claims.push({
            claimText: sentence.trim(),
            claimType: patternDef.type,
            claimSubject: claimSubject ?? fallbackSubject(sentence, patternDef.type),
            confidence: patternDef.weight,
          });
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    // NER pass for claims regex missed
    if (!matched) {
      const nerClaims = nerClaimsFromSentence(sentence);
      for (const nc of nerClaims) {
        const normalized = sentence.toLowerCase().trim().slice(0, 100);
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        claims.push({
          claimText: nc.claimText,
          claimType: nc.claimType,
          claimSubject: nc.claimSubject,
          confidence: nc.confidence,
        });
      }
    }
  }

  return claims;
}

/**
 * Fallback subject extraction when the pattern-specific extractor fails.
 */
function fallbackSubject(sentence: string, type: ClaimType): string | null {
  // For achievements, try to find the key noun phrase
  if (type === 'achievement') {
    const np = sentence.match(/(?:a|an|the)\s+([A-Za-z\s]+?)(?:\s+(?:in|at|for|with|\.|,))/i);
    return np ? np[1]?.trim().slice(0, 60) ?? null : null;
  }
  return null;
}

/**
 * Extract claims from a submission's processed text and persist them to DB.
 * Returns the number of claims extracted.
 */
export async function extractAndStoreClaims(
  submissionId: string,
  processedText: string,
): Promise<number> {
  if (!processedText || processedText.trim().length < 20) return 0;

  const claims = extractClaimsFromText(processedText);
  if (claims.length === 0) return 0;

  const supabase = getSupabaseAdmin();

  // Remove old claims for this submission (idempotent re-processing)
  await supabase.from('submission_claims').delete().eq('submission_id', submissionId);

  const rows = claims.map((claim) => ({
    submission_id: submissionId,
    claim_text: claim.claimText.slice(0, 2000),
    claim_type: claim.claimType,
    claim_subject: claim.claimSubject?.slice(0, 300) ?? null,
    verification_status: 'pending' as const,
    metadata: { extractionConfidence: claim.confidence },
  }));

  const { error } = await supabase.from('submission_claims').insert(rows);
  if (error) {
    console.error('[claimExtractor] Failed to store claims:', error);
    throw error;
  }

  console.log(`[claimExtractor] Extracted ${rows.length} claims from submission ${submissionId}`);
  return rows.length;
}
