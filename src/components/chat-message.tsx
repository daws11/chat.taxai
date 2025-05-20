'use client';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { ThreadMessage } from '@/lib/services/assistant-service';

interface ChatMessageProps extends Omit<ThreadMessage, 'timestamp'> {
  timestamp?: Date;
}

function ChatMessageComponent({ role, content, timestamp }: ChatMessageProps) {
  // Show loader for empty assistant messages (typing effect)
  const isTyping = role === 'assistant' && !content;
  
  
  return (
    <div className={cn('chat-row', role)}>
      <div className="message-container">
        <div className="flex items-start gap-4">
          <div 
            className={cn(
              'chat-role-indicator',
              role === 'assistant' ? 'bg-[#10A37F] text-white' : 'bg-[#7C7C8A] text-white'
            )}
          >
            {role === 'assistant' ? 'AI' : 'Y'}
          </div>
          
          <div className="chat-message-content">
            {isTyping ? (
              <div className="loader-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown 
                  components={{
                    // Improve code blocks
                    code: ({ className, children }) => {
                      return (
                        <code
                          className={cn(
                            'bg-[#2A2B32] px-1 py-0.5 rounded text-sm',
                            className
                          )}
                        >
                          {children}
                        </code>
                      );
                    },
                    // Pre blocks for code snippets
                    pre: (props) => (
                      <pre className="bg-[#2A2B32] p-4 rounded-md my-2 overflow-x-auto">
                        {props.children}
                      </pre>
                    ),
                    // Improve link styling
                    a: (props) => (
                      <a
                        {...props}
                        className="text-[#10A37F] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
            
            {timestamp && (
              <div className="text-xs text-[#8E8EA0] mt-2">
                {new Date(timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export const ChatMessage = memo(ChatMessageComponent);
