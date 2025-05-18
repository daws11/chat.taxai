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

const SUGGESTIONS = [
  'How to calculate personal income tax?',
  'What documents are needed for Annual Tax Return?',
  'How to report SME taxes?',
  'What are the penalties for late tax payment?',
  'How to obtain a Tax ID Number?',
];

function getGreeting(nameOrEmail?: string | null) {
  const hour = new Date().getHours();
  let greet = 'Good morning';
  if (hour >= 12 && hour < 18) greet = 'Good afternoon';
  else if (hour >= 18 || hour < 4) greet = 'Good evening';
  return `${greet}${nameOrEmail ? ', ' + nameOrEmail : ''}!`;
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
  const { data: session } = useSession();

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
      // Tambahkan pesan user dan bubble AI kosong
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: '', timestamp: undefined },
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
        setMessages((prev) => {
          // Ganti bubble AI kosong terakhir dengan balasan AI
          const lastUserIdx = prev.map((m) => m.role).lastIndexOf('user');
          const newMessages = prev.slice(0, lastUserIdx + 2); // user + ai kosong
          newMessages[newMessages.length - 1] = {
            role: data.message.role,
            content: data.message.content,
            timestamp: new Date(),
          };
          return newMessages;
        });
      }
      // fetchSessions();
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
      setMessages((prev) => prev.slice(0, -2)); // Hapus user dan ai kosong
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
    <div className="flex flex-col h-screen min-h-screen w-full max-w-full">
      <div className="flex-1 min-h-0 flex flex-col">
        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1 min-h-0 p-4 overflow-y-auto"
        >
          {error && (
            <div className="mb-4 p-4 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-6">
              <div className="text-2xl font-semibold text-center text-primary-foreground">
                {getGreeting(session?.user?.name || session?.user?.email)}
              </div>
                <div className="text-base text-center text-muted-foreground mb-2">
                How can TaxAI help you today?
                </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors border border-border shadow"
                    onClick={() => handleSubmit(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage key={index} {...message} />
            ))
          )}
        </ScrollArea>
        <div className="border-t bg-background">
          <ChatInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            sessionId={sessionId}
          />
        </div>
      </div>
    </div>
  );
}
