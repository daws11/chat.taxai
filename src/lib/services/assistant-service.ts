import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = 'asst_kwYCj2zNJdudMzllrpTjSzGf';

export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  threadId?: string;
  id?: string;
}

export class AssistantService {
  private assistantId: string;

  constructor(assistantId: string = ASSISTANT_ID) {
    this.assistantId = assistantId;
  }

  async createThread() {
    try {
      const thread = await openai.beta.threads.create();
      return thread.id;
    } catch (error) {
      console.error('Error creating thread:', error);
      throw new Error('Failed to create thread');
    }
  }

  async sendMessage(threadId: string, message: string) {
    try {
      // Add user message to thread
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message,
      });

      // Run the assistant
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId,
      });

      // Wait for the assistant's response
      let runResult = await openai.beta.threads.runs.retrieve(threadId, run.id);
      
      // Poll for completion
      while (runResult.status !== 'completed') {
        if (['failed', 'cancelled', 'expired'].includes(runResult.status)) {
          throw new Error(`Assistant run ${runResult.status}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        runResult = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(threadId);
      const assistantMessages = messages.data
        .filter(msg => msg.run_id === run.id && msg.role === 'assistant')
        .map(msg => ({
          role: 'assistant' as const,
          content: msg.content[0].type === 'text' ? msg.content[0].text.value : '',
        }));

      return assistantMessages[0]?.content || 'I apologize, but I encountered an error processing your request.';
    } catch (error) {
      console.error('Error sending message to assistant:', error);
      throw new Error('Failed to get response from assistant');
    }
  }

  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    try {
      const messages = await openai.beta.threads.messages.list(threadId);
      
      return messages.data.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content[0].type === 'text' ? msg.content[0].text.value : '',
      }));
    } catch (error) {
      console.error('Error retrieving thread messages:', error);
      throw new Error('Failed to retrieve thread messages');
    }
  }
}

export const assistantService = new AssistantService();
