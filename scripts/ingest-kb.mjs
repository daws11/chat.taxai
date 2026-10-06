#!/usr/bin/env node
/**
 * Ingest the persistent UAE Corporate Tax knowledge base into Qdrant.
 *
 * Usage (from chat/):
 *   node scripts/ingest-kb.mjs            # ingest all files in knowledge-base/
 *   node scripts/ingest-kb.mjs --reset    # wipe the atto_kb collection first
 *
 * Source files are NOT committed to git — place them in chat/knowledge-base/
 * on the server (PDF, DOCX, or plain text).
 *
 * Env: QDRANT_URL (default http://127.0.0.1:6333), EMBEDDING_CACHE_DIR
 * (default .fastembed-cache). Values are also picked up from .env.production
 * when the file exists.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

// Minimal .env loader (KEY=VALUE lines) so the script works without dotenv.
for (const envFile of ['.env.production', '.env.local', '.env']) {
  const envPath = path.join(appRoot, envFile);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const QDRANT_URL = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
const KB_DIR = path.join(appRoot, 'knowledge-base');
const RESET = process.argv.includes('--reset');
const MAX_CHUNKS_PER_FILE = 2000;

const { QdrantClient } = await import('@qdrant/js-client-rest');
const { FlagEmbedding, EmbeddingModel } = await import('fastembed');

const COLLECTION = 'atto_kb';
const DIM = 384; // BGE-small-en-v1.5
const MAX_CHARS = 1500;
const OVERLAP = 200;

const client = new QdrantClient({ url: QDRANT_URL });

async function ensureCollection() {
  try {
    await client.getCollection(COLLECTION);
  } catch {
    await client.createCollection(COLLECTION, {
      vectors: { size: DIM, distance: 'Cosine' },
    });
    console.log(`Created collection ${COLLECTION}`);
  }
}

function extractTextBuffer(buf) {
  return buf.toString('utf-8');
}

async function extractFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(filePath)) });
    try {
      const result = await parser.getText();
      return result.text || '';
    } finally {
      await parser.destroy();
    }
  }
  if (ext === '.docx' || ext === '.doc') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: fs.readFileSync(filePath) });
    return result.value || '';
  }
  if (['.txt', '.md', '.csv', '.json', '.html', '.htm', '.rtf'].includes(ext)) {
    return extractTextBuffer(fs.readFileSync(filePath));
  }
  return null;
}

function chunkText(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length === 0) return [];
  if (normalized.length <= MAX_CHARS) return [normalized];

  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + MAX_CHARS, normalized.length);
    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '));
      if (breakAt > MAX_CHARS * 0.5) end = start + breakAt + 1;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - OVERLAP, start + 1);
  }
  return chunks.filter(Boolean);
}

async function main() {
  if (RESET) {
    console.log('Resetting collection', COLLECTION);
    try { await client.deleteCollection(COLLECTION); } catch { /* not exists yet */ }
  }
  await ensureCollection();

  if (!fs.existsSync(KB_DIR)) {
    console.error(`Missing directory: ${KB_DIR}`);
    console.error('Place the UAE Corporate Tax knowledge base files there first.');
    process.exit(1);
  }

  const files = fs.readdirSync(KB_DIR)
    .map((name) => path.join(KB_DIR, name))
    .filter((p) => fs.statSync(p).isFile() && !path.basename(p).startsWith('.'));

  if (files.length === 0) {
    console.error(`No files found in ${KB_DIR}`);
    process.exit(1);
  }

  const embedder = await FlagEmbedding.init({
    model: EmbeddingModel.BGESmallENV15,
    cacheDir: process.env.EMBEDDING_CACHE_DIR || path.join(appRoot, '.fastembed-cache'),
    showDownloadProgress: false,
  });

  let total = 0;
  for (const filePath of files) {
    const source = path.basename(filePath);
    let text;
    try {
      text = await extractFile(filePath);
    } catch (error) {
      console.error(`SKIP ${source}: extraction failed —`, error.message);
      continue;
    }
    if (text == null) {
      console.log(`SKIP ${source}: unsupported extension`);
      continue;
    }

    const chunks = chunkText(text).slice(0, MAX_CHUNKS_PER_FILE);
    if (chunks.length === 0) {
      console.log(`SKIP ${source}: no extractable text`);
      continue;
    }

    const points = [];
    for await (const batch of embedder.embed(chunks, 32)) {
      for (const vector of batch) {
        points.push({
          id: crypto.randomUUID(),
          vector,
          payload: { source, chunkIndex: points.length, text: chunks[points.length] },
        });
      }
    }

    await client.upsert(COLLECTION, { wait: true, points });
    total += points.length;
    console.log(`OK   ${source}: ${points.length} chunks`);
  }

  console.log(`\nDone. ${total} chunks in ${COLLECTION} @ ${QDRANT_URL}`);
}

main().catch((error) => {
  console.error('Ingest failed:', error);
  process.exit(1);
});
