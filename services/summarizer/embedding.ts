// MiniLM embedding service using Transformers.js.
// Runs entirely in-browser via WebAssembly/ONNX — no server, no API key.

// We use a dynamic import pattern so this module can be tree-shaken
// when only textrank mode is used.

import type { SummarizerConfig } from './types';

export interface EmbeddingResult {
  /** 384-dimensional sentence embeddings */
  embeddings: number[][];
  /** Time taken for embedding in ms */
  timeMs: number;
  /** Whether the model was already loaded */
  cached: boolean;
}

let pipelineFn: ((task: string, model: string) => Promise<any>) | null = null;
let pipelinePromise: Promise<any> | null = null;
let modelLoaded = false;

/**
 * Lazily loads the Transformers.js pipeline.
 * Returns null if the library isn't available (e.g., SSR).
 */
async function getPipeline(): Promise<any> {
  if (pipelineFn) return pipelineFn;

  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      try {
        const mod = await import('@xenova/transformers');
        pipelineFn = mod.pipeline;
        return mod.pipeline;
      } catch {
        return null;
      }
    })();
  }

  return pipelinePromise;
}

/**
 * Loads the MiniLM embedding model.
 * Returns true if successful.
 */
export async function loadEmbeddingModel(): Promise<boolean> {
  try {
    const pipe = await getPipeline();
    if (!pipe) return false;

    // Warm up the model
    await pipe('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
    modelLoaded = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if the embedding model is loaded and ready.
 */
export function isModelLoaded(): boolean {
  return modelLoaded;
}

/**
 * Computes cosine similarity between two 384-dim vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const mag = Math.sqrt(na) * Math.sqrt(nb);
  return mag === 0 ? 0 : dot / mag;
}

/**
 * Computes pairwise cosine similarity matrix.
 */
export function pairwiseSimilarity(embeddings: number[][]): number[][] {
  const n = embeddings.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      matrix[i][j] = sim;
      matrix[j][i] = sim;
    }
  }

  return matrix;
}

/**
 * Embeds sentences using MiniLM via Transformers.js.
 * Returns embeddings or null if model not available.
 */
export async function embedSentences(
  sentences: string[],
  _config?: SummarizerConfig,
): Promise<EmbeddingResult | null> {
  const start = performance.now();

  try {
    const pipe = await getPipeline();
    if (!pipe) return null;

    const extractor = await pipe('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });

    const result = await extractor(sentences, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract the [n_sentences, 384] tensor
    const embeddings: number[][] = [];
    const data = result.data as Float32Array;
    const dim = 384;

    for (let i = 0; i < sentences.length; i++) {
      embeddings.push(Array.from(data.slice(i * dim, (i + 1) * dim)));
    }

    const cached = modelLoaded;
    modelLoaded = true;

    return {
      embeddings,
      timeMs: Math.round(performance.now() - start),
      cached,
    };
  } catch (err) {
    console.warn('[summarizer] MiniLM embedding failed:', err);
    return null;
  }
}
