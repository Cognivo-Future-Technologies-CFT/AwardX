// Core TextRank algorithm for extractive summarization.
// Zero external dependencies — pure TypeScript math.

import type { SummarizerConfig, SummarizerResult } from './types';
import { splitSentences, tokenize, wordOverlapSimilarity, normalizeScores } from './utils';

const DEFAULTS: Required<SummarizerConfig> = {
  summaryLength: 5,
  maxSentences: 200,
  similarityThreshold: 0.05,
  dampingFactor: 0.85,
  convergenceThreshold: 0.0001,
  maxIterations: 50,
  mode: 'textrank',
};

/**
 * Computes the TextRank graph — a weighted similarity matrix between sentences.
 * Returns a sparse representation: for each i, the set of j>i with non-zero similarity.
 */
function buildGraph(
  sentences: string[],
  threshold: number,
): { adjacency: Map<number, Map<number, number>>; tokens: string[][] } {
  const tokens = sentences.map((s) => tokenize(s));
  const adjacency = new Map<number, Map<number, number>>();

  for (let i = 0; i < sentences.length; i++) {
    adjacency.set(i, new Map());
  }

  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const sim = wordOverlapSimilarity(tokens[i], tokens[j]);
      if (sim >= threshold) {
        adjacency.get(i)!.set(j, sim);
        adjacency.get(j)!.set(i, sim);
      }
    }
  }

  return { adjacency, tokens };
}

/**
 * Builds a graph using pre-computed embedding similarity.
 */
function buildGraphFromEmbeddings(
  similarities: number[][],
  threshold: number,
): Map<number, Map<number, number>> {
  const n = similarities.length;
  const adjacency = new Map<number, Map<number, number>>();

  for (let i = 0; i < n; i++) {
    adjacency.set(i, new Map());
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = similarities[i][j];
      if (sim >= threshold) {
        adjacency.get(i)!.set(j, sim);
        adjacency.get(j)!.set(i, sim);
      }
    }
  }

  return adjacency;
}

/**
 * Runs the PageRank algorithm on the sentence graph.
 */
function pageRank(
  adjacency: Map<number, Map<number, number>>,
  damping: number,
  threshold: number,
  maxIter: number,
): number[] {
  const n = adjacency.size;
  if (n === 0) return [];

  // Initialize uniform scores
  let scores = new Array(n).fill(1 / n);

  // Precompute degree (sum of outgoing edge weights) for each node
  const degree = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (const [, weight] of adjacency.get(i)!) {
      sum += weight;
    }
    degree[i] = sum || 1; // avoid division by zero
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const next = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (const [j, weight] of adjacency.get(i)!) {
        sum += (scores[j] * weight) / degree[j];
      }
      next[i] = (1 - damping) * (1 / n) + damping * sum;
    }

    // Check convergence
    let delta = 0;
    for (let i = 0; i < n; i++) {
      delta += Math.abs(next[i] - scores[i]);
    }

    scores = next;

    if (delta < threshold) break;
  }

  return scores;
}

/**
 * Pure TextRank summarization (word-overlap similarity).
 * Zero-dependency fallback that always works.
 */
export function summarizeTextRank(text: string, config?: SummarizerConfig): SummarizerResult {
  const start = performance.now();
  const cfg = { ...DEFAULTS, ...config };

  const allSentences = splitSentences(text);
  if (allSentences.length === 0) {
    return {
      summary: '',
      sentences: [],
      mode: 'textrank',
      confidence: 0,
      inputSentenceCount: 0,
      parsedDocumentCount: 0,
      processingTimeMs: 0,
    };
  }

  // Truncate to max sentences
  const sentences = allSentences.slice(0, cfg.maxSentences);

  // Build graph
  const { adjacency } = buildGraph(sentences, cfg.similarityThreshold);

  // Run PageRank
  const scores = pageRank(adjacency, cfg.dampingFactor, cfg.convergenceThreshold, cfg.maxIterations);

  // Rank sentences by score
  const ranked = sentences
    .map((s, i) => ({ sentence: s, score: scores[i], index: i }))
    .sort((a, b) => b.score - a.score);

  // Take top K and re-sort by original position
  const topK = ranked.slice(0, cfg.summaryLength).sort((a, b) => a.index - b.index);

  const normScores = normalizeScores(scores);

  const end = performance.now();

  return {
    summary: topK.map((s) => s.sentence).join(' '),
    sentences: topK.map((s) => s.sentence),
    mode: 'textrank',
    confidence: topK.reduce((sum, s) => sum + scores[s.index], 0) / Math.max(topK.length, 1),
    inputSentenceCount: sentences.length,
    parsedDocumentCount: 0,
    processingTimeMs: Math.round(end - start),
  };
}

/**
 * TextRank summarization using pre-computed embedding similarities.
 * Same algorithm, better similarity function.
 */
export function summarizeWithEmbeddings(
  sentences: string[],
  similarityMatrix: number[][],
  config?: SummarizerConfig,
): SummarizerResult {
  const start = performance.now();
  const cfg = { ...DEFAULTS, ...config };

  if (sentences.length === 0) {
    return {
      summary: '',
      sentences: [],
      mode: 'ml',
      confidence: 0,
      inputSentenceCount: 0,
      parsedDocumentCount: 0,
      processingTimeMs: 0,
    };
  }

  const sliced = sentences.slice(0, cfg.maxSentences);

  // Build graph from embedding similarities
  const adjacency = buildGraphFromEmbeddings(similarityMatrix, cfg.similarityThreshold);

  // Run PageRank
  const scores = pageRank(adjacency, cfg.dampingFactor, cfg.convergenceThreshold, cfg.maxIterations);

  // Rank sentences by score
  const ranked = sliced
    .map((s, i) => ({ sentence: s, score: scores[i], index: i }))
    .sort((a, b) => b.score - a.score);

  // Take top K and re-sort by original position
  const topK = ranked.slice(0, cfg.summaryLength).sort((a, b) => a.index - b.index);

  const end = performance.now();

  return {
    summary: topK.map((s) => s.sentence).join(' '),
    sentences: topK.map((s) => s.sentence),
    mode: 'ml',
    confidence: topK.reduce((sum, s) => sum + scores[s.index], 0) / Math.max(topK.length, 1),
    inputSentenceCount: sliced.length,
    parsedDocumentCount: 0,
    processingTimeMs: Math.round(end - start),
  };
}
