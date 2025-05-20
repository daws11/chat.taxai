'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ChatMessage } from '@/components/chat-message';
import { ChatInput } from '@/components/chat-input';
import { Bot, FileText, Calculator, HelpCircle, Lightbulb } from 'lucide-react';

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
  {
    id: 'calculate',
    text: 'How to calculate personal income tax?',
    icon: <Calculator className="w-5 h-5" />,
    category: 'Calculations'
  },
  {
    id: 'docs',
    text: 'What documents are needed for Annual Tax Return?',
    icon: <FileText className="w-5 h-5" />,
    category: 'Documentation'
  },
  {
    id: 'sme',
    text: 'How to report SME taxes?',
    icon: <FileText className="w-5 h-5" />,
    category: 'Business'
  },
  {
    id: 'penalties',
    text: 'What are the penalties for late tax payment?',
    icon: <HelpCircle className="w-5 h-5" />,
    category: 'Compliance'
  },
  {
    id: 'taxid',
    text: 'How to obtain a Tax ID Number?',
    icon: <FileText className="w-5 h-5" />,
    category: 'Registration'
  },
  {
    id: 'deductions',
    text: 'What tax deductions am I eligible for?',
    icon: <Lightbulb className="w-5 h-5" />,
    category: 'Savings'
  },
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/(auth)/login');
    },
  });
  const { data: session } = useSession();
  
  // Get available categories from suggestions
  const categories = [...new Set(SUGGESTIONS.map(s => s.category))];
  
  // Filter suggestions by category
  const filteredSuggestions = selectedCategory 
    ? SUGGESTIONS.filter(s => s.category === selectedCategory)
    : SUGGESTIONS;

  useEffect(() => {
    if (status === 'authenticated' && sessionId) {
      debouncedFetch(sessionId);
    }
  }, [status, sessionId, debouncedFetch]);

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
  // Memoize handleSubmit to prevent unnecessary renders
  const handleSubmit = useCallback(async (message: string) => {
    try {
      setIsLoading(true);
      setError(null);
      if (status !== 'authenticated') {
        throw new Error('You must be logged in to send messages');
      }
      
      // Create optimistic UI update
      const userMessage: Message = { 
        role: 'user', 
        content: message, 
        timestamp: new Date() 
      };
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: '', 
        timestamp: new Date() 
      };
      
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      
      // Send API request with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to send message');
        }
        
        if (data.message) {
          // Once we get a sessionId back from the first message, redirect to that chat
          if (data.sessionId && messages.length === 0) {
            // Wait a moment for the animation to complete before navigating
            setTimeout(() => {
              router.push(`/chat/${data.sessionId}`);
            }, 1000);
          }
          
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastAssistantIdx = newMessages.findLastIndex(
              (m, idx, arr) => m.role === 'assistant' && 
                            (idx === arr.length - 1 || arr[idx + 1]?.role !== 'assistant')
            );
            
            if (lastAssistantIdx !== -1) {
              newMessages[lastAssistantIdx] = {
                role: 'assistant',
                content: data.message.content,
                timestamp: new Date()
              };
            }
            
            return newMessages;
          });
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err?.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw err;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
      setMessages((prev) => {
        // Remove the last two messages (user + empty assistant)
        return prev.length >= 2 ? prev.slice(0, -2) : prev;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages.length, router, status]);
  
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

  return (
    <div className="flex flex-col min-h-screen bg-[#343541]">
      <div className="flex-1 overflow-y-auto pb-32">
        {error && (
          <div className="toast-container">
            <div className="toast error">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12" y2="16"></line>
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="landing-container min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6 text-[#ECECF1]">
            <div className="max-w-3xl w-full mx-auto flex flex-col items-center">
              {/* Logo and welcome */}
              <div className="flex items-center justify-center mb-6">
                <div className="bg-[#10A37F] w-12 h-12 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold mb-2 text-center">
                {getGreeting(session?.user?.name || session?.user?.email)}
              </h1>
              
              <p className="text-lg text-[#C5C5D2] mb-8 text-center">
                I'm your AI tax assistant. Ask me anything about taxes or select a topic below.
              </p>
              
              {/* Category filters */}
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedCategory === category 
                      ? 'bg-[#10A37F] text-white' 
                      : 'bg-[#40414F] text-[#C5C5D2] hover:bg-[#2A2B32]'}`}
                    onClick={() => handleCategoryChange(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              
              {/* Suggestions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-4xl">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="suggestion-card bg-[#40414F] hover:bg-[#2A2B32] p-4 rounded-lg text-left transition-all border border-transparent hover:border-[rgba(255,255,255,0.1)] flex flex-col h-full"
                    onClick={() => handleSubmit(suggestion.text)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex-shrink-0 bg-[#10A37F30] text-[#10A37F] rounded-md p-1">
                        {suggestion.icon}
                      </span>
                      <span className="text-xs uppercase tracking-wider text-[#10A37F]">{suggestion.category}</span>
                    </div>
                    <span className="text-sm text-[#ECECF1]">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message, index) => {
              const timestamp = message.timestamp 
                ? (typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp)
                : undefined;
                
              return (
                <ChatMessage
                  key={`${message.role}-${index}`}
                  role={message.role}
                  content={message.content}
                  timestamp={timestamp}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <ChatInput 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
      />
    </div>
  );
}