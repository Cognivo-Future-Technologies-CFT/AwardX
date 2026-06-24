// Hybrid summarization engine.
// Public API: summarize(), summarizeSubmission()

import type { SummarizerConfig, SummarizerResult, SubmissionContent } from './types';
import { summarizeTextRank, summarizeWithEmbeddings } from './engine';
import { splitSentences, tokenize, wordOverlapSimilarity } from './utils';
import { embedSentences, pairwiseSimilarity, isModelLoaded, loadEmbeddingModel } from './embedding';
import { parseDocuments } from './documentParser';

export type { SummarizerConfig, SummarizerResult, SubmissionContent } from './types';

/**
 * Summarizes any text.
 * Uses MiniML embeddings for similarity (ml mode) with TextRank fallback.
 *
 * @param text - The text to summarize.
 * @param config - Optional configuration.
 */
export async function summarize(
  text: string,
  config?: SummarizerConfig,
): Promise<SummarizerResult> {
  const mode = config?.mode || 'auto';

  // If ml mode is requested (or auto), try embeddings
  if (mode === 'ml' || mode === 'auto') {
    try {
      const sentences = splitSentences(text);

      if (sentences.length === 0) {
        return summarizeTextRank(text, config);
      }

      let embeddingsReady = isModelLoaded();

      // If not loaded yet, try quick load
      if (!embeddingsReady) {
        // For auto mode, try but don't wait long
        if (mode === 'auto') {
          const loaded = await loadEmbeddingModel();
          embeddingsReady = loaded;
        } else {
          // ml mode explicitly requested — wait for it
          const loaded = await loadEmbeddingModel();
          embeddingsReady = loaded;
        }
      }

      if (embeddingsReady && sentences.length > 0) {
        const result = await embedSentences(sentences, config);

        if (result && result.embeddings.length === sentences.length) {
          const similarityMatrix = pairwiseSimilarity(result.embeddings);

          return summarizeWithEmbeddings(sentences, similarityMatrix, config);
        }
      }

      // If ml was explicitly requested but failed, throw
      if (mode === 'ml') {
        console.warn('[summarizer] ML mode requested but model unavailable, falling back to textrank');
      }
    } catch (err) {
      console.warn('[summarizer] ML embedding failed, falling back to textrank:', err);
    }
  }

  // Fallback or textrank mode
  return summarizeTextRank(text, config);
}

/**
 * Pre-warms the embedding model.
 * Call this early (e.g., on app load or when judge portal mounts) to reduce latency.
 */
export async function prewarmModel(): Promise<boolean> {
  return loadEmbeddingModel();
}

/**
 * Builds the text input for a submission by combining title, description,
 * form responses, and parsed document content.
 */
export function buildSubmissionText(
  submission: SubmissionContent,
  documentTexts?: string,
): string {
  const parts: string[] = [];

  // Title is repeated for weight
  if (submission.title) {
    parts.push(`${submission.title}. ${submission.title}. ${submission.title}.`);
  }

  // Description
  if (submission.description) {
    parts.push(submission.description);
  }

  // Form responses — flatten into text
  if (submission.formResponses) {
    for (const [key, value] of Object.entries(submission.formResponses)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'string' && value.length > 3) {
        parts.push(value);
      } else if (Array.isArray(value)) {
        const joined = value
          .filter((v): v is string => typeof v === 'string')
          .join('. ');
        if (joined) parts.push(joined);
      }
    }
  }

  // Document content
  if (documentTexts) {
    parts.push(documentTexts);
  }

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Summarizes a submission for judges.
 * Combines title, description, form responses, and attachment contents.
 *
 * @param submission - The submission content to summarize.
 * @param config - Optional configuration.
 */
export async function summarizeSubmission(
  submission: SubmissionContent,
  config?: SummarizerConfig,
): Promise<SummarizerResult> {
  const start = performance.now();
  let parsedDocumentCount = 0;

  // Parse documents if files are provided
  let documentText = '';
  if (submission.files && submission.files.length > 0) {
    const parsed = await parseDocuments(submission.files);
    documentText = parsed.text;
    parsedDocumentCount = parsed.parsedCount;
  }

  // Build full input text
  const inputText = buildSubmissionText(submission, documentText);

  // Summarize
  const result = await summarize(inputText, config);

  return {
    ...result,
    parsedDocumentCount: result.parsedDocumentCount + parsedDocumentCount,
    processingTimeMs: result.processingTimeMs + Math.round(performance.now() - start),
  };
}
