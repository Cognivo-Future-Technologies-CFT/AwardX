/**
 * Submission Processing Pipeline
 *
 * Runs once per submission on the server:
 *   1. Extract all text (title, description, form responses, attachments)
 *   2. Parse PDF/DOCX/TXT attachments
 *   3. AI detection (percentage + confidence)
 *   4. Extractive summary (saved, not recomputed on client)
 *   5. Vector embeddings for org-wide similarity search
 */

import { getSupabaseAdmin } from '../supabase.js';
import { detectAIContent } from './aiDetector.js';
import { generateChunkedEmbeddings } from './submissionEmbedder.js';
import { summarizeText } from './submissionSummarizer.js';
import { parseDocuments, type SubmissionFile } from './documentParser.js';
import { resolvePerson } from './identityResolver.js';
import { extractAndStoreClaims } from './claimExtractor.js';
import { queuePersonIntelligence } from './intelligenceJobs.js';
import { isPersonIntelligenceEnabled } from '../lib/intelligenceConfig.js';

const META_KEYS = new Set([
  'form_id', 'form_title', 'submitted_at', 'responses', 'votes',
  '__v', 'source', 'index', 'seeded', 'status', 'shortlisted', 'cold_start',
]);

export interface ProcessingMetadata {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  parsedDocumentCount: number;
  attachmentCount: number;
  formFieldCount: number;
  documentErrors: string[];
  processingTimeMs: number;
  aiReasons?: string[];
  aiPerplexity?: number;
  aiBurstiness?: number;
}

export interface ProcessingResult {
  submissionId: string;
  status: 'completed' | 'failed';
  summary: string;
  summaryConfidence: number;
  aiPercentage: number;
  aiConfidence: number;
  aiModel: string;
  embeddingChunks: number;
  metadata: ProcessingMetadata;
  error?: string;
}

function extractResponses(submissionData: Record<string, unknown> | null): Record<string, unknown> {
  if (!submissionData) return {};

  const nested =
    submissionData.responses &&
    typeof submissionData.responses === 'object' &&
    !Array.isArray(submissionData.responses)
      ? (submissionData.responses as Record<string, unknown>)
      : null;

  const source = nested ?? submissionData;

  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !META_KEYS.has(key.toLowerCase())),
  );
}

function valueToText(value: unknown, fieldLabel?: string): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length < 2) return null;
    return fieldLabel ? `${fieldLabel}: ${trimmed}` : trimmed;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value);
    return fieldLabel ? `${fieldLabel}: ${text}` : text;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => valueToText(item))
      .filter((part): part is string => !!part);
    if (parts.length === 0) return null;
    const joined = parts.join('; ');
    return fieldLabel ? `${fieldLabel}: ${joined}` : joined;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === 'string') {
      return null;
    }
    const parts = Object.entries(obj)
      .map(([k, v]) => valueToText(v, k))
      .filter((part): part is string => !!part);
    if (parts.length === 0) return null;
    return fieldLabel ? `${fieldLabel}: ${parts.join(', ')}` : parts.join(', ');
  }

  return null;
}

function extractFilesFromResponses(responses: Record<string, unknown>): SubmissionFile[] {
  const files: SubmissionFile[] = [];

  const maybeAdd = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const obj = value as Record<string, unknown>;
    if (typeof obj.url !== 'string' || !obj.url.trim()) return;
    files.push({
      fileUrl: obj.url.trim(),
      fileName: typeof obj.name === 'string' ? obj.name : 'attachment',
      fileType: typeof obj.type === 'string' ? obj.type : null,
    });
  };

  for (const value of Object.values(responses)) {
    maybeAdd(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        maybeAdd(item);
      }
    }
  }

  return files;
}

