import { FlagEmbedding, EmbeddingModel } from 'fastembed';
import { OpenAI } from 'openai';

/**
 * Embedding provider abstraction.
 *
 * Two providers, selected with EMBEDDING_PROVIDER (defaults to `google` when
 * EMBEDDING_API_KEY is set, otherwise `local`):
 *
 * - google — Google's OpenAI-compatible endpoint (gemini-embedding-001,
 *   EMBEDDING_DIM dims, default 768).
 * - local  — fastembed (ONNX CPU), no external service or API key. Model is
 *   picked with EMBEDDING_LOCAL_MODEL:
 *     `bge-small`  BGE-small-en-v1.5, 384 dims, English only, fastest (default)
 *     `bge-base`   BGE-base-en-v1.5, 768 dims, English only, much smaller than e5-large
 *     `mle5large`  multilingual-e5-large, 1024 dims, EN+AR+~100 languages —
 *                  ~2.2GB and ~1.6s per query on this 4-vCPU VPS
 *
 * The vector dimension MUST match the Qdrant collections, which are created
 * with EMBEDDING_DIM on first use. Changing provider or local model changes
 * that dimension, so the existing collections have to be dropped and the
 * sources re-ingested.
 */

const LOCAL_MODELS = {
  mle5large: { model: EmbeddingModel.MLE5Large, dim: 1024, label: 'multilingual-e5-large' },
  'bge-base': { model: EmbeddingModel.BGEBaseENV15, dim: 768, label: 'bge-base-en-v1.5' },
  'bge-small': { model: EmbeddingModel.BGESmallENV15, dim: 384, label: 'bge-small-en-v1.5' },
} as const;

type LocalModelName = keyof typeof LOCAL_MODELS;

function resolveProvider(): 'google' | 'local' {
  const configured = (process.env.EMBEDDING_PROVIDER || '').toLowerCase();
  if (configured === 'google' || configured === 'local') return configured;
  return process.env.EMBEDDING_API_KEY ? 'google' : 'local';
}

function resolveLocalModel(): LocalModelName {
  const configured = (process.env.EMBEDDING_LOCAL_MODEL || '').toLowerCase();
  return (configured in LOCAL_MODELS ? configured : 'bge-small') as LocalModelName;
}

const PROVIDER = resolveProvider();

export const EMBEDDING_PROVIDER = PROVIDER;
export const EMBEDDING_DIM =
  PROVIDER === 'google'
    ? parseInt(process.env.EMBEDDING_DIM || '768', 10)
    : LOCAL_MODELS[resolveLocalModel()].dim;

let googleClient: OpenAI | null = null;
let embedderPromise: Promise<FlagEmbedding> | null = null;

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
      model: LOCAL_MODELS[resolveLocalModel()].model,
      cacheDir: process.env.EMBEDDING_CACHE_DIR || '.fastembed-cache',
      showDownloadProgress: false,
    });
  }
  return embedderPromise;
}

/** Embed a batch of passage texts (for ingestion). */
export async function embedPassages(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return PROVIDER === 'google' ? googleEmbed(texts) : localEmbed(texts);
}

/** Embed a single query (for retrieval). */
export async function embedQuery(query: string): Promise<number[]> {
  if (PROVIDER === 'google') {
    const [vector] = await googleEmbed([query]);
    return vector;
  }
  const embedder = await getLocalEmbedder();
  return embedder.queryEmbed(query);
}
