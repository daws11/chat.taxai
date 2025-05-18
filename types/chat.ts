export type ChatMessageType = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date | string;
};