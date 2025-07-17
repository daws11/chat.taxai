'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { MessageInput } from '@/components/ui/message-input';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isGenerating?: boolean;
  onStop?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, isGenerating = false, onStop, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto p-4">
      <MessageInput
        value={input}
        onChange={handleChange}
        isGenerating={isGenerating}
        stop={onStop}
        placeholder="Ask Atto anything..."
        enableInterrupt={true}
        allowAttachments={false}
        disabled={disabled}
      />
    </form>
  );
}
