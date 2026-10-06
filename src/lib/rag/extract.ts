/**
 * File → text extraction and chunking for the local RAG pipeline.
 * The MIME whitelist matches the one enforced by the chat input UI.
 */

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const ALLOWED_MIME_TYPES = [
  // Text documents
  'text/plain',
  'text/markdown',
  'text/html',
  // PDF documents
  'application/pdf',
  // Microsoft Office documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Code files
  'text/x-c',
  'text/x-c++',
  'text/x-csharp',
  'text/x-java',
  'text/x-python',
  'text/x-ruby',
  'text/x-php',
  'text/javascript',
  'text/typescript',
  'text/x-sh',
  'text/css',
  'application/json',
  'text/x-tex',
  // Additional supported types
  'application/rtf',
  'text/csv',
];

const TEXTUAL_MIME_TYPES = new Set(
  ALLOWED_MIME_TYPES.filter((type) => type !== 'application/pdf' && !type.startsWith('application/vnd.') && type !== 'application/msword')
);

export function isAllowedFile(file: { size: number; type: string }): boolean {
  return file.size > 0 && file.size <= MAX_FILE_SIZE && ALLOWED_MIME_TYPES.includes(file.type);
}

/** Extracts plain text from an uploaded file. Throws on unsupported/failed extraction. */
export async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === 'application/pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text || '';
    } finally {
      await parser.destroy();
    }
  }

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
  ) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (TEXTUAL_MIME_TYPES.has(file.type)) {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type for text extraction: ${file.type}`);
}

/** Splits text into overlapping character chunks (1500 chars, 200 overlap). */
export function chunkText(
  text: string,
  options: { maxChars?: number; overlap?: number } = {}
): string[] {
  const { maxChars = 1500, overlap = 200 } = options;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length === 0) return [];
  if (normalized.length <= maxChars) return [normalized];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    if (end < normalized.length) {
      // Prefer breaking on a paragraph or sentence boundary near the limit.
      const window = normalized.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '));
      if (breakAt > maxChars * 0.5) end = start + breakAt + 1;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter((chunk) => chunk.length > 0);
}