function buildProcessedText(parts: {
  title: string;
  description: string | null;
  applicantName: string | null;
  applicantEmail: string | null;
  categoryTitle: string | null;
  responses: Record<string, unknown>;
  documentText: string;
}): string {
  const sections: string[] = [];

  if (parts.title) {
    sections.push(`Submission Title: ${parts.title}`);
  }
  if (parts.applicantName) {
    sections.push(`Applicant: ${parts.applicantName}`);
  }
  if (parts.applicantEmail) {
    sections.push(`Email: ${parts.applicantEmail}`);
  }
  if (parts.categoryTitle) {
    sections.push(`Category: ${parts.categoryTitle}`);
  }
  if (parts.description?.trim()) {
    sections.push(`Description:\n${parts.description.trim()}`);
  }

  for (const [key, value] of Object.entries(parts.responses)) {
    const text = valueToText(value, key);
    if (text) sections.push(text);
  }

  if (parts.documentText) {
    sections.push(`Attached Documents:\n${parts.documentText}`);
  }

  return sections.filter(Boolean).join('\n\n');
}

/**
 * Processes a submission end-to-end and persists results to the database.
 * Skips if already completed unless force=true.
 */
export async function processSubmission(
  submissionId: string,
  options?: { force?: boolean },
): Promise<ProcessingResult> {
  const start = Date.now();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from('submissions')
    .select('processing_status, ai_detection_model')
    .eq('id', submissionId)
    .maybeSingle();

  const needsDetectorUpgrade =
    typeof existing?.ai_detection_model === 'string' &&
    existing.ai_detection_model.includes('roberta');

  if (
    existing?.processing_status === 'completed' &&
    !options?.force &&
    !needsDetectorUpgrade
  ) {
    const { data: cached } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    const meta = (cached?.processing_metadata || {}) as ProcessingMetadata;
    return {
      submissionId,
      status: 'completed',
      summary: cached?.processed_summary || '',
      summaryConfidence: Number(cached?.summary_confidence || 0),
      aiPercentage: Number(cached?.ai_detection_score || 0),
      aiConfidence: Number(cached?.ai_detection_confidence || 0),
      aiModel: cached?.ai_detection_model || 'cached',
      embeddingChunks: 0,
      metadata: meta,
    };
  }

  await supabase
    .from('submissions')
    .update({ processing_status: 'processing', processing_error: null })
    .eq('id', submissionId);

  try {
    const { data: row, error: loadError } = await supabase
      .from('submissions')
      .select(`
        id,
        title,
        description,
        program_id,
        applicant_name,
        applicant_email,
        submission_data,
        categories(title),
        submission_files(file_name, file_url, file_type)
      `)
      .eq('id', submissionId)
      .single();

    if (loadError || !row) {
      throw new Error(loadError?.message || 'Submission not found');
    }

    const responses = extractResponses(
      (row.submission_data || {}) as Record<string, unknown>,
    );

    const dbFiles: SubmissionFile[] = ((row as any).submission_files || []).map(
      (f: { file_url: string; file_name: string; file_type: string | null }) => ({
        fileUrl: f.file_url,
        fileName: f.file_name,
        fileType: f.file_type,
      }),
    );

    const responseFiles = extractFilesFromResponses(responses);
    const allFiles = [...dbFiles, ...responseFiles].filter(
      (file, index, arr) => arr.findIndex((f) => f.fileUrl === file.fileUrl) === index,
    );

    const parsed = await parseDocuments(allFiles);

    const processedText = buildProcessedText({
      title: row.title || '',
      description: row.description,
      applicantName: row.applicant_name,
      applicantEmail: row.applicant_email,
      categoryTitle: (row as any).categories?.title || null,
      responses,
      documentText: parsed.text,
    });

    const [aiResult, summaryResult] = await Promise.all([
      detectAIContent(processedText),
      Promise.resolve(summarizeText(processedText, 8)),
    ]);

    let embeddingChunks = 0;
    try {
      const emb = await generateChunkedEmbeddings(processedText, submissionId);
      embeddingChunks = emb.chunksCount;
    } catch (embErr) {
      console.warn('[processor] Embedding generation failed:', embErr);
    }

    // — Person intelligence pipeline (best-effort, errors don't fail the whole process) —
    const intelligenceEnabled = isPersonIntelligenceEnabled();
    if (intelligenceEnabled && row.applicant_email) {
      try {
        // Resolve org from program
        const { data: prog } = await supabase
          .from('programs')
          .select('organization_id')
          .eq('id', row.program_id)
          .maybeSingle();

        const orgId = prog?.organization_id;
        if (orgId) {
          const { profile: person } = await resolvePerson(
            row.applicant_email,
            row.applicant_name,
            orgId,
          );

          // Extract claims synchronously (fast, local)
          const claimsCount = await extractAndStoreClaims(submissionId, processedText);
          if (claimsCount > 0) {
            console.log(`[processor] Extracted ${claimsCount} claims for submission ${submissionId}`);
          }

          // Queue footprint collection + claim verification in background
          queuePersonIntelligence(person, submissionId).catch((err) =>
            console.warn('[processor] Intelligence queue failed:', err),
          );
        }
      } catch (intelErr) {
        console.warn('[processor] Person intelligence pipeline failed:', intelErr);
      }
    }

    const wordCount = processedText.split(/\s+/).filter(Boolean).length;
    const sentenceCount = processedText.split(/[.!?]+/).filter((s) => s.trim().length > 5).length;

    const metadata: ProcessingMetadata = {
      charCount: processedText.length,
      wordCount,
      sentenceCount,
      parsedDocumentCount: parsed.parsedCount,
      attachmentCount: allFiles.length,
      formFieldCount: Object.keys(responses).length,
      documentErrors: parsed.errors,
      processingTimeMs: Date.now() - start,
      aiReasons: aiResult.reasons,
      aiPerplexity: aiResult.perplexityScore,
      aiBurstiness: aiResult.burstinessScore,
    };

    const { error: saveError } = await supabase
      .from('submissions')
      .update({
        processing_status: 'completed',
        processed_text: processedText.slice(0, 500_000),
        processed_summary: summaryResult.summary,
        summary_confidence: summaryResult.confidence,
        summary_mode: summaryResult.mode,
        ai_detection_score: aiResult.aiPercentage,
        ai_detection_confidence: aiResult.confidence,
        ai_detection_model: aiResult.model,
        processing_metadata: metadata,
        processing_error: null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (saveError) {
      throw new Error(saveError.message);
    }

    console.log(
      `[processor] Completed submission ${submissionId}: ` +
        `${wordCount} words, AI ${aiResult.aiPercentage}%, ${embeddingChunks} embedding chunks`,
    );

    return {
      submissionId,
      status: 'completed',
      summary: summaryResult.summary,
      summaryConfidence: summaryResult.confidence,
      aiPercentage: aiResult.aiPercentage,
      aiConfidence: aiResult.confidence,
      aiModel: aiResult.model,
      embeddingChunks,
      metadata,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    console.error(`[processor] Failed for submission ${submissionId}:`, message);

    await supabase
      .from('submissions')
      .update({
        processing_status: 'failed',
        processing_error: message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    return {
      submissionId,
      status: 'failed',
      summary: '',
      summaryConfidence: 0,
      aiPercentage: 0,
      aiConfidence: 0,
      aiModel: 'none',
      embeddingChunks: 0,
      metadata: {
        charCount: 0,
        wordCount: 0,
        sentenceCount: 0,
        parsedDocumentCount: 0,
        attachmentCount: 0,
        formFieldCount: 0,
        documentErrors: [],
        processingTimeMs: Date.now() - start,
      },
      error: message,
    };
  }
}

/** Fire-and-forget async processing (does not block the HTTP response). */
export function queueSubmissionProcessing(submissionId: string): void {
  setImmediate(() => {
    processSubmission(submissionId).catch((err) => {
      console.error(`[processor] Queue failed for ${submissionId}:`, err);
    });
  });
}
