'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInput } from '@/components/chat-input';
import { ChatMessages } from '@/components/chat-messages';
import type { ThreadMessage } from '@/lib/services/assistant-service';
import { useAssistant } from '@/lib/hooks/use-assistant';

// Sample suggestions for the empty state
const suggestions = [
  {
    id: '1',
    category: 'General',
    icon: '📝',
    text: 'What are the basic tax filing requirements?'
  },
  {
    id: '2',
    category: 'Calculation',
    icon: '🧮',
    text: 'How do I calculate my income tax?'
  },
  {
    id: '3',
    category: 'Deductions',
    icon: '💰',
    text: 'What tax deductions am I eligible for?'
  },
  {
    id: '4',
    category: 'Business',
    icon: '🏢',
    text: 'What are the tax implications of starting a business?'
  },
  {
    id: '5',
    category: 'Investment',
    icon: '📈',
    text: 'How are investment returns taxed?'
  },
  {
    id: '6',
    category: 'Property',
    icon: '🏠',
    text: 'What tax benefits are available for property owners?'
  }
];

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading] = useState(false);

  const { 
    messages, 
    isLoading: assistantIsLoading, 
    sendMessage, 
    error: assistantError 
  } = useAssistant(sessionId || '');

  // Handle errors
  useEffect(() => {
    if (assistantError) {
      setError(assistantError);
    }
  }, [assistantError]);

  // Handle message submission
  const handleSubmit = useCallback(async (message: string) => {
    try {
      setError(null);
      
      // Create new session if none exists
      if (!sessionId) {
        // First create a new session
        const sessionResponse = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: message.slice(0, 50) + (message.length > 50 ? '...' : '')
          })
        });
        
        if (sessionResponse.status === 401) {
          router.push('/login');
          return;
        }
        
        if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json();
          throw new Error(errorData.message || 'Failed to create chat session');
        }
        
        const sessionData = await sessionResponse.json();
        if (!sessionData._id) {
          throw new Error('Invalid session response from server');
        }

        // Update session ID immediately
        setSessionId(sessionData._id);
        
        // Send the initial message
        const messageResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message,
            sessionId: sessionData._id
          })
        });
        
        if (!messageResponse.ok) {
          const errorData = await messageResponse.json();
          throw new Error(errorData.message || 'Failed to send message');
        }

        // Navigate to the new chat
        await router.push(`/chat/${sessionData._id}`);
        
        // Force a router refresh to ensure the page updates
        router.refresh();
      } else {
        await sendMessage(message);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }, [sessionId, sendMessage, router]);

  // Add effect to handle URL changes and message updates
  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const chatId = pathSegments[pathSegments.length - 1];
    
    if (chatId && chatId !== 'chat' && chatId !== sessionId) {
      setSessionId(chatId);
    }
  }, [sessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle category selection
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(prevCategory => 
      prevCategory === category ? null : category
    );
  };

  // Filter suggestions based on selected category
  const filteredSuggestions = selectedCategory
    ? suggestions.filter(s => s.category === selectedCategory)
    : suggestions;

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
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
              <h3 className="text-lg font-medium mb-2">Start a conversation with Atto - Your Personal Tax Assistant</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Ask Atto about taxes, financial regulations, or get help with tax calculations.
              </p>
              
              {/* Category Filters */}
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {Array.from(new Set(suggestions.map(s => s.category))).map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSubmit(suggestion.text)}
                  className="bg-card hover:bg-accent p-4 rounded-lg text-left transition-all border border-border hover:border-primary/50 flex flex-col h-full"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex-shrink-0 bg-primary/10 text-primary rounded-md p-1">
                      {suggestion.icon}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-primary">
                      {suggestion.category}
                    </span>
                  </div>
                  <span className="text-sm">{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ChatMessages 
            messages={formattedMessages}
            isTyping={assistantIsLoading}
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