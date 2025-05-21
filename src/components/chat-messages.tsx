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
          messageOptions={(message) => ({
            animation: "slide",
            className: cn(
              "group/message relative break-words rounded-lg p-3 text-sm sm:max-w-[70%]",
              message.role === 'user' 
                ? "bg-[#343541] text-white" 
                : "bg-[#444654] text-white"
            ),
          })}
        />
      </div>
    </div>
  );
} 