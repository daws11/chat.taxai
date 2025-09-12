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
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
    fileId?: string;
  }>;
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

  async sendMessage(threadId: string, message: string, files?: File[]) {
    try {
      // Handle file uploads if any
      const fileIds: string[] = [];
      if (files && files.length > 0) {
        console.log('Processing file uploads in assistant service:', files);
        
        // Upload files to OpenAI
        for (const file of files) {
          try {
            // Validate file size (max 20MB per file)
            if (file.size > 20 * 1024 * 1024) {
              console.error(`File ${file.name} is too large. Maximum size is 20MB.`);
              continue;
            }

            // Validate file type - based on OpenAI file search supported types
            const allowedTypes = [
              // Text documents
              'text/plain',
              'text/markdown',
              'text/html',
              // PDF documents
              'application/pdf',
              // Microsoft Office documents
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              // Code files
              'text/x-c',
              'text/x-c++',
              'text/x-csharp',
              'text/x-java',
              'text/x-python',
              'text/x-ruby',
              'text/x-php',
              'text/javascript',
              'text/typescript',
              'text/x-sh',
              'text/css',
              'application/json',
              'text/x-tex',
              // Additional supported types
              'application/rtf',
              'text/csv' // CSV is supported for code interpreter but not file search
            ];

            if (!allowedTypes.includes(file.type)) {
              console.error(`File type ${file.type} is not supported.`);
              continue;
            }

            // Upload file to OpenAI
            const uploadedFile = await openai.files.create({
              file: file,
              purpose: 'assistants'
            });
            
            fileIds.push(uploadedFile.id);
            console.log(`File uploaded successfully: ${file.name} (ID: ${uploadedFile.id})`);
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            // Continue with other files even if one fails
          }
        }
      }

      // Add user message to thread with file attachments
      if (fileIds.length > 0) {
        // Send message with file attachments using the correct format
        await openai.beta.threads.messages.create(threadId, {
          role: 'user',
          content: message,
          attachments: fileIds.map(fileId => ({
            file_id: fileId,
            tools: [{ type: 'file_search' }, { type: 'code_interpreter' }]
          }))
        });
      } else {
        await openai.beta.threads.messages.create(threadId, {
          role: 'user',
          content: message,
        });
      }

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
