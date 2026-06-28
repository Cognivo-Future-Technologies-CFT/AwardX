/**
 * Claim Verifier
 *
 * Verifies claims by searching the web, analyzing results with MiniLM
 * semantic similarity, scoring source authority, and calculating
 * an overall confidence score.
 */

import { getSupabaseAdmin } from '../supabase.js';
import { generateEmbedding } from './submissionEmbedder.js';
import { calculateConfidence } from './confidenceCalculator.js';
import { webSearch, crawlUrl } from './sources/webSearchSource.js';
import { bestChunkSimilarity } from './chunkEvidence.js';
import { INTELLIGENCE_LIMITS } from '../lib/intelligenceConfig.js';
import type { PersonProfile } from './identityResolver.js';

interface ClaimRow {
  id: string;
  claim_text: string;
  claim_type: string;
  claim_subject: string | null;
}

interface VerificationInput {
  relevanceScore: number;
  sourceUrl: string | null;
  supportsClaim: boolean | null;
  createdAt: string;
}

/**
 * Generate search queries from a claim and person name.
 * Uses claim-type templates for domain-specific searches.
 */
function buildSearchQueries(claim: ClaimRow, person: PersonProfile): string[] {
  const namePart = person.primaryName || person.email.split('@')[0];
  const subjectPart = claim.claim_subject || claim.claim_text.slice(0, 100).replace(/[.!?]+.*$/, '');
  const queries = [`"${namePart}" "${subjectPart}"`, `"${namePart}" ${subjectPart}`];

  const lower = claim.claim_text.toLowerCase();

  if (claim.claim_type === 'achievement') {
    if (lower.includes('badminton')) {
      queries.push(`site:bai.org.in "${namePart}" badminton`);
      queries.push(`"${namePart}" badminton state championship`);
    }
    if (lower.includes('cricket')) {
      queries.push(`"${namePart}" cricket state player`);
    }
  }

  if (claim.claim_type === 'education') {
    queries.push(`"${namePart}" ${subjectPart} alumni`);
    queries.push(`site:linkedin.com "${namePart}" education`);
  }

  if (claim.claim_type === 'experience') {
    queries.push(`site:linkedin.com "${namePart}" ${subjectPart}`);
  }

  return [...new Set(queries)].slice(0, INTELLIGENCE_LIMITS.maxSearchesPerClaim);
}

/**
 * Compute MiniLM semantic similarity between claim text and source text.
 * Returns a score from 0 (completely different) to 1 (identical meaning).
 */
async function semanticSimilarity(claimText: string, sourceText: string): Promise<number> {
  try {
    // Truncate to avoid excessive API cost
    const claimSample = claimText.slice(0, 2000);
    const sourceSample = sourceText.slice(0, 2000);

    const [claimEmbedding, sourceEmbedding] = await Promise.all([
      generateEmbedding(claimSample),
      generateEmbedding(sourceSample),
    ]);

    // Cosine similarity
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < claimEmbedding.length; i++) {
      dotProduct += claimEmbedding[i] * sourceEmbedding[i];
      magA += claimEmbedding[i] * claimEmbedding[i];
      magB += sourceEmbedding[i] * sourceEmbedding[i];
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  } catch (err) {
    console.warn('[claimVerifier] Semantic similarity failed:', err);
    return 0;
  }
}

/**
 * Determine if a source's content supports, contradicts, or is neutral
 * toward a claim, based on semantic similarity and keyword signals.
 */
