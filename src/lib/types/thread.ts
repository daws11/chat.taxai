/**
 * Shared chat message shape used by API routes and client hooks.
 * (Formerly exported from lib/services/assistant-service.ts.)
 */
export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  threadId?: string;
  id?: string;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
    fileId?: string;
  }>;
}
