import { OpenAI } from 'openai';

/**
 * Shared OpenAI-compatible LLM client.
 *
 * The `openai` package is used purely as an SDK: the endpoint, key and model
 * are all configurable so any OpenAI-compatible provider works
 * (e.g. Z.AI: LLM_BASE_URL=https://api.z.ai/api/paas/v4, LLM_MODEL=glm-5.3-flash).
 */

let client: OpenAI | null = null;

export function getLLM(): OpenAI {
  if (client) return client;

  const baseURL = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;

  if (!baseURL || !apiKey) {
    throw new Error(
      'LLM is not configured: set LLM_BASE_URL and LLM_API_KEY (any OpenAI-compatible endpoint).'
    );
  }

  client = new OpenAI({ baseURL, apiKey });
  return client;
}

export function getLLMModel(): string {
  return process.env.LLM_MODEL || 'glm-5.3-flash';
}
