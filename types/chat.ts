export type ChatMessageType = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date | string;
  attachments?: FileAttachment[];
};

export type FileAttachment = {
  name: string;
  type: string;
  size: number;
  fileId?: string; // OpenAI file ID
};