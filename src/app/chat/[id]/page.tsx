import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { ChatMessage } from '@/components/chat-message';
import { ChatInput } from '@/components/chat-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessageType } from 'types/chat';

export default async function ChatSessionPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const session = await getServerSession(authConfig);
  if (!session?.user?.id) {
    redirect('/(auth)/login');
  }

  await connectToDatabase();
  // Gunakan .lean() agar hasilnya plain object
  let chatSession = await ChatSession.findOne({
    _id: id,
    userId: session.user.id,
  }).lean();

  // Jika hasil findOne berupa array (tidak seharusnya, tapi untuk safety)
  if (Array.isArray(chatSession)) {
    chatSession = chatSession[0];
  }

  if (!chatSession) {
    notFound();
  }

  // Pastikan messages adalah array of plain object
  const messages: ChatMessageType[] = Array.isArray(chatSession.messages)
    ? chatSession.messages.map((msg: ChatMessageType) => ({
        role: msg.role,
        content: msg.content,
      }))
    : [];

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Start a conversation with TaxAI
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage key={index} {...message} />
          ))
        )}
      </ScrollArea>
      <ChatInput sessionId={id} className="border-t" />
    </div>
  );
}