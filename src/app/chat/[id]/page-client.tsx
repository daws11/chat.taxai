"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import type { ThreadMessage } from "@/lib/services/assistant-service";
import { useAssistant } from "@/lib/hooks/use-assistant";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';

// import { useRouter } from "next/navigation";

export default function ChatSessionPageClient() {
  const params = useParams();
  const sessionId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { 
    messages, 
    isLoading, 
    sendMessage, 
    error: assistantError, 
    quotaDialogOpen, 
    setQuotaDialogOpen 
  } = useAssistant(sessionId);

  // Handle initial load and errors
  useEffect(() => {
    if (assistantError) {
      setError(assistantError);
    }
    if (messages.length > 0) {
      // setIsInitialLoad(false); // This line was removed as per the edit hint.
    }
  }, [assistantError, messages]);

  // Handle message submission
  const handleSubmit = useCallback(async (message: string, files?: File[]) => {
    try {
      setError(null);
      await sendMessage(message, files);
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
    <>
      {/* Quota Exceeded Dialog */}
      <AlertDialog open={quotaDialogOpen} onOpenChange={setQuotaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Message Quota Exceeded</AlertDialogTitle>
            <AlertDialogDescription>
              Your message tokens have run out. Please upgrade your subscription to continue chatting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <a href="https://dashboard.taxai.ae/dashboard/account?tab=Subscription" target="_blank" rel="noopener noreferrer">
                Upgrade Subscription
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded shadow">
          {error}
        </div>
      )}
      {/* Main chat layout with sticky input */}
      <div className="flex flex-col h-full w-full min-h-screen">
        <div className="flex-1 overflow-y-auto">
          <ChatMessages messages={formattedMessages} isTyping={isLoading} />
          <div ref={messagesEndRef} />
        </div>
        <div className="sticky bottom-0 left-0 w-full bg-background z-10 border-t">
          <ChatInput onSubmit={handleSubmit} isGenerating={isLoading} disabled={!!error || quotaDialogOpen} />
        </div>
      </div>
    </>
  );
}

// Tidak ada error pada kode ini jika ChatMessageType di types/chat.ts sudah:
// export type ChatMessageType = {
//   role: 'user' | 'assistant';
//   content: string;
//   timestamp?: Date | string;
// };
// Jika belum, pastikan untuk mengedit types/chat.ts seperti di atas.
