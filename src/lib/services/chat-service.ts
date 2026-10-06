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

  const completion = await getLLM().chat.completions.create({
    model: getLLMModel(),
    messages,
    temperature: 0.84,
    top_p: 0.59,
    max_tokens: 2048,
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}
