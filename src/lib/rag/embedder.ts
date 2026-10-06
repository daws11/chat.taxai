import { FlagEmbedding, EmbeddingModel } from 'fastembed';

/**
 * Local embeddings via fastembed (ONNX on CPU, no external service).
 * Model BGE-small-en-v1.5 → 384 dimensions. The model binary is downloaded
 * once into EMBEDDING_CACHE_DIR and reused afterwards.
 */

export const EMBEDDING_MODEL = EmbeddingModel.BGESmallENV15;
export const EMBEDDING_DIM = 384;

let embedderPromise: Promise<FlagEmbedding> | null = null;

export function getEmbedder(): Promise<FlagEmbedding> {
  if (!embedderPromise) {
    embedderPromise = FlagEmbedding.init({
      model: EMBEDDING_MODEL,
      cacheDir: process.env.EMBEDDING_CACHE_DIR || '.fastembed-cache',
      showDownloadProgress: false,
    });
  }
  return embedderPromise;
}

/** Embed a batch of passage texts (for ingestion). */
export async function embedPassages(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const embedder = await getEmbedder();
  const out: number[][] = [];
  for await (const batch of embedder.embed(texts, 32)) {
    out.push(...batch);
  }
  return out;
}

/** Embed a single query (for retrieval). */
export async function embedQuery(query: string): Promise<number[]> {
  const embedder = await getEmbedder();
  return embedder.queryEmbed(query);
}
