'use client';

import { MessageList } from '@/components/ui/message-list';
import { type Message } from '@/components/ui/chat-message';
import { cn } from '@/lib/utils';

interface ChatMessagesProps {
  messages: Message[];
  isTyping?: boolean;
}

export function ChatMessages({ messages, isTyping = false }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-4xl">
        <MessageList
          messages={messages}
          isTyping={isTyping}
          messageOptions={(message: Message, index: number) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const isConsecutiveAssistant = prevMessage?.role === 'assistant' && message.role === 'assistant';
            
            return {
              animation: "slide" as const,
              className: cn(
                "group/message relative break-words rounded-lg p-3 text-sm sm:max-w-[70%]",
                message.role === 'user' 
                  ? "bg-[#343541] text-white" 
                  : "bg-[#444654] text-white",
                // Add extra margin and subtle border for consecutive assistant messages
                isConsecutiveAssistant && "mt-3 border-l-2 border-l-blue-400/30 pl-2"
              ),
            };
          }}
        />
      </div>
    </div>
  );
} 