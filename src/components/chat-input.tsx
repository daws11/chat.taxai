'use client';
import { useRef, useEffect, useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SendIcon } from 'lucide-react';

interface ChatInputProps {
  onSubmit?: (message: string) => void;
  isLoading?: boolean;
  className?: string;
  sessionId?: string;
}

function ChatInputComponent({ onSubmit, isLoading, className, sessionId }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState<string>('');

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    };

    textarea.addEventListener('input', adjustHeight);
    return () => textarea.removeEventListener('input', adjustHeight);
  }, []);

  const handleSubmit = () => {
    if (textareaRef.current) {
      const trimmedMessage = message.trim();
      if (trimmedMessage && !isLoading) {
        if (onSubmit) {
          onSubmit(trimmedMessage);
        } else if (sessionId) {
          // fallback: submit to /api/chat with sessionId
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: trimmedMessage, sessionId }),
          });
        }
        setMessage('');
        textareaRef.current.value = '';
        
        // Reset textarea height
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className="chat-input-container">
      <div className={cn('chat-input', className)}>
        <Textarea
          ref={textareaRef}
          placeholder="Type a message..."
          className="resize-none"
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          value={message}
          disabled={isLoading}
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !message.trim()}
          size="icon"
          aria-label="Send message"
        >
          {isLoading ? (
            <span className="loader-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          ) : (
            <SendIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export const ChatInput = memo(ChatInputComponent);
