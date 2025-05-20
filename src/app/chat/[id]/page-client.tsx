"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import type { ChatMessageType } from "types/chat";

// import { useRouter } from "next/navigation";

export default function ChatSessionPageClient() {
  const params = useParams();
  const sessionId = typeof params?.id === "string" ? params.id : undefined;
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch messages on mount with loading state
  useEffect(() => {
    if (!sessionId) return;
    
    setIsInitialLoad(true);
    
    fetch(`/api/chat/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch session');
        return res.json();
      })
      .then((data) => {
        if (data && data.messages) setMessages(data.messages);
      })
      .catch(err => {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages. Please try refreshing the page.');
      })
      .finally(() => {
        setIsInitialLoad(false);
      });
  }, [sessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Memoize handleSubmit to prevent unnecessary renders
  const handleSubmit = useCallback(async (message: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create optimistic UI update
      const userMessage: ChatMessageType = { 
        role: 'user', 
        content: message, 
        timestamp: new Date() 
      };
      const assistantMessage: ChatMessageType = { 
        role: 'assistant', 
        content: '', 
        timestamp: new Date() 
      };
      
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      
      // Send API request with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, sessionId, threadId: null }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to send message");
        }
        
        if (data.message) {
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
          
          // Trigger sidebar refresh
          window.dispatchEvent(new Event('chat-session-updated'));
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw err;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : "Something went wrong");
      setMessages((prev) => {
        // Remove the last two messages (user + empty assistant)
        return prev.length >= 2 ? prev.slice(0, -2) : prev;
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Loading skeleton for initial page load
  const renderLoadingSkeleton = () => (
    <div className="message-container">
      {[1, 2, 3].map((n) => (
        <div key={n} className={`chat-row ${n % 2 === 0 ? 'assistant' : 'user'}`}>
          <div className="message-container">
            <div className="flex items-start gap-4">
              <div className="chat-role-indicator skeleton" style={{opacity: 0.5}}></div>
              <div className="w-full">
                <div className="skeleton h-4 w-3/4 mb-2"></div>
                <div className="skeleton h-4 w-full mb-2"></div>
                <div className="skeleton h-4 w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

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
        
        {isInitialLoad ? (
          renderLoadingSkeleton()
        ) : messages.length === 0 ? (
          <div className="h-[80vh] flex items-center justify-center text-[#8E8EA0]">
            <div className="text-center max-w-md">
              <h3 className="text-lg font-medium mb-2">Start a conversation with TaxAI</h3>
              <p className="text-sm">Ask questions about taxes, financial regulations, or get help with tax calculations.</p>
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
        sessionId={sessionId} 
      />
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
