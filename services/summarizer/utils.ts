// Text processing utilities for the summarizer.
// Zero dependencies — pure TypeScript.

const DEFAULT_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'it', 'its', 'it\'s', 'you', 'your', 'yours', 'he', 'him', 'his',
  'she', 'her', 'hers', 'we', 'us', 'our', 'ours', 'they', 'them',
  'their', 'theirs', 'this', 'that', 'these', 'those',
  'i', 'me', 'my', 'mine', 'myself', 'am',
  'not', 'no', 'nor', 'none', 'neither', 'never',
  'so', 'as', 'if', 'then', 'than', 'else', 'when', 'where', 'why',
  'how', 'which', 'who', 'whom', 'what', 'whose', 'whether',
  'here', 'there', 'every', 'each', 'all', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'only', 'own', 'same',
  'too', 'very', 'just', 'because', 'while', 'since', 'until',
  'also', 'well', 'back', 'still', 'even', 'however', 'though',
  'get', 'got', 'gotten', 'make', 'made', 'take', 'took', 'taken',
  'see', 'saw', 'seen', 'know', 'knew', 'known', 'think', 'thought',
  'come', 'came', 'come', 'go', 'went', 'gone', 'give', 'gave', 'given',
  'find', 'found', 'tell', 'told', 'become', 'became', 'leave', 'left',
  'feel', 'felt', 'put', 'set', 'say', 'said', 'let',
  'like', 'just', 'also', 'every', 'new', 'one', 'two',
  'first', 'last', 'much', 'many', 'must', 'really',
  'thing', 'things', 'way', 'ways', 'part', 'parts',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
  '&', '-', '–', '—', '•',
]);

/** Splits text into sentences on `.`, `!`, `?` boundaries. */
export function splitSentences(text: string): string[] {
  const cleaned = text
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  // Split on sentence-ending punctuation followed by a capital letter or end.
  const raw = cleaned.match(/[^.!?\n]+[.!?]*(\s|$)/g) || [cleaned];

  return raw
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

/** Tokenizes a sentence into lowercase words, removing punctuation and stopwords. */
export function tokenize(sentence: string, stopwords?: Set<string>): string[] {
  const words = sentence
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const sw = stopwords ?? DEFAULT_STOPWORDS;
  return words.filter((w) => !sw.has(w));
}

/** Computes word-overlap similarity between two token arrays. */
export function wordOverlapSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a);
  let common = 0;
  for (const word of b) {
    if (setA.has(word)) common++;
  }

  return common / (Math.log(a.length) + Math.log(b.length) + 1);
}

/** Normalizes a value to 0-1 range within an array. */
export function normalizeScores(scores: number[]): number[] {
  const max = Math.max(...scores);
  if (max === 0) return scores.map(() => 0);
  return scores.map((s) => s / max);
}

/** Produces a bag-of-words key for caching purposes. */
export function textFingerprint(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}
