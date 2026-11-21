import { OpenAI } from 'openai';

/**
 * Shared OpenAI-compatible LLM client.
 *
 * The `openai` package is used purely as an SDK: the endpoint, key and model
 * are all configurable so any OpenAI-compatible provider works
 * (e.g. Z.AI: LLM_BASE_URL=https://api.z.ai/api/paas/v4, LLM_MODEL=glm-5.3-flash).
 *
 * Anthropic works through its OpenAI-compatibility layer:
 *   LLM_BASE_URL=https://api.anthropic.com/v1
 *   LLM_API_KEY=sk-ant-...
 *   LLM_MODEL=claude-sonnet-4-6
 * Organization-level keys that are not scoped to a workspace must send the
 * `anthropic-workspace-id` header on every request; LLM_WORKSPACE_ID sets it.
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

  const workspaceId = process.env.LLM_WORKSPACE_ID;

  client = new OpenAI({
    baseURL,
    apiKey,
    ...(workspaceId
      ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } }
      : {}),
  });
  return client;
}

export function getLLMModel(): string {
  return process.env.LLM_MODEL || 'glm-5.3-flash';
}

/**
 * Anthropic's OpenAI-compatibility layer rejects `temperature` together with
 * `top_p`; Z.AI/OpenAI accept both. Callers send a single sampler when this
 * returns true.
 */
export function isAnthropicEndpoint(): boolean {
  return (process.env.LLM_BASE_URL || '').includes('anthropic.com');
}
