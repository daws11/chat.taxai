import { chunkText, extractText, isAllowedFile } from './extract';
import { embedPassages, embedQuery } from './embedder';
import {
  ATTACHMENT_COLLECTION,
  KB_COLLECTION,
  search,
  upsertChunks,
  type RetrievedChunk,
  type UpsertChunk,
} from './vector-store';

/**
 * High-level RAG pipeline: ingest uploaded files into the per-session
 * collection and retrieve context from both the session attachments and the
 * global UAE Corporate Tax knowledge base.
 */

const MAX_CHUNKS_PER_FILE = 150; // safety cap so one huge PDF can't stall a request
const SESSION_TOP_K = 5;
const KB_TOP_K = 5;

export interface IngestResult {
  ingestedChunks: number;
  skipped: Array<{ name: string; reason: string }>;
}

export async function ingestFiles(
  sessionId: string,
  userId: string,
  files: File[]
): Promise<IngestResult> {
  const result: IngestResult = { ingestedChunks: 0, skipped: [] };

  for (const file of files) {
    if (!isAllowedFile(file)) {
      result.skipped.push({ name: file.name, reason: `unsupported type or size (${file.type}, ${file.size}B)` });
      continue;
    }

    try {
      const text = await extractText(file);
      const chunks = chunkText(text).slice(0, MAX_CHUNKS_PER_FILE);
      if (chunks.length === 0) {
        result.skipped.push({ name: file.name, reason: 'no extractable text' });
        continue;
      }

      const chunkPayloads: UpsertChunk[] = chunks.map((text) => ({ text, source: file.name }));
      const vectors = await embedPassages(chunks);
      result.ingestedChunks += await upsertChunks(ATTACHMENT_COLLECTION, chunkPayloads, vectors, {
        sessionId,
        userId,
      });
      console.log(`RAG ingest: ${file.name} → ${chunks.length} chunks (session ${sessionId})`);
    } catch (error) {
      console.error(`RAG ingest failed for ${file.name}:`, error);
      result.skipped.push({ name: file.name, reason: 'extraction failed' });
    }
  }

  return result;
}

export async function retrieveContext(
  query: string,
  sessionId?: string | null
): Promise<RetrievedChunk[]> {
  try {
    const queryVector = await embedQuery(query);
    const [sessionChunks, kbChunks] = await Promise.all([
      sessionId
        ? search(ATTACHMENT_COLLECTION, queryVector, { sessionId, topK: SESSION_TOP_K })
        : Promise.resolve<RetrievedChunk[]>([]),
      search(KB_COLLECTION, queryVector, { topK: KB_TOP_K }),
    ]);

    // User's own documents first (most specific), then knowledge base.
    const seen = new Set<string>();
    const merged: RetrievedChunk[] = [];
    for (const chunk of [...sessionChunks, ...kbChunks]) {
      const key = `${chunk.source}::${chunk.text.slice(0, 120)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(chunk);
    }
    return merged;
  } catch (error) {
    // Retrieval must never take the chat down — answer without context instead.
    console.error('RAG retrieval failed, continuing without context:', error);
    return [];
  }
}
