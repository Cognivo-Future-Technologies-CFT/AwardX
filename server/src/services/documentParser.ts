/**
 * Server-side document parser for submission attachments.
 * Supports PDF, DOCX, and plain text.
 */

import mammoth from 'mammoth';
import { normalizeDocumentMime } from '../../../lib/documentMime.js';

export interface SubmissionFile {
  fileUrl: string;
  fileType: string | null;
  fileName: string;
}

export interface ParsedDocument {
  text: string;
  fileName: string;
  fileType: string;
  success: boolean;
  error?: string;
}

function normalizeMime(file: SubmissionFile): string {
  return normalizeDocumentMime(file);
}

async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
    pages.push(text);
  }

  return pages.filter(Boolean).join('\n\n');
}

async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || '';
}

async function fetchFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.arrayBuffer();
}

export async function parseDocumentFile(file: SubmissionFile): Promise<ParsedDocument> {
  const mime = normalizeMime(file);

  try {
    const buffer = await fetchFile(file.fileUrl);
    let text = '';

    if (mime === 'application/pdf') {
      text = await parsePdf(buffer);
    } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      text = await parseDocx(buffer);
    } else if (
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'application/xml'
    ) {
      text = new TextDecoder().decode(buffer);
    } else {
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
      } else if (doc.error && !doc.error.startsWith('Unsupported file type')) {
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
