/**
 * Server-side extractive summarizer (TextRank).
 * Produces a normalized confidence score (0–1) meaningful for display.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'it', 'its', 'you', 'your', 'he', 'she', 'we', 'they', 'this', 'that',
  'not', 'no', 'so', 'as', 'if', 'then', 'than', 'when', 'where', 'how',
  'which', 'who', 'what', 'also', 'very', 'just', 'because', 'while',
]);

export interface SummarizerResult {
  summary: string;
  sentences: string[];
  mode: 'textrank';
  confidence: number;
  inputSentenceCount: number;
  processingTimeMs: number;
}

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\n{2,}/g, '. ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const raw = cleaned.match(/[^.!?\n]+[.!?]*(\s|$)/g) || [cleaned];
  return raw.map((s) => s.trim()).filter((s) => s.length > 10);
}

function tokenize(sentence: string): string[] {
  return sentence
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function wordOverlapSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  let common = 0;
  for (const word of b) {
    if (setA.has(word)) common++;
  }
  return common / (Math.log(a.length) + Math.log(b.length) + 1);
}

function pageRank(
  adjacency: Map<number, Map<number, number>>,
  damping = 0.85,
  threshold = 0.0001,
  maxIter = 50,
): number[] {
  const n = adjacency.size;
  if (n === 0) return [];

  let scores = new Array(n).fill(1 / n);
  const degree = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (const [, weight] of adjacency.get(i)!) {
      sum += weight;
    }
    degree[i] = sum || 1;
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
 * Summarizes text using TextRank. Confidence is normalized relative to the
 * highest-scoring sentence so displayed values are meaningful (not ~6%).
 */
export function summarizeText(text: string, summaryLength = 8): SummarizerResult {
  const start = Date.now();
  const sentences = splitSentences(text).slice(0, 200);

  if (sentences.length === 0) {
    return {
      summary: '',
      sentences: [],
      mode: 'textrank',
      confidence: 0,
      inputSentenceCount: 0,
      processingTimeMs: 0,
    };
  }

  const tokens = sentences.map(tokenize);
  const adjacency = new Map<number, Map<number, number>>();
  for (let i = 0; i < sentences.length; i++) {
    adjacency.set(i, new Map());
  }

  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const sim = wordOverlapSimilarity(tokens[i], tokens[j]);
      if (sim >= 0.05) {
        adjacency.get(i)!.set(j, sim);
        adjacency.get(j)!.set(i, sim);
      }
    }
  }

  const scores = pageRank(adjacency);
  const maxScore = Math.max(...scores, 0.0001);

  const ranked = sentences
    .map((sentence, index) => ({ sentence, score: scores[index], index }))
    .sort((a, b) => b.score - a.score);

  const topK = ranked.slice(0, summaryLength).sort((a, b) => a.index - b.index);

  const avgNormalized =
    topK.reduce((sum, s) => sum + s.score / maxScore, 0) / Math.max(topK.length, 1);

  return {
    summary: topK.map((s) => s.sentence).join(' '),
    sentences: topK.map((s) => s.sentence),
    mode: 'textrank',
    confidence: Math.round(avgNormalized * 100) / 100,
    inputSentenceCount: sentences.length,
    processingTimeMs: Date.now() - start,
  };
}
