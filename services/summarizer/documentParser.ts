// Document parser for extracting text from submission attachments.
// Supports PDF (pdfjs-dist), DOCX (mammoth), and plain text.

import type { SubmissionFile } from './types';

export interface ParsedDocument {
  text: string;
  fileName: string;
  fileType: string;
  success: boolean;
  error?: string;
}

/**
 * Normalizes MIME types for matching.
 */
function normalizeMime(file: SubmissionFile): string {
  const ext = file.fileName.split('.').pop()?.toLowerCase();
  const mime = file.fileType?.toLowerCase() || '';

  // Fall back to extension if MIME is missing
  if (!mime || mime === 'application/octet-stream') {
    const extMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
      csv: 'text/csv',
      md: 'text/markdown',
      json: 'application/json',
    };
    return ext ? extMap[ext] || '' : '';
  }
  return mime;
}

/**
 * Parses a PDF file and extracts text.
 */
async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  const mod = await import('pdfjs-dist');
  // Set worker path (use bundled worker)
  const pdfjsLib = mod as any;

  // pdfjs-dist needs a worker — use the built-in one
  const data = new Uint8Array(buffer);

  // If pdfjs provides a worker, use it
  try {
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => item.str)
        .join(' ');
      pages.push(text);
    }

    return pages.filter(Boolean).join('\n\n');
  } catch (err) {
    throw new Error(`PDF parse failed: ${err}`);
  }
}

/**
 * Parses a DOCX file and extracts text.
 */
async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  } catch (err) {
    throw new Error(`DOCX parse failed: ${err}`);
  }
}

/**
 * Fetches a file from a URL and returns its buffer.
 */
async function fetchFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.arrayBuffer();
}

/**
 * Parses a single submission file and extracts its text content.
 * Falls back silently for unsupported file types.
 */
export async function parseDocumentFile(file: SubmissionFile): Promise<ParsedDocument> {
  const mime = normalizeMime(file);

  try {
    const buffer = await fetchFile(file.fileUrl);
    let text = '';

    if (mime === 'application/pdf') {
      text = await parsePdf(buffer);
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = await parseDocx(buffer);
    } else if (
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'application/xml'
    ) {
      text = new TextDecoder().decode(buffer);
    } else {
      // Unsupported — skip silently
      return {
        text: '',
        fileName: file.fileName,
        fileType: mime,
        success: false,
        error: `Unsupported file type: ${mime}`,
      };
    }

    return {
      text: text.trim(),
      fileName: file.fileName,
      fileType: mime,
      success: true,
    };
  } catch (err) {
    return {
      text: '',
      fileName: file.fileName,
      fileType: mime,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Parses multiple submission files in parallel.
 * Returns all parsed texts concatenated with source labels.
 */
export async function parseDocuments(
  files: SubmissionFile[],
): Promise<{ text: string; parsedCount: number; errors: string[] }> {
  if (files.length === 0) {
    return { text: '', parsedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(files.map(parseDocumentFile));
  const texts: string[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const doc = result.value;
      if (doc.success && doc.text) {
        texts.push(`[From ${doc.fileName}]:\n${doc.text}`);
      } else if (doc.error && doc.error !== 'Unsupported file type: ') {
        errors.push(doc.error);
      }
    } else {
      errors.push(result.reason?.message || 'Unknown error');
    }
  }

  return {
    text: texts.join('\n\n'),
    parsedCount: texts.length,
    errors,
  };
}