function evaluateSourceAlignment(
  similarity: number,
  sourceText: string,
  claimText: string,
): { supportsClaim: boolean | null; confidence: number } {
  const sourceLower = sourceText.toLowerCase();
  const claimLower = claimText.toLowerCase();

  // Strong semantic match strongly suggests support
  if (similarity > 0.65) {
    return { supportsClaim: true, confidence: similarity };
  }

  // Check for explicit contradiction keywords
  const negationWords = ['no evidence', 'not true', 'false claim', 'disputed', 'unsubstantiated'];
  const hasNegation = negationWords.some((w) => sourceLower.includes(w));

  if (hasNegation && similarity > 0.3) {
    return { supportsClaim: false, confidence: 0.3 };
  }

  // Moderate similarity — check for keyword overlap
  const claimWords = new Set(
    claimLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );

  let matches = 0;
  for (const word of claimWords) {
    if (sourceLower.includes(word)) matches++;
  }

  const wordOverlap = claimWords.size > 0 ? matches / claimWords.size : 0;

  if (wordOverlap > 0.3) {
    return { supportsClaim: true, confidence: similarity * 0.7 + wordOverlap * 0.3 };
  }

  // Low similarity — neutral
  return { supportsClaim: null, confidence: similarity };
}

/**
 * Verify a single claim by:
 * 1. Searching the web for the person + claim
 * 2. Crawling relevant pages
 * 3. Computing semantic similarity
 * 4. Scoring authority
 * 5. Calculating overall confidence
 */
export async function verifyClaim(
  claimId: string,
  person: PersonProfile,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch claim
  const { data: claim } = await supabase
    .from('submission_claims')
    .select('*')
    .eq('id', claimId)
    .single();

  if (!claim) {
    console.warn(`[claimVerifier] Claim ${claimId} not found`);
    return;
  }

  const claimRow: ClaimRow = {
    id: claim.id,
    claim_text: claim.claim_text,
    claim_type: claim.claim_type,
    claim_subject: claim.claim_subject,
  };

  // Mark as verifying
  await supabase
    .from('submission_claims')
    .update({ verification_status: 'verifying' })
    .eq('id', claimId);

  // Build search queries and search
  const queries = buildSearchQueries(claimRow, person);
  const searchResults: Awaited<ReturnType<typeof webSearch>> = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    const results = await webSearch(query, 5);
    for (const r of results) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        searchResults.push(r);
      }
    }
  }

  if (searchResults.length === 0) {
    // No results found — mark as unverifiable
    const result = calculateConfidence([]);
    await supabase
      .from('submission_claims')
      .update({
        verification_status: 'unverifiable',
        verification_confidence: 0,
        verification_summary: 'No evidence found in web search',
      })
      .eq('id', claimId);
    return;
  }

  // Process each result
  interface ProcessedSource {
    sourceUrl: string;
    sourceTitle: string;
    sourceSnippet: string;
    extractedEvidence: string;
    supportsClaim: boolean | null;
    relevanceScore: number;
    authorityScore: number;
    createdAt: string;
  }

  const processed: ProcessedSource[] = [];

  for (const result of searchResults.slice(0, INTELLIGENCE_LIMITS.maxCrawlsPerClaim + 2)) {
    // Crawl the page for full content
    let fullContent: string | null = null;
    if (result.snippet && result.snippet.length > 50) {
      fullContent = result.snippet;
    }

    // Try to crawl for more content (best-effort, don't block)
    try {
      const crawled = await crawlUrl(result.url);
      if (crawled) fullContent = crawled;
    } catch {
      // Use snippet only
    }

    const sourceText = fullContent || result.snippet || '';
    const { similarity, evidence } = await bestChunkSimilarity(claimRow.claim_text, sourceText);

    const { supportsClaim: alignment, confidence: alignmentConfidence } =
      evaluateSourceAlignment(similarity, sourceText, claimRow.claim_text);

    // Authority score based on domain
    const authorityScore = scoreDomainAuthority(result.url);

    processed.push({
      sourceUrl: result.url,
      sourceTitle: result.title || '',
      sourceSnippet: result.snippet?.slice(0, 500) || '',
      extractedEvidence: evidence.slice(0, 2000),
      supportsClaim: alignment,
      relevanceScore: alignmentConfidence,
      authorityScore,
      createdAt: new Date().toISOString(),
    });
  }

  // Store verifications
  const verificationRows = processed.map((p) => ({
    claim_id: claimId,
    source_url: p.sourceUrl,
    source_title: p.sourceTitle,
    source_snippet: p.sourceSnippet,
    extracted_evidence: p.extractedEvidence,
    supports_claim: p.supportsClaim,
    verification_method: 'web_search' as const,
    relevance_score: p.relevanceScore,
    authority_score: p.authorityScore,
    confidence: p.relevanceScore * 0.6 + p.authorityScore * 0.4,
  }));

  const { error: insertError } = await supabase
    .from('claim_verifications')
    .insert(verificationRows);

  if (insertError) {
    console.error('[claimVerifier] Failed to store verifications:', insertError);
  }

  // Calculate overall confidence
  const verifInputs: VerificationInput[] = processed.map((p) => ({
    relevanceScore: p.relevanceScore,
    sourceUrl: p.sourceUrl,
    supportsClaim: p.supportsClaim,
    createdAt: p.createdAt,
  }));

  const { confidence, label } = calculateConfidence(verifInputs);

  // Determine status
  let status: string;
  if (confidence >= 0.50) {
    status = 'verified';
  } else if (confidence >= 0.10) {
    status = 'disputed';
  } else {
    status = 'unverifiable';
  }

  // Update claim
  await supabase
    .from('submission_claims')
    .update({
      verification_status: status,
      verification_confidence: confidence,
      verification_summary: label,
    })
    .eq('id', claimId);

  console.log(
    `[claimVerifier] Verified claim ${claimId}: ${label} (${(confidence * 100).toFixed(0)}%) ` +
      `from ${processed.length} sources`,
  );
}

