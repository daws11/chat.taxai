"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessageType } from "types/chat";

export default function ChatSessionPageClient() {
  const params = useParams();
  const sessionId = typeof params?.id === "string" ? params.id : undefined;
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch messages on mount
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/chat/sessions/${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.messages) setMessages(data.messages);
      });
  }, [sessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (message: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message, timestamp: new Date() },
        { role: "assistant", content: "", timestamp: undefined },
      ]);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to send message");
      }
      if (data.message) {
        setMessages((prev) => {
          // Replace last assistant bubble with AI response
          const lastUserIdx = prev.map((m) => m.role).lastIndexOf("user");
          const newMessages = prev.slice(0, lastUserIdx + 2);
          newMessages[newMessages.length - 1] = {
            role: data.message.role,
            content: data.message.content,
            timestamp: new Date(),
          };
          return newMessages;
        });
        // Trigger sidebar refresh
        window.dispatchEvent(new Event('chat-session-updated'));
      }
      // TODO: trigger sidebar refresh if needed
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen min-h-screen w-full max-w-full">
      <div className="flex-1 min-h-0 flex flex-col">
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 p-4 overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Start a conversation with TaxAI
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={index}
                {...message}
                timestamp={
                  typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp
                }
              />
            ))
          )}
        </ScrollArea>
        <div className="border-t bg-background">
          <ChatInput onSubmit={handleSubmit} isLoading={isLoading} sessionId={sessionId} />
        </div>
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
