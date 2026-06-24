/**
 * Submission Embedding Service
 *
 * Generates 384-dim MiniLM embeddings for submission text and stores them
 * in the submission_embeddings table (pgvector) for similarity search.
 *
 * Uses @xenova/transformers (same model as the frontend summarizer).
 */

import { getSupabaseAdmin } from '../supabase.js';

let _extractor: any | null = null;
let _modelLoaded = false;
let _modelLoading = false;

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const MAX_TOKENS_PER_CHUNK = 512;
const CHUNK_OVERLAP = 50;

/**
 * Loads the MiniLM embedding model (lazy, cached).
 */
async function loadEmbeddingModel(): Promise<boolean> {
  if (_modelLoaded) return true;
  if (_modelLoading) {
    while (_modelLoading) {
      await new Promise(r => setTimeout(r, 200));
    }
    return _modelLoaded;
  }

  _modelLoading = true;
  try {
    const { pipeline } = await import('@xenova/transformers');
    _extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
      quantized: true,
    });
    _modelLoaded = true;
    console.log('[embedder] Model loaded:', EMBEDDING_MODEL);
    return true;
  } catch (err) {
    console.error('[embedder] Failed to load embedding model:', err);
    return false;
  } finally {
    _modelLoading = false;
  }
}

/**
 * Generates a single 384-dim embedding vector for the given text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ready = await loadEmbeddingModel();
  if (!ready || !_extractor) {
    throw new Error('Embedding model not available');
  }

  const result = await _extractor(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Convert from Tensor to number[]
  const data = result.data || result;
  if (data instanceof Float32Array || data instanceof Float64Array) {
    return Array.from(data);
  }
  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data === 'object' && data.tolist) {
    return Array.from(data.tolist() as number[]);
  }

  throw new Error('Unexpected embedding output format');
}

/**
 * Splits text into overlapping chunks suitable for MiniLM (max 512 tokens).
 * A token is approximated as ~4 characters for English text.
 */
function chunkText(text: string, maxChars: number, overlap: number): string[] {
  const approxTokens = text.length / 4;
  if (approxTokens <= maxChars) {
    return [text];
  }

  const chunkSize = maxChars * 4; // chars per chunk
  const overlapSize = overlap * 4;
  const chunks: string[] = [];

  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to break at a paragraph or sentence boundary
    if (end < text.length) {
      const afterEnd = text.slice(end, Math.min(end + 200, text.length));
      const paraBreak = afterEnd.indexOf('\n\n');
      const sentenceBreak = afterEnd.indexOf('. ');
      if (paraBreak > 0 && paraBreak < 100) {
        end += paraBreak + 2;
      } else if (sentenceBreak > 0 && sentenceBreak < 100) {
        end += sentenceBreak + 2;
      }
    }

    chunks.push(text.slice(start, end).trim());

    if (end >= text.length) break;

    start = end - overlapSize;
    if (start < 0) start = 0;
  }

  return chunks.filter(c => c.length > 10);
}

/**
 * Generates chunked embeddings for a submission's text and stores them in
 * the submission_embeddings table.
 *
 * @param text   - The full processed text of the submission
 * @param submissionId - The submission UUID
 * @returns The number of embedding chunks stored
 */
export async function generateChunkedEmbeddings(
  text: string,
  submissionId: string,
): Promise<{ chunksCount: number }> {
  if (!text || text.trim().length < 20) {
    return { chunksCount: 0 };
  }

  const chunks = chunkText(text, MAX_TOKENS_PER_CHUNK, CHUNK_OVERLAP);
  const supabase = getSupabaseAdmin();

  // Delete existing embeddings for this submission (idempotent)
  await supabase
    .from('submission_embeddings')
    .delete()
    .eq('submission_id', submissionId);

  const embeddings: Array<{
    submission_id: string;
    embedding: number[];
    chunk_index: number;
    chunk_text: string;
  }> = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const vector = await generateEmbedding(chunks[i]);
      embeddings.push({
        submission_id: submissionId,
        embedding: vector,
        chunk_index: i,
        chunk_text: chunks[i].slice(0, 1000), // Store first 1000 chars of chunk
      });
    } catch (err) {
      console.error(`[embedder] Failed to embed chunk ${i}:`, err);
    }
  }

  if (embeddings.length === 0) {
    return { chunksCount: 0 };
  }

  const { error } = await supabase.from('submission_embeddings').insert(embeddings);
  if (error) {
    console.error('[embedder] Failed to store embeddings:', error);
    throw error;
  }

  console.log(`[embedder] Stored ${embeddings.length} embeddings for submission ${submissionId}`);
  return { chunksCount: embeddings.length };
}

