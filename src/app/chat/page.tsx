'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChatMessage } from '@/components/chat-message';
import { ChatInput } from '@/components/chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThreadMessage } from '@/lib/services/assistant-service';
import { debounce } from 'lodash';

// Update ThreadMessage type to include timestamp
interface ExtendedThreadMessage extends ThreadMessage {
  timestamp?: Date;
  role: 'user' | 'assistant';
  content: string;
  threadId: string;
}

// Fallback message type for display
const FALLBACK_MESSAGE: ExtendedThreadMessage = {
  role: 'assistant',
  content: 'Sorry, there was an error processing your request.',
  timestamp: new Date(),
  threadId: 'fallback'
};

// Helper function to safely get current session
const getCurrentSession = (session: ChatSession | null): ChatSession => {
  if (!session) {
    throw new Error('Session is required');
  }
  return session;
};

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

type ChatSession = {
  _id: string;
  threadId: string;
  title: string;
  messages: ThreadMessage[];
  createdAt: string;
  updatedAt: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState('');
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

  // Debounce fetch session
  const debouncedFetch = useCallback(
    debounce(async (id: string) => {
      try {
        const response = await fetch(`/api/chat/sessions/${id}`);
        if (!response.ok) throw new Error('Failed to fetch session');
        const data = await response.json();
        setCurrentSession(data);
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Error fetching session:', error);
        setError('Failed to load chat session');
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (status === 'authenticated' && sessionId) {
      debouncedFetch(sessionId);
    }
  }, [status, sessionId, debouncedFetch]);

  // Optimistic update for messages
  const addOptimisticMessage = (message: string) => {
    if (!currentSession) return;
    
    const newMessage: ExtendedThreadMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      threadId: currentSession.threadId
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const removeLastMessage = () => {
    setMessages(prev => prev.slice(0, -1));
  };

  const fetchSession = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/chat/sessions/${id}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      const data = await response.json();
      setCurrentSession(data);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching session:', error);
      setError('Failed to load chat session');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSessionWithMessage = async (firstMessage: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Buat session baru
      const sessionResponse = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: firstMessage.slice(0, 50) }),
      });
      
      if (!sessionResponse.ok) throw new Error('Failed to create session');
      const sessionData = await sessionResponse.json();
      
      // Redirect ke halaman chat dengan session ID baru
      router.push(`/chat/${sessionData._id}?prefill=${encodeURIComponent(firstMessage)}`);
      
      // Set session dan messages
      setCurrentSession(sessionData);
      setMessages([]);
      
      // Kirim pesan pertama
      const messageResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: firstMessage,
          sessionId: sessionData._id,
          threadId: sessionData.threadId,
        }),
      });
      
      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        throw new Error(errorData.message || 'Failed to send initial message');
      }
      
      const messageData = await messageResponse.json();
      
      // Update messages dengan response dari server
      if (messageData.session?.messages) {
        setMessages(messageData.session.messages);
      }
      
      return sessionData;
      
    } catch (error) {
      console.error('Error in createNewSessionWithMessage:', error);
      setError(error instanceof Error ? error.message : 'Failed to create new chat session');
      throw error; // Re-throw error agar bisa di-handle oleh pemanggil
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    try {
      await createNewSessionWithMessage(suggestion);
    } catch (error) {
      // Error sudah di-handle di createNewSessionWithMessage
      console.error('Error handling suggestion click:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !currentSession) return;

    try {
      // Add user message immediately
      addOptimisticMessage(message);

      // Debounce the API call
      const debouncedSend = debounce(async () => {
        try {
          const session = getCurrentSession(currentSession);
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              sessionId: session._id,
              threadId: session.threadId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send message');
          }

          const data = await response.json();

          // Update messages with AI response
          if (data.session?.messages) {
            setMessages(data.session.messages);
          }
          
          // Update session if needed
          if (data.session) {
            setCurrentSession(data.session);
          }

        } catch (error) {
          // If API fails, remove the optimistic message and add fallback
          removeLastMessage();
          setMessages(prev => [...prev, FALLBACK_MESSAGE]);
          setError(error instanceof Error ? error.message : 'Failed to send message');
          throw error;
        }
      }, 500);

      // Execute debounced send
      await debouncedSend();

    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (messages.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [messages]);

  // Render welcome page if no sessionId (user is on /chat)
  if (!sessionId) {
    return (
      <div className="flex flex-col min-h-screen justify-between items-center bg-background">
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          <h1 className="text-2xl font-bold mb-2 mt-12 text-center">Hi I'm Atto, Your TaxAI Assistant!</h1>
          <p className="mb-6 text-center text-muted-foreground">Ask anything about taxes, or try one of these topics:</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                className="bg-primary/10 hover:bg-primary/20 text-primary rounded-full px-4 py-2 text-sm transition"
                onClick={() => createNewSessionWithMessage(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full max-w-2xl mx-auto p-4 border-t border-border bg-background sticky bottom-0">
          <ChatInput
            onSubmit={(msg) => {
              if (msg.trim()) createNewSessionWithMessage(msg);
            }}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  }
  // Loading spinner only if not authenticated
  if (status !== 'authenticated') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  // Main chat UI
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
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors border border-border shadow"
                    onClick={() => handleSendMessage(suggestion)}
                    disabled={isLoading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <ChatMessage 
                  key={`${message.role}-${index}`} 
                  role={message.role} 
                  content={message.content} 
                />
              ))}
              {isLoading && (
                <div className="flex items-start space-x-4 p-4">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-muted rounded"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="w-full max-w-2xl mx-auto p-4 border-t border-border bg-background sticky bottom-0">
            <ChatInput
              onSubmit={handleSendMessage}
              isLoading={isLoading}
              sessionId={currentSession?._id}
            />
        </div>
      </div>
    </div>
  );
}