/**
 * Score domain authority (0-1) by URL.
 */
function scoreDomainAuthority(url: string): number {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Official/education domains
    if (hostname.endsWith('.gov') || hostname.endsWith('.gov.in')) return 0.95;
    if (hostname.endsWith('.edu') || hostname.endsWith('.ac.in')) return 0.90;

    // Known authoritative
    const highAuth = new Set([
      'wikipedia.org',
      'linkedin.com',
      'reuters.com',
      'bbc.com',
      'theguardian.com',
    ]);
    if (highAuth.has(hostname)) return 0.85;

    // Major news
    if (hostname.includes('news') || hostname.includes('times') || hostname.includes('post')) return 0.70;

    // Social media
    if (['twitter.com', 'x.com', 'facebook.com', 'instagram.com'].includes(hostname)) return 0.50;

    // Personal blogs / unknown
    return 0.40;
  } catch {
    return 0.30;
  }
}

/**
 * Extract the most relevant passage from source text for a claim.
 * Finds the paragraph with the highest word overlap with the claim.
 */
function extractRelevantPassage(sourceText: string, claimText: string): string {
  const claimLower = claimText.toLowerCase();
  const claimWords = new Set(
    claimLower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3),
  );

  if (claimWords.size === 0) return sourceText.slice(0, 500);

  // Split into paragraphs
  const paragraphs = sourceText.split(/\n\n+/);
  let bestParagraph = '';
  let bestScore = 0;

  for (const para of paragraphs) {
    if (para.length < 20) continue;
    const paraLower = para.toLowerCase();
    let matches = 0;
    for (const word of claimWords) {
      if (paraLower.includes(word)) matches++;
    }
    const score = matches / claimWords.size;
    if (score > bestScore) {
      bestScore = score;
      bestParagraph = para;
    }
  }

  return bestParagraph || sourceText.slice(0, 500);
}

/**
 * Verify all pending claims for a submission.
 */
export async function verifySubmissionClaims(
  submissionId: string,
  person: PersonProfile,
): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data: claims } = await supabase
    .from('submission_claims')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('verification_status', 'pending');

  if (!claims || claims.length === 0) return 0;

  // Verify each claim sequentially to rate-limit external API calls
  for (const claim of claims) {
    try {
      await verifyClaim(claim.id, person);
    } catch (err) {
      console.error(`[claimVerifier] Failed to verify claim ${claim.id}:`, err);
    }
  }

  return claims.length;
}
