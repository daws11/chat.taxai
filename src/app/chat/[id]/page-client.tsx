"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import type { ThreadMessage } from "@/lib/services/assistant-service";
import { useAssistant } from "@/lib/hooks/use-assistant";

// import { useRouter } from "next/navigation";

export default function ChatSessionPageClient() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { 
    messages, 
    isLoading, 
    sendMessage, 
    status,
    error: assistantError 
  } = useAssistant(sessionId);

  // Handle initial load and errors
  useEffect(() => {
    if (assistantError) {
      setError(assistantError);
    }
    if (messages.length > 0) {
      setIsInitialLoad(false);
    }
  }, [assistantError, messages]);

  // Handle message submission
  const handleSubmit = useCallback(async (message: string) => {
    try {
      setError(null);
      await sendMessage(message);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }, [sendMessage]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Convert messages to the format expected by ChatMessages
  const formattedMessages = messages.map((msg: ThreadMessage, index: number) => ({
    id: `${msg.role}-${index}`,
    role: msg.role,
    content: msg.content,
    createdAt: msg.timestamp 
      ? (typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp)
      : new Date()
  }));

  return (
    <div className="flex flex-col h-full w-full">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12" y2="16"></line>
            </svg>
            {error}
          </div>
        </div>
      )}
        
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto w-full">
        {isInitialLoad ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse space-y-4 w-full p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-700"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center p-4">
              <h3 className="text-lg font-medium mb-2">Start a conversation with TaxAI</h3>
              <p className="text-sm">Ask questions about taxes, financial regulations, or get help with tax calculations.</p>
            </div>
          </div>
        ) : (
          <ChatMessages 
            messages={formattedMessages}
            isTyping={isLoading}
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="flex-none border-t bg-background w-full">
        <ChatInput 
          onSubmit={handleSubmit} 
          isGenerating={isLoading}
          onStop={() => {/* TODO: Implement stop generation */}}
        />
      </div>
    </div>
  );
}

// Tidak ada error pada kode ini jika ChatMessageType di types/chat.ts sudah:
// export type ChatMessageType = {
//   role: 'user' | 'assistant';
//   content: string;
//   timestamp?: Date | string;
// };
// Jika belum, pastikan untuk mengedit types/chat.ts seperti di atas.
