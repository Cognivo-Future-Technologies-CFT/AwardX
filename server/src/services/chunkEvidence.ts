/**
 * Chunk-level evidence extraction using MiniLM embeddings.
 */

import { generateEmbedding } from './submissionEmbedder.js';

const CHUNK_SIZE = 200;
const CHUNK_OVERLAP = 40;
const TOP_K = 3;

function splitIntoChunks(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const chunk = words.slice(start, start + CHUNK_SIZE).join(' ');
    if (chunk.length > 30) chunks.push(chunk);
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks.length > 0 ? chunks : [text.slice(0, 1000)];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag > 0 ? dot / mag : 0;
}

export interface ChunkEvidence {
  text: string;
  similarity: number;
}

/**
 * Find the top-K text chunks most semantically similar to a claim.
 */
export async function extractChunkEvidence(
  claimText: string,
  sourceText: string,
): Promise<ChunkEvidence[]> {
  const chunks = splitIntoChunks(sourceText.slice(0, 12000));
  if (chunks.length === 0) return [];

  try {
    const claimEmbedding = await generateEmbedding(claimText.slice(0, 2000));
    const scored: ChunkEvidence[] = [];

    for (const chunk of chunks) {
      const chunkEmbedding = await generateEmbedding(chunk.slice(0, 2000));
      const similarity = cosineSimilarity(claimEmbedding, chunkEmbedding);
      scored.push({ text: chunk, similarity });
    }

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, TOP_K)
      .filter((c) => c.similarity > 0.2);
  } catch (err) {
    console.warn('[chunkEvidence] Extraction failed:', err);
    return [];
  }
}

/** Best similarity score across all chunks. */
export async function bestChunkSimilarity(
  claimText: string,
  sourceText: string,
): Promise<{ similarity: number; evidence: string }> {
  const chunks = await extractChunkEvidence(claimText, sourceText);
  if (chunks.length === 0) {
    return { similarity: 0, evidence: sourceText.slice(0, 500) };
  }
  return { similarity: chunks[0].similarity, evidence: chunks[0].text };
}
