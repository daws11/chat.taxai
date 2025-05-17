'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChatMessage } from '@/components/chat-message';
import { ChatInput } from '@/components/chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/(auth)/login');
    },
  });
  const params = useParams();
  const sessionId = typeof params?.id === 'string' ? params.id : undefined;

  useEffect(() => {
    // fetchSessions();
  }, []);

  // const fetchSessions = async () => {
  //   try {
  //     const response = await fetch('/api/chat/sessions');
  //     if (response.ok) {
  //       const data = await response.json();
  //       setSessions(data.sessions);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching sessions:', error);
  //   }
  // };
  const handleSubmit = async (message: string) => {
    try {
      setIsLoading(true);
      setError(null);
      if (status !== 'authenticated') {
        throw new Error('You must be logged in to send messages');
      }
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: message, timestamp: new Date() },
      ]);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          {
            role: data.message.role,
            content: data.message.content,
            timestamp: new Date(),
          },
        ]);
      }
      // fetchSessions();
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
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
            <ChatMessage key={index} {...message} />
          ))
        )}
      </ScrollArea>
      <ChatInput onSubmit={handleSubmit} isLoading={isLoading} className="border-t" sessionId={sessionId} />
    </div>
  );
}
