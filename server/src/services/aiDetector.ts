/**
 * AI Text Detection Service
 *
 * Uses the open-source `ai-text-detector` library (MIT) which analyzes
 * perplexity, burstiness, formality, discourse markers, and 20+ linguistic
 * signals to estimate AI-generated content.
 *
 * https://github.com/John-Salama/ai-text-detector
 */

import { detectAIText, type DetectionResult } from 'ai-text-detector';

const MIN_TEXT_LENGTH = 80;
const CHUNK_CHARS = 3000;
const CHUNK_OVERLAP = 400;

export interface AIDetectionResult {
  aiPercentage: number;
  confidence: number;
  model: string;
  reasons?: string[];
  perplexityScore?: number;
  burstinessScore?: number;
}

function extractAnalyzableSections(text: string): string[] {
  const lines = text.split('\n');
  const sections: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const block = buffer.join('\n').trim();
    if (block.length >= 40) sections.push(block);
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isMeta =
      /^(submission title|applicant|email|category|description):/i.test(trimmed) ||
      /^\[from .+\]:$/i.test(trimmed);

    if (isMeta && buffer.length > 0) {
      flush();
    }

    if (!isMeta || trimmed.length > 60) {
      buffer.push(line);
    }
  }

  flush();

  if (sections.length === 0) {
    return [text.trim()];
  }

  return sections;
}

function chunkLongText(text: string): string[] {
  if (text.length <= CHUNK_CHARS) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_CHARS, text.length);

    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '));
      if (lastBreak > CHUNK_CHARS * 0.5) {
        end = start + lastBreak + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= MIN_TEXT_LENGTH) {
      chunks.push(chunk);
    }

    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks.length > 0 ? chunks : [text];
}

function analyzeSegment(text: string): DetectionResult {
  return detectAIText(text.trim());
}

function aggregateResults(results: DetectionResult[]): AIDetectionResult {
  if (results.length === 0) {
    return { aiPercentage: 0, confidence: 0, model: 'ai-text-detector' };
  }

  let weightedScore = 0;
  let weightTotal = 0;
  const reasonCounts = new Map<string, number>();

  for (const result of results) {
    const weight = Math.max(0.3, result.confidence);
    weightedScore += result.score * weight;
    weightTotal += weight;

    for (const reason of result.reasons.slice(0, 3)) {
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }
  }

  const avgScore = weightTotal > 0 ? weightedScore / weightTotal : 0;
  const avgConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  const topReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([reason]) => reason);

  const avgPerplexity =
    results.reduce((sum, r) => sum + r.perplexityScore, 0) / results.length;
  const avgBurstiness =
    results.reduce((sum, r) => sum + r.burstinessScore, 0) / results.length;

  return {
    aiPercentage: Math.max(0, Math.min(100, Math.round(avgScore * 100))),
    confidence: Math.round(avgConfidence * 100) / 100,
    model: 'ai-text-detector',
    reasons: topReasons,
    perplexityScore: Math.round(avgPerplexity * 100) / 100,
    burstinessScore: Math.round(avgBurstiness * 100) / 100,
  };
}

/**
 * Detects AI-generated content in submission text.
 * Analyzes content sections and long texts in overlapping chunks,
 * then aggregates scores weighted by per-segment confidence.
 */
export async function detectAIContent(text: string): Promise<AIDetectionResult> {
  if (!text || text.trim().length < MIN_TEXT_LENGTH) {
    return {
      aiPercentage: 0,
      confidence: 0,
      model: 'insufficient-text',
    };
  }

  try {
    const sections = extractAnalyzableSections(text.trim());
    const results: DetectionResult[] = [];

    for (const section of sections) {
      const chunks = chunkLongText(section);
      for (const chunk of chunks.slice(0, 6)) {
        results.push(analyzeSegment(chunk));
      }
    }

    return aggregateResults(results);
  } catch (err) {
    console.warn('[ai-detector] ai-text-detector failed:', err);
    return {
      aiPercentage: 50,
      confidence: 0.2,
      model: 'ai-text-detector-error',
    };
  }
}

export async function prewarmAIDetector(): Promise<void> {
  // ai-text-detector has no model to pre-warm — run a tiny probe to JIT-compile
  detectAIText('Warmup probe sentence for initialization.');
}