/**
 * Finds submissions similar to a given text within a program.
 *
 * @param text      - Query text to search for
 * @param programId - Program UUID to scope the search
 * @param options   - Optional: limit, excludeSubmissionId
 * @returns Array of similar submissions with similarity scores
 */
export async function findSimilarByText(
  text: string,
  programId: string,
  options?: { limit?: number; excludeSubmissionId?: string },
): Promise<Array<{
  submissionId: string;
  similarity: number;
  chunkText: string;
  title: string;
  applicantName: string;
}>> {
  if (!text || text.trim().length < 10) {
    return [];
  }

  const queryEmbedding = await generateEmbedding(text.trim().slice(0, 8000));

  const supabase = getSupabaseAdmin();

  // Use the stored procedure for similarity search
  const { data, error } = await supabase.rpc('find_similar_submissions', {
    p_embedding: queryEmbedding,
    p_program_id: programId,
    p_limit: options?.limit ?? 10,
    p_exclude_submission_id: options?.excludeSubmissionId ?? null,
  });

  if (error) {
    console.error('[embedder] Similarity search failed:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    submissionId: row.submission_id,
    similarity: Number(row.similarity),
    chunkText: row.chunk_text,
    title: row.title,
    applicantName: row.applicant_name,
  }));
}

/**
 * Finds submissions similar to an existing submission within its organization.
 *
 * @param submissionId - The source submission UUID
 * @param options      - Optional: limit, scope ('org' | 'program')
 * @returns Array of similar submissions
 */
export async function findSimilarToSubmission(
  submissionId: string,
  options?: { limit?: number; scope?: 'org' | 'program' },
): Promise<Array<{
  submissionId: string;
  similarity: number;
  chunkText: string;
  title: string;
  applicantName: string;
  programId?: string;
}>> {
  const supabase = getSupabaseAdmin();
  const scope = options?.scope ?? 'org';

  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('program_id, programs!inner(organization_id)')
    .eq('id', submissionId)
    .single();

  if (subError || !submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  const organizationId = (submission as any).programs?.organization_id as string | undefined;
  if (!organizationId) {
    throw new Error(`Organization not found for submission ${submissionId}`);
  }

  const { data: embeddings, error: embError } = await supabase
    .from('submission_embeddings')
    .select('embedding')
    .eq('submission_id', submissionId)
    .order('chunk_index', { ascending: true })
    .limit(5);

  if (embError || !embeddings || embeddings.length === 0) {
    throw new Error(`No embeddings found for submission ${submissionId}`);
  }

  const avgEmbedding = averageEmbeddings(
    embeddings.map((e) => e.embedding as unknown as number[]),
  );

  if (scope === 'program') {
    const { data, error } = await supabase.rpc('find_similar_submissions', {
      p_embedding: avgEmbedding,
      p_program_id: submission.program_id,
      p_limit: options?.limit ?? 10,
      p_exclude_submission_id: submissionId,
    });

    if (error) {
      console.error('[embedder] Similar submission search failed:', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      submissionId: row.submission_id,
      similarity: Number(row.similarity),
      chunkText: row.chunk_text,
      title: row.title,
      applicantName: row.applicant_name,
      programId: submission.program_id,
    }));
  }

  const { data, error } = await supabase.rpc('find_similar_submissions_in_org', {
    p_embedding: avgEmbedding,
    p_organization_id: organizationId,
    p_limit: options?.limit ?? 10,
    p_exclude_submission_id: submissionId,
  });

  if (error) {
    console.error('[embedder] Org similarity search failed:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    submissionId: row.submission_id,
    similarity: Number(row.similarity),
    chunkText: row.chunk_text,
    title: row.title,
    applicantName: row.applicant_name,
    programId: row.program_id,
  }));
}

/**
 * Averages multiple embedding vectors into one.
 */
function averageEmbeddings(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += vec[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    avg[i] /= vectors.length;
  }
  // L2 normalize
  const mag = Math.sqrt(avg.reduce((sum, v) => sum + v * v, 0));
  if (mag > 0) {
    for (let i = 0; i < dim; i++) {
      avg[i] /= mag;
    }
  }
  return avg;
}
