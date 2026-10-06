import { FlagEmbedding, EmbeddingModel } from 'fastembed';
import { OpenAI } from 'openai';

/**
 * Embedding provider abstraction.
 *
 * - Google embeddings (default when EMBEDDING_API_KEY is set): uses Google's
 *   OpenAI-compatible endpoint (gemini-embedding-001, 768 dims).
 * - Local fastembed fallback (ONNX CPU, BGE-small-en-v1.5, 384 dims): used
 *   when EMBEDDING_API_KEY is absent — no external service needed.
 *
 * The vector dimension MUST match the Qdrant collections, which are created
 * with EMBEDDING_DIM on first use.
 */

export const EMBEDDING_DIM = process.env.EMBEDDING_API_KEY
  ? parseInt(process.env.EMBEDDING_DIM || '768', 10)
  : 384;

let googleClient: OpenAI | null = null;
let embedderPromise: Promise<FlagEmbedding> | null = null;

function isGoogleEmbedding(): boolean {
  return Boolean(process.env.EMBEDDING_API_KEY);
}

function getGoogleClient(): OpenAI {
  if (!googleClient) {
    const apiKey = process.env.EMBEDDING_API_KEY;
    if (!apiKey) throw new Error('EMBEDDING_API_KEY is not set');
    googleClient = new OpenAI({
      baseURL: process.env.EMBEDDING_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey,
      // Google also accepts the key via this header; send both for safety.
      defaultHeaders: { 'x-goog-api-key': apiKey },
    });
  }
  return googleClient;
}

function getEmbeddingModel(): string {
  return process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
}

async function googleEmbed(texts: string[]): Promise<number[][]> {
  const client = getGoogleClient();
  const out: number[][] = [];
  const batchSize = 32;
  for (let i = 0; i < texts.length; i += batchSize) {
    const response = await client.embeddings.create({
      model: getEmbeddingModel(),
      input: texts.slice(i, i + batchSize),
      dimensions: EMBEDDING_DIM,
    });
    for (const item of response.data) {
      out.push(item.embedding as number[]);
    }
  }
  return out;
}

async function localEmbed(texts: string[]): Promise<number[][]> {
  const embedder = await getLocalEmbedder();
  const out: number[][] = [];
  for await (const batch of embedder.embed(texts, 32)) {
    out.push(...batch);
  }
  return out;
}

function getLocalEmbedder(): Promise<FlagEmbedding> {
  if (!embedderPromise) {
    embedderPromise = FlagEmbedding.init({
      model: EmbeddingModel.BGESmallENV15,
      cacheDir: process.env.EMBEDDING_CACHE_DIR || '.fastembed-cache',
      showDownloadProgress: false,
    });
  }
  return embedderPromise;
}

/** Embed a batch of passage texts (for ingestion). */
export async function embedPassages(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return isGoogleEmbedding() ? googleEmbed(texts) : localEmbed(texts);
}

/** Embed a single query (for retrieval). */
export async function embedQuery(query: string): Promise<number[]> {
  if (isGoogleEmbedding()) {
    const [vector] = await googleEmbed([query]);
    return vector;
  }
  const embedder = await getLocalEmbedder();
  return embedder.queryEmbed(query);
}
