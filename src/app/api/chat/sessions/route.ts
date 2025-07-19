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
    let assistantResponse = null;
    if (firstMessage) {
      // Add user message to thread
      await assistantService.sendMessage(threadId, firstMessage);
      // Get the assistant's response
      const threadMessages = await assistantService.getThreadMessages(threadId);
      const lastAssistantMsg = threadMessages.reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg) {
        assistantResponse = lastAssistantMsg.content;
        chatSession.messages.push({ role: 'assistant', content: assistantResponse });
      }
    }

    await chatSession.save();

    return NextResponse.json({
      _id: chatSession._id,
      title: chatSession.title,
      threadId: chatSession.threadId,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
      message: assistantResponse
        ? { role: 'assistant', content: assistantResponse }
        : undefined,
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { message: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}
