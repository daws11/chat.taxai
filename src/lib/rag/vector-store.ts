import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'crypto';
import { EMBEDDING_DIM } from './embedder';

/**
 * Qdrant vector store running as a local Docker container (QDRANT_URL,
 * default http://127.0.0.1:6333 next to mongo).
 *
 * Two collections:
 * - atto_kb           — persistent UAE Corporate Tax knowledge base (global)
 * - atto_attachments  — text extracted from files uploaded per chat session
 */

export const KB_COLLECTION = 'atto_kb';
export const ATTACHMENT_COLLECTION = 'atto_attachments';

export interface RetrievedChunk {
  text: string;
  source: string;
  score: number;
}

export interface UpsertChunk {
  text: string;
  source: string;
}

interface BasePayload {
  source: string;
  chunkIndex: number;
}

export interface AttachmentPayload extends BasePayload {
  sessionId: string;
  userId: string;
}

let client: QdrantClient | null = null;

export function getVectorStore(): QdrantClient {
  if (client) return client;

  const url = process.env.QDRANT_URL;
  if (!url) {
    throw new Error('Vector store is not configured: set QDRANT_URL (e.g. http://127.0.0.1:6333).');
  }

  client = new QdrantClient({ url });
  return client;
}

const ensuredCollections = new Set<string>();

export async function ensureCollection(name: string): Promise<void> {
  if (ensuredCollections.has(name)) return;

  const store = getVectorStore();
  try {
    await store.getCollection(name);
  } catch {
    await store.createCollection(name, {
      vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
    });
  }
  ensuredCollections.add(name);
}

export async function upsertChunks(
  collection: typeof KB_COLLECTION | typeof ATTACHMENT_COLLECTION,
  chunks: UpsertChunk[],
  vectors: number[][],
  basePayload: Partial<AttachmentPayload> = {}
): Promise<number> {
  if (chunks.length === 0) return 0;
  await ensureCollection(collection);

  const points = chunks.map((chunk, i) => ({
    id: randomUUID(),
    vector: vectors[i],
    payload: { ...basePayload, source: chunk.source, chunkIndex: i, text: chunk.text },
  }));

  await getVectorStore().upsert(collection, { wait: true, points });
  return points.length;
}

export async function search(
  collection: typeof KB_COLLECTION | typeof ATTACHMENT_COLLECTION,
  queryVector: number[],
  options: { sessionId?: string | null; topK?: number } = {}
): Promise<RetrievedChunk[]> {
  const { sessionId, topK = 5 } = options;
  await ensureCollection(collection);

  const filter = sessionId
    ? { must: [{ key: 'sessionId', match: { value: sessionId } }] }
    : undefined;

  const response = await getVectorStore().query(collection, {
    query: queryVector,
    filter,
    limit: topK,
    with_payload: true,
  });

  return response.points
    .map((point) => {
      const payload = (point.payload || {}) as { text?: string; source?: string };
      return {
        text: payload.text || '',
        source: payload.source || 'unknown',
        score: point.score ?? 0,
      };
    })
    .filter((chunk) => chunk.text.length > 0);
}

/** Removes all attachment vectors belonging to a chat session (cleanup on delete). */
export async function deleteSessionAttachments(sessionId: string): Promise<void> {
  const store = getVectorStore();
  await ensureCollection(ATTACHMENT_COLLECTION);
  await store.delete(ATTACHMENT_COLLECTION, {
    wait: true,
    filter: { must: [{ key: 'sessionId', match: { value: sessionId } }] },
  });
}
