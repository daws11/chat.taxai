import type { RetrievedChunk } from '@/lib/rag/vector-store';
import { buildContextBlock, ATTO_SYSTEM_PROMPT } from '@/lib/llm/prompts';
import { getLLM, getLLMModel } from '@/lib/llm/client';
import type { ThreadMessage } from '@/lib/types/thread';

/**
 * Chat orchestration on top of the configurable OpenAI-compatible LLM.
 * Replaces the former OpenAI Assistants API service.
 */

const HISTORY_WINDOW = 12;

export async function generateReply(
  history: ThreadMessage[],
  context: RetrievedChunk[] = []
): Promise<string> {
  const systemContent = context.length > 0
    ? `${ATTO_SYSTEM_PROMPT}\n\n${buildContextBlock(context)}`
    : ATTO_SYSTEM_PROMPT;

  const messages = [
    { role: 'system' as const, content: systemContent },
    ...history.slice(-HISTORY_WINDOW).map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const body: Record<string, unknown> = {
    model: getLLMModel(),
    messages,
    temperature: 0.84,
    top_p: 0.59,
    max_tokens: 4096,
    // glm reasoning models spend max_tokens on reasoning_content, which can
    // leave `content` empty; disable thinking for direct chat answers.
    // Ignored by providers that don't support the parameter.
  };
  if (process.env.LLM_THINKING !== 'enabled') {
    body.thinking = { type: 'disabled' };
  }

  const completion = (await getLLM().chat.completions.create(
    body as unknown as Parameters<ReturnType<typeof getLLM>['chat']['completions']['create']>[0]
  )) as { choices?: Array<{ message?: { content?: string | null } }> };

  return completion.choices?.[0]?.message?.content?.trim() || '';
}
