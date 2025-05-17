'use client';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  return (
    <div
      className={cn(
        'flex w-full items-start gap-4 p-4',
        role === 'assistant' ? 'bg-muted/50' : 'bg-white'
      )}
    >
      <div className={cn('flex size-8 shrink-0 select-none items-center justify-center rounded-md', 
        role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {role === 'assistant' ? 'AI' : 'You'}
      </div>
      <div className="flex-1 space-y-2">
        <div className="prose prose-neutral dark:prose-invert break-words">
          {content}
        </div>
        {timestamp && (
          <div className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
