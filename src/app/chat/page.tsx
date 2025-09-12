'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInput } from '@/components/chat-input';
import { ChatMessages } from '@/components/chat-messages';
import type { ThreadMessage } from '@/lib/services/assistant-service';
import { useAssistant } from '@/lib/hooks/use-assistant';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

// Sample suggestions for the empty state - Corporate Tax focused
const suggestions = [
  {
    id: '1',
    category: 'category_corporate_tax_rate',
    icon: '📊',
    text: 'suggestion_corporate_tax_rate'
  },
  {
    id: '2',
    category: 'category_tax_obligation',
    icon: '👥',
    text: 'suggestion_who_pays_corporate_tax'
  },
  {
    id: '3',
    category: 'category_free_zone',
    icon: '🏭',
    text: 'suggestion_free_zone_companies'
  },
  {
    id: '4',
    category: 'category_threshold',
    icon: '💰',
    text: 'suggestion_taxable_income_threshold'
  },
  {
    id: '5',
    category: 'category_registration',
    icon: '📋',
    text: 'suggestion_registration_filing'
  },
  {
    id: '6',
    category: 'category_penalties',
    icon: '⚠️',
    text: 'suggestion_penalties_compliance'
  }
];

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false); // NEW
  const { t } = useI18n();

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
  const handleSubmit = useCallback(async (message: string, files?: File[]) => {
    try {
      setError(null);
      
      // Create new session if none exists
      if (!sessionId) {
        setIsSessionLoading(true); // NEW
        // First create a new session WITH the first message
        let sessionResponse;
        
        if (files && files.length > 0) {
          // Use FormData for file uploads
          const formData = new FormData();
          formData.append('title', message.slice(0, 50) + (message.length > 50 ? '...' : ''));
          formData.append('message', message);
          
          // Append files
          files.forEach(file => {
            formData.append('files', file);
          });
          
          sessionResponse = await fetch('/api/chat/sessions', {
            method: 'POST',
            body: formData
          });
        } else {
          // Use JSON for text-only messages
          sessionResponse = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
              message // kirim pesan pertama bersamaan
            })
          });
        }
        
        if (sessionResponse.status === 401) {
          router.push('/login');
          setIsSessionLoading(false); // NEW
          return;
        }
        
        if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json();
          setIsSessionLoading(false); // NEW
          throw new Error(errorData.message || 'Failed to create chat session');
        }
        
        const sessionData = await sessionResponse.json();
        if (!sessionData._id) {
          setIsSessionLoading(false); // NEW
          throw new Error('Invalid session response from server');
        }

        // Update session ID immediately
        setSessionId(sessionData._id);

        // Navigate to the new chat
        await router.push(`/chat/${sessionData._id}`);
        
        // Force a router refresh to ensure the page updates
        router.refresh();
        setIsSessionLoading(false); // NEW
      } else {
        await sendMessage(message, files);
      }
    } catch (err) {
      setIsSessionLoading(false); // NEW
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
      {/* Loading overlay for session creation */}
      {isSessionLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin w-10 h-10 text-primary" />
            <span className="text-primary font-medium">Starting new chat...</span>
          </div>
        </div>
      )}
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
              <h3 className="text-lg font-medium mb-2">{t('start_conversation')}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t('ask_atto')}
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
                    {t(category)}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSubmit(t(suggestion.text))}
                  className="bg-card hover:bg-accent p-4 rounded-lg text-left transition-all border border-border hover:border-primary/50 flex flex-col h-full"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex-shrink-0 bg-primary/10 text-primary rounded-md p-1">
                      {suggestion.icon}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-primary">
                      {t(suggestion.category)}
                    </span>
                  </div>
                  <span className="text-sm">{t(suggestion.text)}</span>
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
      <div className="flex-none border-t bg-background w-full relative">
        <ChatInput 
          onSubmit={handleSubmit}
          isGenerating={isSessionLoading || assistantIsLoading}
          onStop={() => {/* TODO: Implement stop generation */}}
          disabled={isSessionLoading}
        />
        {/* Loader for assistant response */}
        {assistantIsLoading && !isSessionLoading && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center gap-2">
            <Loader2 className="animate-spin w-5 h-5 text-primary" />
            <span className="text-primary text-sm">Waiting for response...</span>
          </div>
        )}
      </div>
    </div>
  );
}