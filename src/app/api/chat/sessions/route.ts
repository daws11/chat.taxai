import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-options';
import { connectToDatabase } from '@/lib/db';
import { ChatSession } from '@/lib/models/chat';
import { NextResponse } from 'next/server';
import { assistantService } from '@/lib/services/assistant-service';

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const chatSessions = await ChatSession.find({ userId: session.user.id })
      .select('title updatedAt')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ sessions: chatSessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { title = 'New Chat', message: firstMessage } = await req.json();
    await connectToDatabase();

    // Create a new thread for this session
    const threadId = await assistantService.createThread();
    
    // Prepare messages array
    const messages = [];
    if (firstMessage) {
      messages.push({ role: 'user', content: firstMessage });
    }

    // Create a new chat session
    const chatSession = new ChatSession({
      userId: session.user.id,
      threadId,
      title,
      messages,
    });

    // If there is a first message, send it to OpenAI and store the assistant's response
    const assistantResponses: string[] = [];
    if (firstMessage) {
      // Add user message to thread
      await assistantService.sendMessage(threadId, firstMessage);
      // Get all messages in the thread
      const allMessages = await assistantService.getThreadMessages(threadId);
      console.log('All messages from OpenAI:', JSON.stringify(allMessages, null, 2));
      // Cari index pesan user terakhir
      const lastUserIdx = allMessages.map(m => m.role).lastIndexOf('user');
      const newAssistantMessages = lastUserIdx === -1
        ? allMessages.filter(m => m.role === 'assistant')
        : allMessages.slice(0, lastUserIdx).filter(m => m.role === 'assistant');
      // --- FIX ORDER: Ensure greeting is always first if present ---
      if (newAssistantMessages.length === 2) {
        const isGreeting = (msg: { content: string }) => typeof msg.content === 'string' && msg.content.toLowerCase().includes("hello! i’m atto");
        if (!isGreeting(newAssistantMessages[0]) && isGreeting(newAssistantMessages[1])) {
          // Swap so greeting is first
          [newAssistantMessages[0], newAssistantMessages[1]] = [newAssistantMessages[1], newAssistantMessages[0]];
        }
      }
      // Logging dan simpan semua pesan assistant baru ke chatSession.messages
      for (const msg of newAssistantMessages) {
        console.log('New assistant message:', {
          content: msg.content,
          timestamp: msg.timestamp
        });
        chatSession.messages.push({
          role: 'assistant',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
        });
        assistantResponses.push(msg.content);
      }
    }

    await chatSession.save();

    const responsePayload = {
      _id: chatSession._id,
      title: chatSession.title,
      threadId: chatSession.threadId,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
      messages: assistantResponses.length > 0
        ? assistantResponses.map(content => ({ role: 'assistant', content }))
        : [{ role: 'assistant', content: 'No response from the assistant' }]
    };
    console.log('Final response to frontend:', JSON.stringify(responsePayload, null, 2));
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { message: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}
