export type SummarizerMode = 'auto' | 'ml' | 'textrank';

export interface SummarizerConfig {
  /** Number of sentences in the summary (default: 5) */
  summaryLength?: number;
  /** Max input sentences to process (default: 200) */
  maxSentences?: number;
  /** Similarity threshold for edge creation (default: 0.05) */
  similarityThreshold?: number;
  /** PageRank damping factor (default: 0.85) */
  dampingFactor?: number;
  /** PageRank convergence threshold (default: 0.0001) */
  convergenceThreshold?: number;
  /** Max PageRank iterations (default: 50) */
  maxIterations?: number;
  /** Embedding mode override */
  mode?: SummarizerMode;
}

export interface SummarizerResult {
  summary: string;
  /** Sentences that make up the summary */
  sentences: string[];
  /** Which mode was actually used */
  mode: 'ml' | 'textrank';
  /** Confidence score (0-1) */
  confidence: number;
  /** Sentence count processed */
  inputSentenceCount: number;
  /** How many documents were parsed */
  parsedDocumentCount: number;
  /** Processing time in ms */
  processingTimeMs: number;
}

export interface SubmissionFile {
  fileUrl: string;
  fileType: string | null;
  fileName: string;
}

export interface SubmissionContent {
  title: string;
  description?: string | null;
  /** Extracted form responses (key-value pairs) */
  formResponses?: Record<string, unknown>;
  /** Attached files to parse */
  files?: SubmissionFile[];
}
